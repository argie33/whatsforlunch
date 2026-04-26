export interface EnvConfig {
  env: string;
  region: string;
  domainName: string;
  apiSubdomain: string;
  apiUrl: string;
  awsAccountId: string;
  tags: Record<string, string>;
}

const baseConfig: Record<string, Partial<EnvConfig>> = {
  dev: {
    env: "dev",
    region: "us-east-1",
    domainName: "wfl.app",
    apiSubdomain: "api-dev",
    apiUrl: "https://api-dev.wfl.app",
    tags: {
      Environment: "dev",
      ManagedBy: "CDK",
      Product: "WhatsForLunch",
      Wave: "1",
    },
  },
  staging: {
    env: "staging",
    region: "us-east-1",
    domainName: "wfl.app",
    apiSubdomain: "api-staging",
    apiUrl: "https://api-staging.wfl.app",
    tags: {
      Environment: "staging",
      ManagedBy: "CDK",
      Product: "WhatsForLunch",
      Wave: "1",
    },
  },
  prod: {
    env: "prod",
    region: "us-east-1",
    domainName: "wfl.app",
    apiSubdomain: "api",
    apiUrl: "https://api.wfl.app",
    tags: {
      Environment: "prod",
      ManagedBy: "CDK",
      Product: "WhatsForLunch",
      Wave: "1",
    },
  },
};

export function loadEnvConfig(env: string): EnvConfig {
  const config = baseConfig[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }

  // AWS Account ID should come from AWS_ACCOUNT_ID env var or be set per environment
  const awsAccountId = process.env.AWS_ACCOUNT_ID || "ACCOUNT_ID_PLACEHOLDER";

  return {
    env: config.env || env,
    region: config.region || "us-east-1",
    domainName: config.domainName!,
    apiSubdomain: config.apiSubdomain!,
    apiUrl: config.apiUrl!,
    awsAccountId,
    tags: config.tags || {},
  };
}
