import * as cdk from "aws-cdk-lib";
import { EnvConfig } from "./env-config";

export function applyTags(stack: cdk.Stack, config: EnvConfig): void {
  Object.entries(config.tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
}
