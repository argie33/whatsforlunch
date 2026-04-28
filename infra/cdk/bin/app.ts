#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { loadEnvConfig, EnvConfig } from '../lib/config/env-config';
import { applyTags } from '../lib/config/tags';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AiStack } from '../lib/stacks/ai-stack';
import { NotificationsStack } from '../lib/stacks/notifications-stack';
import { OpsStack } from '../lib/stacks/ops-stack';
import { SecurityStack } from '../lib/stacks/security-stack';
import { BillingStack } from '../lib/stacks/billing-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { OidcStack } from '../lib/stacks/oidc-stack';
import { DomainStack } from '../lib/stacks/domain-stack';
import { CacheStack } from '../lib/stacks/cache-stack';

const app = new cdk.App();
const env = app.node.tryGetContext('env') ?? 'dev';
const config = loadEnvConfig(env);

const stackProps: cdk.StackProps = {
  env: {
    account: config.awsAccountId,
    region: config.region,
  },
  description: `WhatsForLunch infrastructure (${config.env})`,
};

// OIDC and Domain stacks are only deployed for staging/prod (require AWS account setup)
// Skip for local development
let oidc: OidcStack | undefined;
let domain: DomainStack | undefined;

if (!env.startsWith('dev')) {
  oidc = new OidcStack(app, 'WFL-OIDC-stack', {
    ...stackProps,
    config,
  });

  domain = new DomainStack(app, `WFL-Domain-${config.env}`, {
    ...stackProps,
    config,
  });
}

// Phase A deliverables: create all stacks with core infrastructure
const network = new NetworkStack(app, `WFL-Network-${config.env}`, {
  ...stackProps,
  config,
});

const data = new DataStack(app, `WFL-Data-${config.env}`, {
  ...stackProps,
  config,
});

const auth = new AuthStack(app, `WFL-Auth-${config.env}`, {
  ...stackProps,
  config,
  dataStack: data,
});

const ai = new AiStack(app, `WFL-AI-${config.env}`, {
  ...stackProps,
  config,
  dataStack: data,
});

const api = new ApiStack(app, `WFL-API-${config.env}`, {
  ...stackProps,
  config,
  dataStack: data,
  authStack: auth,
  aiStack: ai,
});

const notifications = new NotificationsStack(app, `WFL-Notifications-${config.env}`, {
  ...stackProps,
  config,
  dataStack: data,
});

const ops = new OpsStack(app, `WFL-Ops-${config.env}`, {
  ...stackProps,
  config,
});

const security = new SecurityStack(app, `WFL-Security-${config.env}`, {
  ...stackProps,
  config,
});

const billing = new BillingStack(app, `WFL-Billing-${config.env}`, {
  ...stackProps,
  config,
  dataStack: data,
  notificationsStack: notifications,
});

const monitoring = new MonitoringStack(app, `WFL-Monitoring-${config.env}`, {
  ...stackProps,
  config,
  apiStack: api,
  notificationsStack: notifications,
});

const cache = new CacheStack(app, `WFL-Cache-${config.env}`, {
  ...stackProps,
  config,
});

// Apply tags to all stacks
[network, data, auth, ai, api, notifications, ops, security, billing, monitoring, cache].forEach(
  (stack) => applyTags(stack, config),
);
if (oidc) applyTags(oidc, config);
if (domain) applyTags(domain, config);

app.synth();
