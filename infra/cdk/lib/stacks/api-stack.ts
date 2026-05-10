import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { BaseStack, BaseStackProps } from './base-stack';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';
import { AiStack } from './ai-stack';

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  aiStack: AiStack;
}

// Pipeline outer passthrough — just forwards ctx.prev.result
const PASS_THROUGH = `
  export function request(ctx) { return {}; }
  export function response(ctx) { return ctx.prev.result; }
`;

export class ApiStack extends BaseStack {
  public readonly api: appsync.GraphqlApi;
  public readonly apiUrl: string;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';
    const tableName = props.dataStack.table?.tableName ?? `${appName}-main-${env}`;

    // ============================================
    // AppSync GraphQL API
    // ============================================
    this.api = new appsync.GraphqlApi(this, 'Api', {
      name: `${appName}-api-${env}`,
      schema: appsync.SchemaFile.fromAsset('lib/appsync/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool: props.authStack.userPool! },
        },
        additionalAuthorizationModes: [{ authorizationType: appsync.AuthorizationType.API_KEY }],
      },
      environmentVariables: {
        TABLE_NAME: tableName,
      },
      logConfig: { retention: 7 },
      xrayEnabled: true,
    });

    // ============================================
    // Data Sources
    // ============================================
    const dbDs = this.api.addDynamoDbDataSource('DynamoDbDs', props.dataStack.table!);
    const noneDs = this.api.addNoneDataSource('NoneDs');

    const classifyFoodDs = this.api.addLambdaDataSource(
      'ClassifyFoodDs',
      props.aiStack.classifyFoodFn,
    );
    const ocrExpiryDs = this.api.addLambdaDataSource('OcrExpiryDs', props.aiStack.ocrExpiryFn);

    // Inline Lambda for delete-account (sets deletion timestamp; Step Function does the rest)
    const deleteAccountLambda = new lambda.Function(this, 'DeleteAccountFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: { MAIN_TABLE: tableName },
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
        const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
        exports.handler = async (event) => {
          const userId = event.identity?.sub;
          if (!userId) throw new Error('Unauthorized');
          await ddb.send(new UpdateCommand({
            TableName: process.env.MAIN_TABLE,
            Key: { PK: 'USER#' + userId, SK: 'PROFILE' },
            UpdateExpression: 'SET deletionScheduledAt = :t, updatedAt = :now, _version = _version + :inc',
            ExpressionAttributeValues: {
              ':t': new Date(Date.now() + 30 * 86400000).toISOString(),
              ':now': new Date().toISOString(),
              ':inc': 1,
            },
          }));
          return true;
        };
      `),
    });
    props.dataStack.table?.grantWriteData(deleteAccountLambda);
    const deleteAccountDs = this.api.addLambdaDataSource('DeleteAccountDs', deleteAccountLambda);

    const exportDataLambda = new lambda.Function(this, 'ExportDataFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: { MAIN_TABLE: tableName },
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          const userId = event.identity?.sub;
          if (!userId) throw new Error('Unauthorized');
          // Production: trigger export Lambda and return presigned URL
          return 'https://exports.whatsfresh.com/pending/' + userId;
        };
      `),
    });
    const exportDataDs = this.api.addLambdaDataSource('ExportDataDs', exportDataLambda);

    // ============================================
    // AppSync Pipeline Functions — auth guards
    // ============================================
    const rt = appsync.FunctionRuntime.JS_1_0_0;

    const checkMemberFn = new appsync.AppsyncFunction(this, 'CheckHouseholdMemberFn', {
      name: 'checkHouseholdMembership',
      api: this.api,
      dataSource: dbDs,
      code: appsync.Code.fromAsset(
        path.join(__dirname, '../appsync/functions/checkHouseholdMembership.js'),
      ),
      runtime: rt,
    });

    const checkOwnerFn = new appsync.AppsyncFunction(this, 'CheckOwnerRoleFn', {
      name: 'checkOwnerRole',
      api: this.api,
      dataSource: noneDs,
      code: appsync.Code.fromAsset(path.join(__dirname, '../appsync/functions/checkOwnerRole.js')),
      runtime: rt,
    });

    // ============================================
    // Helpers
    // ============================================

    // Inline AppSync function backed by DynamoDB
    const dbFn = (id: string, code: string) =>
      new appsync.AppsyncFunction(this, id, {
        name: id,
        api: this.api,
        dataSource: dbDs,
        code: appsync.Code.fromInline(code),
        runtime: rt,
      });

    // Pipeline resolver: outer passthrough wrapper + ordered pipeline functions
    const pipeline = (type: string, field: string, fns: appsync.AppsyncFunction[]) =>
      new appsync.Resolver(this, `${type}_${field}`, {
        api: this.api,
        typeName: type,
        fieldName: field,
        code: appsync.Code.fromInline(PASS_THROUGH),
        runtime: rt,
        pipelineConfig: fns,
      });

    // ============================================
    // Profile Resolvers (no household check)
    // ============================================
    dbDs.createResolver('QueryGetProfileResolver', {
      typeName: 'Query',
      fieldName: 'getProfile',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'GetItem', key: { PK: { S: 'USER#' + ctx.identity.sub }, SK: { S: 'PROFILE' } } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    dbDs.createResolver('QueryGetProfileByIdResolver', {
      typeName: 'Query',
      fieldName: 'getProfileById',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'GetItem', key: { PK: { S: 'USER#' + ctx.args.userId }, SK: { S: 'PROFILE' } } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    dbDs.createResolver('MutationUpdateProfileResolver', {
      typeName: 'Mutation',
      fieldName: 'updateProfile',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          const i = ctx.args.input;
          const exprs = [], vals = {}, names = {};
          if (i.displayName !== undefined) { exprs.push('#dn = :dn'); names['#dn'] = 'displayName'; vals[':dn'] = { S: i.displayName }; }
          if (i.photoUrl !== undefined) { exprs.push('photoUrl = :pu'); vals[':pu'] = { S: i.photoUrl }; }
          if (i.timeZone !== undefined) { exprs.push('timeZone = :tz'); vals[':tz'] = { S: i.timeZone }; }
          if (i.units !== undefined) { exprs.push('#u = :u'); names['#u'] = 'units'; vals[':u'] = { S: i.units }; }
          if (i.locale !== undefined) { exprs.push('locale = :lc'); vals[':lc'] = { S: i.locale }; }
          if (i.dietaryPreferences !== undefined) { exprs.push('dietaryPreferences = :dp'); vals[':dp'] = { L: i.dietaryPreferences.map(v => ({ S: v })) }; }
          if (i.cuisinePreferences !== undefined) { exprs.push('cuisinePreferences = :cp'); vals[':cp'] = { L: i.cuisinePreferences.map(v => ({ S: v })) }; }
          if (i.allergies !== undefined) { exprs.push('allergies = :al'); vals[':al'] = { L: i.allergies.map(v => ({ S: v })) }; }
          if (i.defaultHouseholdId !== undefined) { exprs.push('defaultHouseholdId = :dh'); vals[':dh'] = { S: i.defaultHouseholdId }; }
          exprs.push('updatedAt = :now', '_version = _version + :inc', '_lastChangedAt = :ts');
          vals[':now'] = { S: util.time.nowISO8601() };
          vals[':inc'] = { N: '1' };
          vals[':ts'] = { N: util.time.nowEpochMilliSeconds().toString() };
          return { operation: 'UpdateItem', key: { PK: { S: 'USER#' + ctx.identity.sub }, SK: { S: 'PROFILE' } }, update: { expression: 'SET ' + exprs.join(', '), expressionNames: names, expressionValues: vals } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    // ============================================
    // Food Rules (public, no household check)
    // ============================================
    dbDs.createResolver('QueryListFoodRulesResolver', {
      typeName: 'Query',
      fieldName: 'listFoodRules',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'FOOD_RULES' }, ':sk': { S: 'RULE#' } } }, limit: 200 };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result.items || [];
        }
      `),
    });

    dbDs.createResolver('QueryGetFoodRuleResolver', {
      typeName: 'Query',
      fieldName: 'getFoodRule',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'GetItem', key: { PK: { S: 'FOOD_RULES' }, SK: { S: 'RULE#' + ctx.args.foodType } } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    // ============================================
    // Household Resolvers
    // ============================================

    // listHouseholds: GSI1 (USER#id → HOUSEHOLD#*)
    dbDs.createResolver('QueryListHouseholdsResolver', {
      typeName: 'Query',
      fieldName: 'listHouseholds',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Query', index: 'GSI1', query: { expression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)', expressionValues: { ':pk': { S: 'USER#' + ctx.identity.sub }, ':sk': { S: 'HOUSEHOLD#' } } } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result.items || [];
        }
      `),
    });

    // getHousehold: pipeline (checkMember → get)
    const getHouseholdFn = dbFn(
      'GetHouseholdDataFn',
      `
      export function request(ctx) {
        return { operation: 'GetItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.id }, SK: { S: 'META' } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Query', 'getHousehold', [checkMemberFn, getHouseholdFn]);

    // createHousehold: no membership check (user creates a new one)
    dbDs.createResolver('MutationCreateHouseholdResolver', {
      typeName: 'Mutation',
      fieldName: 'createHousehold',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          const id = util.autoId(), now = util.time.nowISO8601(), ts = util.time.nowEpochMilliSeconds();
          const userId = ctx.identity.sub, input = ctx.args.input, table = ctx.env.TABLE_NAME;
          return {
            operation: 'TransactWriteItems',
            transactItems: [
              { table, operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + id }, SK: { S: 'META' } },
                attributeValues: { entityType: { S: 'Household' }, id: { S: id }, name: { S: input.name }, ownerId: { S: userId }, memberCount: { N: '1' }, createdAt: { S: now }, updatedAt: { S: now }, _version: { N: '1' }, _lastChangedAt: { N: ts.toString() } },
                condition: { expression: 'attribute_not_exists(PK)' } },
              { table, operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + id }, SK: { S: 'MEMBER#' + userId } },
                attributeValues: { entityType: { S: 'HouseholdMember' }, userId: { S: userId }, role: { S: 'owner' }, joinedAt: { S: now }, GSI1PK: { S: 'USER#' + userId }, GSI1SK: { S: 'HOUSEHOLD#' + id } } },
            ],
          };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          const now = util.time.nowISO8601();
          return { id: ctx.result?.keys?.[0]?.PK?.S?.replace('HOUSEHOLD#','') ?? util.autoId(), name: ctx.args.input.name, ownerId: ctx.identity.sub, memberCount: 1, createdAt: now, updatedAt: now, _version: 1, _lastChangedAt: util.time.nowEpochMilliSeconds() };
        }
      `),
    });

    // updateHousehold: checkMember + checkOwner + update
    const updateHouseholdFn = dbFn(
      'UpdateHouseholdDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input, vals = {}, exprs = [];
        if (i.name) { exprs.push('name = :n'); vals[':n'] = { S: i.name }; }
        if (i.imageUrl) { exprs.push('imageUrl = :img'); vals[':img'] = { S: i.imageUrl }; }
        exprs.push('updatedAt = :now', '_version = _version + :inc');
        vals[':now'] = { S: util.time.nowISO8601() }; vals[':inc'] = { N: '1' };
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'META' } }, update: { expression: 'SET ' + exprs.join(', '), expressionValues: vals } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'updateHousehold', [checkMemberFn, checkOwnerFn, updateHouseholdFn]);

    // deleteHousehold: checkMember + checkOwner + delete
    const deleteHouseholdFn = dbFn(
      'DeleteHouseholdDataFn',
      `
      export function request(ctx) {
        return { operation: 'DeleteItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'META' } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return true;
      }
    `,
    );
    pipeline('Mutation', 'deleteHousehold', [checkMemberFn, checkOwnerFn, deleteHouseholdFn]);

    // listHouseholdMembers: checkMember + list
    const listMembersFn = dbFn(
      'ListHouseholdMembersDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'MEMBER#' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listHouseholdMembers', [checkMemberFn, listMembersFn]);

    // inviteHouseholdMember: checkMember + checkOwner + put invite
    const inviteMemberFn = dbFn(
      'InviteMemberDataFn',
      `
      export function request(ctx) {
        const { householdId } = ctx.args.input, token = util.autoId(), now = util.time.nowISO8601();
        return { operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + householdId }, SK: { S: 'INVITE#' + token } },
          attributeValues: { entityType: { S: 'HouseholdInvite' }, id: { S: token }, token: { S: token }, householdId: { S: householdId }, createdBy: { S: ctx.identity.sub }, createdAt: { S: now }, expiresAt: { S: now } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'inviteHouseholdMember', [checkMemberFn, checkOwnerFn, inviteMemberFn]);

    // acceptHouseholdInvite: look up token, add member (no upfront membership check)
    const acceptInviteFn = dbFn(
      'AcceptInviteDataFn',
      `
      export function request(ctx) {
        return { operation: 'Scan', filter: { expression: '#t = :t AND entityType = :et', expressionNames: { '#t': 'token' }, expressionValues: { ':t': { S: ctx.args.input.token }, ':et': { S: 'HouseholdInvite' } } }, limit: 1 };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        const inv = (ctx.result.items || [])[0];
        if (!inv) util.error('Invite not found or expired', 'NOT_FOUND');
        return { id: inv.householdId?.S, name: 'Household', ownerId: inv.createdBy?.S ?? '', memberCount: 0, createdAt: inv.createdAt?.S ?? '', updatedAt: inv.createdAt?.S ?? '', _version: 1, _lastChangedAt: 0 };
      }
    `,
    );
    pipeline('Mutation', 'acceptHouseholdInvite', [acceptInviteFn]);

    // removeHouseholdMember: checkMember + checkOwner + delete
    const removeMemberFn = dbFn(
      'RemoveMemberDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'DeleteItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'MEMBER#' + i.userId } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return true;
      }
    `,
    );
    pipeline('Mutation', 'removeHouseholdMember', [checkMemberFn, checkOwnerFn, removeMemberFn]);

    // getHouseholdInvite by token (no auth — anyone with token can view)
    dbDs.createResolver('QueryGetHouseholdInviteResolver', {
      typeName: 'Query',
      fieldName: 'getHouseholdInvite',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Scan', filter: { expression: '#t = :t AND entityType = :et', expressionNames: { '#t': 'token' }, expressionValues: { ':t': { S: ctx.args.token }, ':et': { S: 'HouseholdInvite' } } }, limit: 1 };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return (ctx.result.items || [])[0] || null;
        }
      `),
    });

    // ============================================
    // Container Resolvers
    // ============================================

    const listContainersFn = dbFn(
      'ListContainersDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'CONTAINER#' } } }, filter: { expression: 'attribute_not_exists(archivedAt)' } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listContainers', [checkMemberFn, listContainersFn]);

    const getContainerFn = dbFn(
      'GetContainerDataFn',
      `
      export function request(ctx) {
        return { operation: 'GetItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'CONTAINER#' + ctx.args.id } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Query', 'getContainer', [checkMemberFn, getContainerFn]);

    // getContainerByQrToken: scan (no auth — user may not yet know the household)
    dbDs.createResolver('QueryGetContainerByQrTokenResolver', {
      typeName: 'Query',
      fieldName: 'getContainerByQrToken',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Scan', filter: { expression: 'qrToken = :qt AND entityType = :et', expressionValues: { ':qt': { S: ctx.args.qrToken }, ':et': { S: 'Container' } } }, limit: 1 };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return (ctx.result.items || [])[0] || null;
        }
      `),
    });

    const claimContainerFn = dbFn(
      'ClaimContainerDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input, id = util.autoId(), now = util.time.nowISO8601(), ts = util.time.nowEpochMilliSeconds();
        return { operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'CONTAINER#' + id } },
          attributeValues: { entityType: { S: 'Container' }, id: { S: id }, householdId: { S: i.householdId }, qrToken: { S: i.qrToken }, claimedAt: { S: now }, claimedBy: { S: ctx.identity.sub }, createdAt: { S: now }, updatedAt: { S: now }, _version: { N: '1' }, _lastChangedAt: { N: ts.toString() } },
          condition: { expression: 'attribute_not_exists(PK)' } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'claimContainer', [checkMemberFn, claimContainerFn]);

    const updateContainerFn = dbFn(
      'UpdateContainerDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input, vals = {}, exprs = [];
        if (i.nickname) { exprs.push('nickname = :nn'); vals[':nn'] = { S: i.nickname }; }
        if (i.imageUrl) { exprs.push('imageUrl = :img'); vals[':img'] = { S: i.imageUrl }; }
        exprs.push('updatedAt = :now', '_version = _version + :inc', '_lastChangedAt = :ts');
        vals[':now'] = { S: util.time.nowISO8601() }; vals[':inc'] = { N: '1' }; vals[':ts'] = { N: util.time.nowEpochMilliSeconds().toString() };
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'CONTAINER#' + i.containerId } }, update: { expression: 'SET ' + exprs.join(', '), expressionValues: vals } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'updateContainer', [checkMemberFn, updateContainerFn]);

    const archiveContainerFn = dbFn(
      'ArchiveContainerDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'CONTAINER#' + i.containerId } }, update: { expression: 'SET archivedAt = :now, _version = _version + :inc', expressionValues: { ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'archiveContainer', [checkMemberFn, archiveContainerFn]);

    // ============================================
    // Item Resolvers
    // ============================================

    const listItemsFn = dbFn(
      'ListItemsDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'ITEM#' } } }, filter: { expression: 'attribute_not_exists(deletedAt)' }, limit: ctx.args.limit || 50, scanIndexForward: false };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listItems', [checkMemberFn, listItemsFn]);

    const getItemFn = dbFn(
      'GetItemDataFn',
      `
      export function request(ctx) {
        return { operation: 'GetItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'ITEM#' + ctx.args.id } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Query', 'getItem', [checkMemberFn, getItemFn]);

    const listExpiringFn = dbFn(
      'ListExpiringItemsDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', index: 'GSI2', query: { expression: 'GSI2PK = :pk', expressionValues: { ':pk': { S: 'EXPIRING#' + ctx.args.householdId } } }, filter: { expression: '#s = :active', expressionNames: { '#s': 'status' }, expressionValues: { ':active': { S: 'active' } } }, limit: 100, scanIndexForward: true };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listExpiringItems', [checkMemberFn, listExpiringFn]);

    const listByContainerFn = dbFn(
      'ListItemsByContainerDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'ITEM#' } } }, filter: { expression: 'containerId = :cid AND attribute_not_exists(deletedAt)', expressionValues: { ':cid': { S: ctx.args.containerId } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listItemsByContainer', [checkMemberFn, listByContainerFn]);

    const searchItemsFn = dbFn(
      'SearchItemsDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'ITEM#' } } }, filter: { expression: 'contains(foodName, :q) OR contains(foodType, :q)', expressionValues: { ':q': { S: ctx.args.query } } }, limit: 30 };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'searchItems', [checkMemberFn, searchItemsFn]);

    const createItemFn = dbFn(
      'CreateItemDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input, id = util.autoId(), now = util.time.nowISO8601(), ts = util.time.nowEpochMilliSeconds();
        const vals = { entityType: { S: 'Item' }, id: { S: id }, householdId: { S: i.householdId }, addedByUserId: { S: ctx.identity.sub }, foodType: { S: i.foodType }, foodName: { S: i.foodName }, category: { S: i.category }, storageLocation: { S: i.storageLocation }, storedAt: { S: now }, expiryAt: { S: i.expiryAt }, expirySource: { S: i.expirySource }, status: { S: 'active' }, createdAt: { S: now }, updatedAt: { S: now }, _version: { N: '1' }, _lastChangedAt: { N: ts.toString() }, GSI2PK: { S: 'EXPIRING#' + i.householdId }, GSI2SK: { S: i.expiryAt }, GSI3PK: { S: 'USER_ITEMS#' + ctx.identity.sub }, GSI3SK: { S: now } };
        if (i.containerId) vals['containerId'] = { S: i.containerId };
        if (i.quantityText) vals['quantityText'] = { S: i.quantityText };
        if (i.notes) vals['notes'] = { S: i.notes };
        if (i.photoUrl) vals['photoUrl'] = { S: i.photoUrl };
        if (i.barcode) vals['barcode'] = { S: i.barcode };
        return { operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + id } }, attributeValues: vals };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'createItem', [checkMemberFn, createItemFn]);

    const updateItemFn = dbFn(
      'UpdateItemDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input, vals = {}, exprs = [], names = {};
        if (i.foodName) { exprs.push('foodName = :fn'); vals[':fn'] = { S: i.foodName }; }
        if (i.storageLocation) { exprs.push('storageLocation = :sl'); vals[':sl'] = { S: i.storageLocation }; }
        if (i.quantityText !== undefined) { exprs.push('quantityText = :qt'); vals[':qt'] = { S: i.quantityText || '' }; }
        if (i.expiryAt) { exprs.push('expiryAt = :ea', 'GSI2SK = :ea'); vals[':ea'] = { S: i.expiryAt }; }
        if (i.notes !== undefined) { exprs.push('notes = :nt'); vals[':nt'] = { S: i.notes || '' }; }
        exprs.push('updatedAt = :now', '_version = _version + :inc', '_lastChangedAt = :ts');
        vals[':now'] = { S: util.time.nowISO8601() }; vals[':inc'] = { N: '1' }; vals[':ts'] = { N: util.time.nowEpochMilliSeconds().toString() };
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET ' + exprs.join(', '), expressionNames: names, expressionValues: vals }, condition: { expression: '_version = :cv', expressionValues: { ':cv': { N: i._version.toString() } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'updateItem', [checkMemberFn, updateItemFn]);

    const deleteItemFn = dbFn(
      'DeleteItemDataFn',
      `
      export function request(ctx) {
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'ITEM#' + ctx.args.id } }, update: { expression: 'SET deletedAt = :now, _version = _version + :inc REMOVE GSI2PK, GSI2SK', expressionValues: { ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return true;
      }
    `,
    );
    pipeline('Mutation', 'deleteItem', [checkMemberFn, deleteItemFn]);

    const markEatenFn = dbFn(
      'MarkItemEatenDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET #s = :s, eatenAt = :now, updatedAt = :now, _version = _version + :inc REMOVE GSI2PK, GSI2SK', expressionNames: { '#s': 'status' }, expressionValues: { ':s': { S: 'eaten' }, ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'markItemEaten', [checkMemberFn, markEatenFn]);

    const markTossedFn = dbFn(
      'MarkItemTossedDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET #s = :s, tossedAt = :now, updatedAt = :now, _version = _version + :inc REMOVE GSI2PK, GSI2SK', expressionNames: { '#s': 'status' }, expressionValues: { ':s': { S: 'tossed' }, ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'markItemTossed', [checkMemberFn, markTossedFn]);

    const markFrozenFn = dbFn(
      'MarkItemFrozenDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET #s = :s, frozenAt = :now, storageLocation = :loc, updatedAt = :now, _version = _version + :inc', expressionNames: { '#s': 'status' }, expressionValues: { ':s': { S: 'frozen' }, ':now': { S: util.time.nowISO8601() }, ':loc': { S: 'freezer' }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'markItemFrozen', [checkMemberFn, markFrozenFn]);

    const markPartialFn = dbFn(
      'MarkItemPartialDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET #s = :s, updatedAt = :now, _version = _version + :inc', expressionNames: { '#s': 'status' }, expressionValues: { ':s': { S: 'partial' }, ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'markItemPartial', [checkMemberFn, markPartialFn]);

    const transferItemFn = dbFn(
      'TransferItemDataFn',
      `
      export function request(ctx) {
        const i = ctx.args.input;
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + i.householdId }, SK: { S: 'ITEM#' + i.id } }, update: { expression: 'SET transferredToContainerId = :cid, updatedAt = :now, _version = _version + :inc', expressionValues: { ':cid': { S: i.toContainerId }, ':now': { S: util.time.nowISO8601() }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'transferItem', [checkMemberFn, transferItemFn]);

    // ============================================
    // Shopping List Resolvers
    // ============================================

    const listShoppingFn = dbFn(
      'ListShoppingItemsDataFn',
      `
      export function request(ctx) {
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'SHOPPING#' } } }, filter: { expression: 'attribute_not_exists(deletedAt)' } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result.items || [];
      }
    `,
    );
    pipeline('Query', 'listShoppingItems', [checkMemberFn, listShoppingFn]);

    const addShoppingFn = dbFn(
      'AddShoppingItemDataFn',
      `
      export function request(ctx) {
        const id = util.autoId(), now = util.time.nowISO8601();
        return { operation: 'PutItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'SHOPPING#' + id } },
          attributeValues: { entityType: { S: 'ShoppingListItem' }, id: { S: id }, householdId: { S: ctx.args.householdId }, name: { S: ctx.args.name }, addedByUserId: { S: ctx.identity.sub }, autoSuggested: { BOOL: false }, createdAt: { S: now }, updatedAt: { S: now }, _version: { N: '1' }, _lastChangedAt: { N: util.time.nowEpochMilliSeconds().toString() } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'addShoppingItem', [checkMemberFn, addShoppingFn]);

    const markPurchasedFn = dbFn(
      'MarkShoppingPurchasedDataFn',
      `
      export function request(ctx) {
        return { operation: 'UpdateItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'SHOPPING#' + ctx.args.id } }, update: { expression: 'SET purchasedAt = :now, purchasedByUserId = :uid, _version = _version + :inc', expressionValues: { ':now': { S: util.time.nowISO8601() }, ':uid': { S: ctx.identity.sub }, ':inc': { N: '1' } } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    );
    pipeline('Mutation', 'markShoppingItemPurchased', [checkMemberFn, markPurchasedFn]);

    const deleteShoppingFn = dbFn(
      'DeleteShoppingItemDataFn',
      `
      export function request(ctx) {
        return { operation: 'DeleteItem', key: { PK: { S: 'HOUSEHOLD#' + ctx.args.householdId }, SK: { S: 'SHOPPING#' + ctx.args.id } } };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        return true;
      }
    `,
    );
    pipeline('Mutation', 'deleteShoppingItem', [checkMemberFn, deleteShoppingFn]);

    // ============================================
    // Delta Sync (offline-first)
    // ============================================
    const deltaSyncFn = dbFn(
      'DeltaSyncDataFn',
      `
      export function request(ctx) {
        const since = ctx.args.lastSyncAt || '1970-01-01T00:00:00.000Z';
        return { operation: 'Query', query: { expression: 'PK = :pk AND begins_with(SK, :sk)', expressionValues: { ':pk': { S: 'HOUSEHOLD#' + ctx.args.householdId }, ':sk': { S: 'ITEM#' } } }, filter: { expression: 'updatedAt > :since', expressionValues: { ':since': { S: since } } }, limit: ctx.args.limit || 100 };
      }
      export function response(ctx) {
        if (ctx.error) util.error(ctx.error.message, ctx.error.type);
        const all = ctx.result.items || [];
        const items = all.filter(i => !i.deletedAt?.S);
        const deleted = all.filter(i => !!i.deletedAt?.S).map(i => ({ id: i.id?.S, entityType: i.entityType?.S, deletedAt: i.deletedAt?.S }));
        return { items, containers: [], members: [], deleted, timestamp: util.time.nowISO8601(), hasMore: !!ctx.result.nextToken };
      }
    `,
    );
    pipeline('Query', 'deltaSync', [checkMemberFn, deltaSyncFn]);

    // ============================================
    // AI Operations (Lambda data sources)
    // ============================================
    const classifyFoodDataFn = new appsync.AppsyncFunction(this, 'ClassifyFoodDataFn', {
      name: 'classifyFoodData',
      api: this.api,
      dataSource: classifyFoodDs,
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Invoke', payload: { arguments: ctx.args, identity: ctx.identity } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });
    pipeline('Mutation', 'classifyFood', [checkMemberFn, classifyFoodDataFn]);

    const ocrExpiryDataFn = new appsync.AppsyncFunction(this, 'OcrExpiryDataFn', {
      name: 'ocrExpiryData',
      api: this.api,
      dataSource: ocrExpiryDs,
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Invoke', payload: { arguments: ctx.args, identity: ctx.identity } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });
    pipeline('Mutation', 'ocrExpiryDate', [checkMemberFn, ocrExpiryDataFn]);

    // ============================================
    // Account Operations
    // ============================================
    deleteAccountDs.createResolver('MutationDeleteAccountResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteAccount',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Invoke', payload: { identity: ctx.identity } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    exportDataDs.createResolver('MutationExportDataResolver', {
      typeName: 'Mutation',
      fieldName: 'exportData',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Invoke', payload: { identity: ctx.identity } };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    // ============================================
    // Image Upload — Generate S3 Presigned URLs
    // ============================================
    const uploadImageLambda = new lambda.Function(this, 'UploadImageFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        PHOTOS_BUCKET: props.dataStack.photoBucket?.bucketName ?? `${appName}-photos-${env}`,
      },
      code: lambda.Code.fromInline(`
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const s3 = new S3Client({});

        exports.handler = async (event) => {
          const userId = event.identity?.sub;
          const householdId = event.args?.householdId;
          const filename = event.args?.filename;
          const contentType = event.args?.contentType;

          if (!userId || !householdId || !filename || !contentType) {
            throw new Error('Missing required parameters: householdId, filename, contentType');
          }

          // Generate S3 key: photos/{householdId}/{timestamp}_{filename}
          const timestamp = Date.now();
          const s3Key = \`photos/\${householdId}/\${timestamp}_\${filename}\`;

          try {
            const command = new PutObjectCommand({
              Bucket: process.env.PHOTOS_BUCKET,
              Key: s3Key,
              ContentType: contentType,
              Metadata: {
                'user-id': userId,
                'household-id': householdId,
                'uploaded-at': new Date().toISOString(),
              },
            });

            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

            return {
              uploadUrl: url,
              s3Key: s3Key,
              bucket: process.env.PHOTOS_BUCKET,
              expiresIn: 3600,
            };
          } catch (err) {
            console.error('Error generating presigned URL:', err);
            throw new Error('Failed to generate upload URL: ' + err.message);
          }
        };
      `),
    });

    props.dataStack.photoBucket?.grantPut(uploadImageLambda);
    const uploadImageDs = this.api.addLambdaDataSource('UploadImageDs', uploadImageLambda);

    uploadImageDs.createResolver('MutationUploadImageResolver', {
      typeName: 'Mutation',
      fieldName: 'uploadImage',
      runtime: rt,
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return { operation: 'Invoke', payload: ctx.args };
        }
        export function response(ctx) {
          if (ctx.error) util.error(ctx.error.message, ctx.error.type);
          return ctx.result;
        }
      `),
    });

    // ============================================
    // CloudFront Distribution (AppSync → CF for DDoS protection)
    // ============================================
    this.distribution = new cloudfront.Distribution(this, 'ApiDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(
          `${this.api.apiId}.appsync-api.${this.config.region}.amazonaws.com`,
          { protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY },
        ),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        compress: true,
      },
    });

    this.apiUrl = this.config.apiUrl;

    new cdk.CfnOutput(this, 'AppSyncApiUrl', {
      value: `https://${this.api.apiId}.appsync-api.${this.config.region}.amazonaws.com/graphql`,
      description: 'AppSync GraphQL API endpoint (direct)',
      exportName: `${appName}-ApiUrl-${env}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontApiUrl', {
      value: `https://${this.distribution.distributionDomainName}/graphql`,
      description: 'AppSync GraphQL API endpoint (via CloudFront)',
      exportName: `${appName}-CloudFrontApiUrl-${env}`,
    });

    new cdk.CfnOutput(this, 'AppSyncApiId', {
      value: this.api.apiId,
      description: 'AppSync API ID',
      exportName: `${appName}-ApiId-${env}`,
    });
  }
}
