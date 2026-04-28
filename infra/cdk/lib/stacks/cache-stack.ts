import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';

export class CacheStack extends BaseStack {
  public readonly redisEndpoint: string;
  public readonly redisPort: number;
  public readonly redisAuthSecret: secretsmanager.Secret;
  public readonly cacheSecurityGroup: ec2.SecurityGroup;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // VPC — ElastiCache must run inside a VPC
    // ============================================
    const vpc = new ec2.Vpc(this, 'CacheVpc', {
      maxAzs: env === 'prod' ? 3 : 2,
      natGateways: env === 'prod' ? 1 : 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ============================================
    // Security group — allow Redis port from within VPC
    // ============================================
    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc,
      description: 'ElastiCache Redis security group',
      allowAllOutbound: false,
    });
    this.cacheSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Redis from within VPC',
    );

    // ============================================
    // Subnet group
    // ============================================
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: `${appName} Redis subnet group (${env})`,
      subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
      cacheSubnetGroupName: `${appName}-redis-${env}`,
    });

    // ============================================
    // Parameter group (Redis 7.x)
    // ============================================
    const parameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParamGroup', {
      cacheParameterGroupFamily: 'redis7',
      description: `${appName} Redis parameter group (${env})`,
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'lazyfree-lazy-eviction': 'yes',
        'lazyfree-lazy-expire': 'yes',
      },
    });

    // ============================================
    // Auth token in Secrets Manager
    // ============================================
    this.redisAuthSecret = new secretsmanager.Secret(this, 'RedisAuthToken', {
      secretName: `${appName}/${env}/redis-auth-token`,
      description: 'ElastiCache Redis AUTH token',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'authToken',
        passwordLength: 32,
        excludePunctuation: true,
      },
    });

    // ============================================
    // Log group for slow logs
    // ============================================
    const slowLogGroup = new logs.LogGroup(this, 'RedisSlowLogs', {
      logGroupName: `/aws/elasticache/${appName}-redis-${env}/slow-log`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============================================
    // Replication group (Redis cluster)
    // ============================================
    const numReplicas = env === 'prod' ? 1 : 0;
    const nodeType = env === 'prod' ? 'cache.r7g.large' : 'cache.t4g.micro';

    const replicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: `${appName} Redis (${env})`,
      replicationGroupId: `${appName}-redis-${env}`,
      automaticFailoverEnabled: numReplicas > 0,
      multiAzEnabled: numReplicas > 0,
      numCacheClusters: numReplicas + 1,
      cacheNodeType: nodeType,
      engine: 'redis',
      engineVersion: '7.1',
      cacheParameterGroupName: parameterGroup.ref,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: this.redisAuthSecret.secretValueFromJson('authToken').unsafeUnwrap(),
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          logFormat: 'json',
          logType: 'slow-log',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: slowLogGroup.logGroupName,
            },
          },
        },
      ],
    });

    replicationGroup.addDependency(subnetGroup);
    replicationGroup.addDependency(parameterGroup);

    this.redisEndpoint = replicationGroup.attrPrimaryEndPointAddress;
    this.redisPort = 6379;

    // ============================================
    // CloudWatch alarms
    // ============================================
    const clusterId = `${appName}-redis-${env}-0001-001`;

    const cpuAlarm = new cloudwatch.Alarm(this, 'RedisCpuAlarm', {
      alarmName: `${appName}-redis-cpu-high-${env}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'EngineCPUUtilization',
        dimensionsMap: { CacheClusterId: clusterId },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 75,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const memoryAlarm = new cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      alarmName: `${appName}-redis-memory-high-${env}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: { CacheClusterId: clusterId },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const connectionsAlarm = new cloudwatch.Alarm(this, 'RedisCurrConnectionsAlarm', {
      alarmName: `${appName}-redis-connections-high-${env}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: { CacheClusterId: clusterId },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 1000,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    new cloudwatch.Dashboard(this, 'RedisDashboard', {
      dashboardName: `${appName}-redis-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'CPU Utilization',
            left: [cpuAlarm.metric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Memory Usage %',
            left: [memoryAlarm.metric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Current Connections',
            left: [connectionsAlarm.metric],
            width: 8,
          }),
        ],
      ],
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisEndpoint,
      description: 'Redis primary endpoint',
      exportName: `${appName}-redis-endpoint-${env}`,
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: String(this.redisPort),
      description: 'Redis port',
      exportName: `${appName}-redis-port-${env}`,
    });

    new cdk.CfnOutput(this, 'RedisAuthSecretArn', {
      value: this.redisAuthSecret.secretArn,
      description: 'Redis AUTH token secret ARN',
      exportName: `${appName}-redis-auth-secret-arn-${env}`,
    });
  }
}
