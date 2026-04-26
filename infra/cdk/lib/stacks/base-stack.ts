import * as cdk from "aws-cdk-lib";
import { EnvConfig } from "../config/env-config";

export interface BaseStackProps extends cdk.StackProps {
  config: EnvConfig;
}

export class BaseStack extends cdk.Stack {
  protected config: EnvConfig;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);
    this.config = props.config;
  }
}
