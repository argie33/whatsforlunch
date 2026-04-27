import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { BaseStack, BaseStackProps } from "./base-stack";

export class OpsStack extends BaseStack {
  public readonly alertTopic: sns.Topic;
  public readonly criticalTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const ns = "WhatsForLunch";
    const app = "wfl";
    const isProd = env === "prod";

    // ============================================================
    // SNS topics
    // ============================================================
    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `${app}-alerts-${env}`,
      displayName: "WFL alerts (medium)",
    });

    this.criticalTopic = new sns.Topic(this, "CriticalTopic", {
      topicName: `${app}-critical-${env}`,
      displayName: "WFL alerts (high)",
    });

    // Always email; PagerDuty subscription added manually post-launch for prod
    this.alertTopic.addSubscription(
      new subscriptions.EmailSubscription("ops@whatsforlunch.app")
    );
    this.criticalTopic.addSubscription(
      new subscriptions.EmailSubscription("ops@whatsforlunch.app")
    );

    // ============================================================
    // Helper: metric builders
    // ============================================================
    const lambdaMetric = (name: string, fn: string, stat = "Sum") =>
      new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: name,
        dimensionsMap: { FunctionName: fn },
        statistic: stat,
        period: cdk.Duration.minutes(5),
      });

    const appSyncMetric = (name: string, stat = "Sum") =>
      new cloudwatch.Metric({
        namespace: "AWS/AppSync",
        metricName: name,
        statistic: stat,
        period: cdk.Duration.minutes(5),
      });

    const wflMetric = (name: string, stat = "Sum") =>
      new cloudwatch.Metric({
        namespace: ns,
        metricName: name,
        statistic: stat,
        period: cdk.Duration.minutes(5),
      });

    const cognitoMetric = (name: string) =>
      new cloudwatch.Metric({
        namespace: "AWS/Cognito",
        metricName: name,
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });

    // ============================================================
    // Dashboard
    // ============================================================
    this.dashboard = new cloudwatch.Dashboard(this, "OperationsDashboard", {
      dashboardName: `${app}-ops-${env}`,
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // ── Section: Health ──────────────────────────────────────────
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# WFL Operations — ${env.toUpperCase()}\n## Health`,
        width: 24,
        height: 2,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "AppSync — Requests & 5xx",
        left: [appSyncMetric("GraphQL.Requests")],
        right: [appSyncMetric("GraphQL.ServerErrors")],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "AppSync — Latency p99 (ms)",
        left: [appSyncMetric("GraphQL.Latency", "p99")],
        width: 12,
        height: 6,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Lambda — All Functions Errors",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Errors",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "Lambda — Duration p95 (all)",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Duration",
            statistic: "p95",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DynamoDB — Consumed Capacity",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedWriteCapacityUnits",
            dimensionsMap: { TableName: `WFL-Main-${env}` },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedReadCapacityUnits",
            dimensionsMap: { TableName: `WFL-Main-${env}` },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB — Throttled Requests",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ThrottledRequests",
            dimensionsMap: { TableName: `WFL-Main-${env}` },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // ── Section: Business ────────────────────────────────────────
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: "## Business",
        width: 24,
        height: 1,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Signups per day",
        left: [wflMetric("NewSignups")],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "Items created per day",
        left: [wflMetric("ItemsCreated")],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "AI Classifications per day",
        left: [wflMetric("AIClassifications")],
        width: 8,
        height: 6,
      })
    );

    // ── Section: AI ──────────────────────────────────────────────
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: "## AI (Bedrock)",
        width: 24,
        height: 1,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Classify-food — Latency p95 (ms)",
        left: [wflMetric("ClassificationLatency", "p95")],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "Classify-food — Cache Hit Rate",
        left: [wflMetric("CacheHit")],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "AI Cost per day (USD)",
        left: [wflMetric("AIClassificationCost")],
        width: 8,
        height: 6,
      })
    );

    // ── Section: Security ────────────────────────────────────────
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: "## Security",
        width: 24,
        height: 1,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Failed Logins",
        left: [cognitoMetric("SignInSuccesses"), cognitoMetric("TokenRefreshSuccesses")],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "KMS Decrypt Denies",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/KMS",
            metricName: "KeyUsageDenied",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "WAF Blocked Requests",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/WAFV2",
            metricName: "BlockedRequests",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 8,
        height: 6,
      })
    );

    // ============================================================
    // Alarms — per spec in 13_OBSERVABILITY.md
    // ============================================================
    const addAlarm = (
      id: string,
      metric: cloudwatch.IMetric,
      opts: {
        name: string;
        desc: string;
        threshold: number;
        critical?: boolean;
        periods?: number;
      }
    ) => {
      const alarm = new cloudwatch.Alarm(this, id, {
        metric,
        threshold: opts.threshold,
        evaluationPeriods: opts.periods ?? 1,
        alarmDescription: opts.desc,
        alarmName: `${app}-${opts.name}-${env}`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        actionsEnabled: isProd,
      });
      const topic = opts.critical ? this.criticalTopic : this.alertTopic;
      alarm.addAlarmAction(new actions.SnsAction(topic));
      alarm.addOkAction(new actions.SnsAction(topic));
      return alarm;
    };

    // Lambda error rate
    addAlarm(
      "LambdaErrorRateAlarm",
      new cloudwatch.MathExpression({
        expression: "errors / invocations * 100",
        usingMetrics: {
          errors: new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Errors",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
          invocations: new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Invocations",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        },
        period: cdk.Duration.minutes(5),
      }),
      { name: "lambda-error-rate", desc: "Lambda error rate > 1%", threshold: 1, critical: true }
    );

    // Lambda p95 duration
    addAlarm(
      "LambdaDurationAlarm",
      new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Duration",
        statistic: "p95",
        period: cdk.Duration.minutes(5),
      }),
      { name: "lambda-duration-p95", desc: "Lambda p95 duration > 5s", threshold: 5000 }
    );

    // AppSync 5xx
    addAlarm(
      "AppSync5xxAlarm",
      appSyncMetric("GraphQL.ServerErrors"),
      { name: "appsync-5xx", desc: "AppSync 5xx errors", threshold: 5, critical: true }
    );

    // DynamoDB throttling
    addAlarm(
      "DynamoThrottleAlarm",
      new cloudwatch.Metric({
        namespace: "AWS/DynamoDB",
        metricName: "ThrottledRequests",
        dimensionsMap: { TableName: `WFL-Main-${env}` },
        statistic: "Sum",
        period: cdk.Duration.minutes(1),
      }),
      { name: "dynamo-throttle", desc: "DynamoDB throttled requests", threshold: 1, critical: true }
    );

    // Bedrock spike (10x baseline → ~1000/5min as proxy)
    addAlarm(
      "BedrockInvocationsSpike",
      wflMetric("AIClassifications"),
      { name: "bedrock-spike", desc: "Bedrock invocations anomaly spike", threshold: 1000, critical: true }
    );

    // AI cost per user abuse ($5/day per user as proxy via daily aggregate)
    addAlarm(
      "AICostAbuseAlarm",
      wflMetric("AIClassificationCost"),
      { name: "ai-cost-abuse", desc: "Per-user AI cost > $5/day (possible abuse)", threshold: 5 }
    );

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.alertTopic.topicArn,
      description: "SNS medium-severity alert topic",
    });

    new cdk.CfnOutput(this, "CriticalTopicArn", {
      value: this.criticalTopic.topicArn,
      description: "SNS critical alert topic",
    });

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#dashboards:name=${app}-ops-${env}`,
      description: "CloudWatch dashboard URL",
    });
  }
}
