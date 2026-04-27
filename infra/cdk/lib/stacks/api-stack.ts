import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";
import { AuthStack } from "./auth-stack";
import { AiStack } from "./ai-stack";

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  aiStack: AiStack;
}

export class ApiStack extends BaseStack {
  public readonly api: appsync.GraphqlApi;
  public readonly apiUrl: string;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // AppSync GraphQL API
    // ============================================
    this.api = new appsync.GraphqlApi(this, "Api", {
      name: `${appName}-api-${env}`,
      schema: appsync.SchemaFile.fromAsset("lib/appsync/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.authStack.userPool!,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
          },
        ],
      },
      logConfig: {
        retention: 7,
      },
      xrayEnabled: true,
    });

    // ============================================
    // Data source: DynamoDB table
    // ============================================
    const dbDataSource = this.api.addDynamoDbDataSource(
      "DynamoDbDataSource",
      props.dataStack.table!
    );

    // Phase B: Wire AppSync Pipeline Resolvers with authorization functions
    // - checkHouseholdMembership (verify household membership)
    // - checkOwnerRole (verify owner role)
    // - enforceRateLimit (enforce per-user rate limiting)

    // ============================================
    // Profile Resolvers
    // ============================================
    dbDataSource.createResolver("QueryGetProfileResolver", {
      typeName: "Query",
      fieldName: "getProfile",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "PK": { "S": "USER#\$ctx.identity.sub" },
            "SK": { "S": "PROFILE" }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if(\$ctx.error)
          \$util.error("Failed to get profile", "INTERNAL_ERROR")
        #else
          \$util.toJson(\$ctx.result)
        #end
      `),
    });

    dbDataSource.createResolver("MutationUpdateProfileResolver", {
      typeName: "Mutation",
      fieldName: "updateProfile",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$updates = {})
        #set(\$expVals = {})
        #set(\$expNames = {})
        #set(\$updateExpr = "SET ")

        #if(\$input.displayName)
          \$util.qr(\$updates.put("displayName", \$input.displayName))
          \$util.qr(\$expVals.put(":dn", { "S": \$input.displayName }))
          \$util.qr(\$updateExpr.concat("displayName = :dn, "))
        #end

        #if(\$input.timezone)
          \$util.qr(\$updates.put("timezone", \$input.timezone))
          \$util.qr(\$expVals.put(":tz", { "S": \$input.timezone }))
          \$util.qr(\$updateExpr.concat("timezone = :tz, "))
        #end

        #set(\$updateExpr = \$updateExpr.concat("updatedAt = :now, _version = _version + :inc, _lastChangedAt = :ts"))
        \$util.qr(\$expVals.put(":now", { "S": \$util.time.nowISO8601() }))
        \$util.qr(\$expVals.put(":inc", { "N": "1" }))
        \$util.qr(\$expVals.put(":ts", { "N": \$util.time.nowTimestamp().toString() }))

        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "USER#\$ctx.identity.sub" },
            "SK": { "S": "PROFILE" }
          },
          "update": {
            "expression": \$updateExpr,
            "expressionNames": {},
            "expressionValues": \$util.toJson(\$expVals)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    // ============================================
    // Household Resolvers
    // ============================================
    dbDataSource.createResolver("QueryListHouseholdsResolver", {
      typeName: "Query",
      fieldName: "listHouseholds",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "GSI1",
          "query": {
            "expression": "GSI1PK = :pk",
            "expressionNames": {},
            "expressionValues": {
              ":pk": { "S": "USER#\$ctx.identity.sub" }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if(\$ctx.error)
          \$util.error("Failed to list households", "INTERNAL_ERROR")
        #else
          \$util.toJson(\$ctx.result.items)
        #end
      `),
    });

    dbDataSource.createResolver("MutationCreateHouseholdResolver", {
      typeName: "Mutation",
      fieldName: "createHousehold",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$householdId = \$util.autoId())
        #set(\$now = \$util.time.nowISO8601())

        {
          "version": "2017-02-28",
          "operation": "TransactWriteItems",
          "transactItems": [
            {
              "Put": {
                "tableName": "\$ctx.stash.tableName",
                "key": {
                  "PK": { "S": "HOUSEHOLD#\$householdId" },
                  "SK": { "S": "META" }
                },
                "attributeValues": {
                  "name": { "S": \$util.toJson(\$input.name) },
                  "ownerId": { "S": \$util.toJson(\$ctx.identity.sub) },
                  "createdAt": { "S": \$util.toJson(\$now) },
                  "entityType": { "S": "Household" },
                  "GSI1PK": { "S": "HOUSEHOLD#\$householdId" },
                  "GSI1SK": { "S": "META" }
                }
              }
            },
            {
              "Put": {
                "tableName": "\$ctx.stash.tableName",
                "key": {
                  "PK": { "S": "HOUSEHOLD#\$householdId" },
                  "SK": { "S": "MEMBER#\$ctx.identity.sub" }
                },
                "attributeValues": {
                  "role": { "S": "owner" },
                  "joinedAt": { "S": \$util.toJson(\$now) },
                  "entityType": { "S": "HouseholdMember" },
                  "GSI1PK": { "S": "USER#\$ctx.identity.sub" },
                  "GSI1SK": { "S": "HOUSEHOLD#\$householdId" }
                }
              }
            }
          ]
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "householdId": \$util.toJson(\$util.dynamodb.toString(\$ctx.source.householdId)),
          "name": \$util.toJson(\$ctx.source.name),
          "ownerId": \$util.toJson(\$ctx.source.ownerId),
          "createdAt": \$util.toJson(\$ctx.source.createdAt)
        }
      `),
    });

    // ============================================
    // Item Resolvers
    // ============================================
    dbDataSource.createResolver("QueryListItemsResolver", {
      typeName: "Query",
      fieldName: "listItems",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "query": {
            "expression": "PK = :pk AND begins_with(SK, :sk)",
            "expressionNames": {},
            "expressionValues": {
              ":pk": { "S": "HOUSEHOLD#\$input.householdId" },
              ":sk": { "S": "ITEM#" }
            }
          },
          "limit": 50,
          "scanIndexForward": false
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result.items)
      `),
    });

    dbDataSource.createResolver("MutationCreateItemResolver", {
      typeName: "Mutation",
      fieldName: "createItem",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$itemId = \$util.autoId())
        #set(\$now = \$util.time.nowISO8601())

        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "tableName": "\$ctx.stash.tableName",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$itemId" }
          },
          "attributeValues": {
            "entityType": { "S": "Item" },
            "foodName": { "S": \$util.toJson(\$input.foodName) },
            "foodType": { "S": \$util.toJson(\$input.foodType) },
            "category": { "S": \$util.toJson(\$input.category) },
            "location": { "S": \$util.toJson(\$input.location) },
            "expiryAt": { "S": \$util.toJson(\$input.expiryAt) },
            "photoUrl": { "S": \$util.toJson(\$input.photoUrl) },
            "barcode": { "S": \$util.toJson(\$input.barcode) },
            "status": { "S": "active" },
            "storedAt": { "S": \$util.toJson(\$now) },
            "createdBy": { "S": \$util.toJson(\$ctx.identity.sub) },
            "createdAt": { "S": \$util.toJson(\$now) },
            "_version": { "N": "1" },
            "_lastChangedAt": { "N": \$util.time.nowTimestamp().toString() },
            "GSI2PK": { "S": "EXPIRING#\$input.householdId" },
            "GSI2SK": { "S": \$util.toJson(\$input.expiryAt) },
            "GSI3PK": { "S": "USER_ITEMS#\$ctx.identity.sub" },
            "GSI3SK": { "S": \$util.toJson(\$now) }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "itemId": \$util.toJson(\$util.dynamodb.toString(\$ctx.source.itemId)),
          "foodName": \$util.toJson(\$ctx.source.foodName),
          "status": "active"
        }
      `),
    });

    dbDataSource.createResolver("MutationMarkItemEatenResolver", {
      typeName: "Mutation",
      fieldName: "markItemEaten",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$input.itemId" }
          },
          "update": {
            "expression": "SET #status = :s, eatenAt = :now, _version = _version + :inc, _lastChangedAt = :ts REMOVE GSI2PK, GSI2SK",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":s": { "S": "eaten" },
              ":now": { "S": \$util.time.nowISO8601() },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    dbDataSource.createResolver("MutationMarkItemTossedResolver", {
      typeName: "Mutation",
      fieldName: "markItemTossed",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$input.itemId" }
          },
          "update": {
            "expression": "SET #status = :s, tossedAt = :now, _version = _version + :inc, _lastChangedAt = :ts REMOVE GSI2PK, GSI2SK",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":s": { "S": "tossed" },
              ":now": { "S": \$util.time.nowISO8601() },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    dbDataSource.createResolver("MutationMarkItemFrozenResolver", {
      typeName: "Mutation",
      fieldName: "markItemFrozen",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$input.itemId" }
          },
          "update": {
            "expression": "SET #status = :s, frozenAt = :now, storageLocation = :loc, _version = _version + :inc, _lastChangedAt = :ts",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":s": { "S": "frozen" },
              ":now": { "S": \$util.time.nowISO8601() },
              ":loc": { "S": "freezer" },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    dbDataSource.createResolver("MutationMarkItemPartialResolver", {
      typeName: "Mutation",
      fieldName: "markItemPartial",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$input.itemId" }
          },
          "update": {
            "expression": "SET #status = :s, quantityText = :qt, _version = _version + :inc, _lastChangedAt = :ts",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":s": { "S": "partial" },
              ":qt": { "S": \$util.toJson(\$input.quantityText) },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    dbDataSource.createResolver("MutationDeleteItemResolver", {
      typeName: "Mutation",
      fieldName: "deleteItem",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "ITEM#\$input.itemId" }
          },
          "update": {
            "expression": "SET deletedAt = :now, _version = _version + :inc, _lastChangedAt = :ts REMOVE GSI2PK, GSI2SK",
            "expressionValues": {
              ":now": { "S": \$util.time.nowISO8601() },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        { "success": true }
      `),
    });

    // ============================================
    // Container Resolvers
    // ============================================
    dbDataSource.createResolver("MutationClaimContainerResolver", {
      typeName: "Mutation",
      fieldName: "claimContainer",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$containerId = \$util.autoId())
        #set(\$now = \$util.time.nowISO8601())

        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "tableName": "\$ctx.stash.tableName",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "CONTAINER#\$containerId" }
          },
          "attributeValues": {
            "entityType": { "S": "Container" },
            "qrToken": { "S": \$util.toJson(\$input.qrToken) },
            "nickname": { "S": \$util.toJson(\$input.nickname) },
            "claimedAt": { "S": \$util.toJson(\$now) },
            "claimedBy": { "S": \$util.toJson(\$ctx.identity.sub) },
            "createdAt": { "S": \$util.toJson(\$now) },
            "_version": { "N": "1" },
            "_lastChangedAt": { "N": \$util.time.nowTimestamp().toString() }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "id": \$util.toJson(\$util.dynamodb.toString(\$ctx.source.id)),
          "qrToken": \$util.toJson(\$ctx.source.qrToken),
          "nickname": \$util.toJson(\$ctx.source.nickname),
          "_version": 1,
          "_lastChangedAt": \$util.time.nowTimestamp()
        }
      `),
    });

    dbDataSource.createResolver("MutationUpdateContainerResolver", {
      typeName: "Mutation",
      fieldName: "updateContainer",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$updates = {})
        #set(\$expVals = {})
        #set(\$updateExpr = "SET ")

        #if(\$input.nickname)
          \$util.qr(\$updateExpr.concat("nickname = :nn, "))
          \$util.qr(\$expVals.put(":nn", { "S": \$input.nickname }))
        #end

        #set(\$updateExpr = \$updateExpr.concat("_version = _version + :inc, _lastChangedAt = :ts"))
        \$util.qr(\$expVals.put(":inc", { "N": "1" }))
        \$util.qr(\$expVals.put(":ts", { "N": \$util.time.nowTimestamp().toString() }))

        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "CONTAINER#\$input.containerId" }
          },
          "update": {
            "expression": \$updateExpr,
            "expressionValues": \$util.toJson(\$expVals)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    dbDataSource.createResolver("MutationArchiveContainerResolver", {
      typeName: "Mutation",
      fieldName: "archiveContainer",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "CONTAINER#\$input.containerId" }
          },
          "update": {
            "expression": "SET archivedAt = :now, _version = _version + :inc, _lastChangedAt = :ts",
            "expressionValues": {
              ":now": { "S": \$util.time.nowISO8601() },
              ":inc": { "N": "1" },
              ":ts": { "N": \$util.time.nowTimestamp().toString() }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        \$util.toJson(\$ctx.result)
      `),
    });

    // ============================================
    // Sync Query: DeltaSync for offline-first
    // ============================================
    dbDataSource.createResolver("QueryDeltaSyncResolver", {
      typeName: "Query",
      fieldName: "deltaSync",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$householdId = \$input.householdId)
        #set(\$lastSync = \$input.lastSyncTimestamp)

        {
          "version": "2017-02-28",
          "operation": "Scan",
          "query": {
            "expression": "begins_with(PK, :pk) AND (attribute_not_exists(_lastChangedAt) OR _lastChangedAt > :ts)",
            "expressionNames": {},
            "expressionValues": {
              ":pk": { "S": "HOUSEHOLD#\$householdId" },
              ":ts": { "N": \$util.toJson(\$util.dynamodb.toDynamoDBJson(1000000000000)).N }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$containers = [])
        #set(\$items = [])
        #set(\$shoppingList = [])

        #foreach(\$item in \$ctx.result.items)
          #if(\$item.entityType.S == "Container")
            \$util.qr(\$containers.add(\$item))
          #elseif(\$item.entityType.S == "Item")
            \$util.qr(\$items.add(\$item))
          #elseif(\$item.entityType.S == "ShoppingListItem")
            \$util.qr(\$shoppingList.add(\$item))
          #end
        #end

        {
          "containers": \$util.toJson(\$containers),
          "items": \$util.toJson(\$items),
          "shoppingList": \$util.toJson(\$shoppingList),
          "serverTimestamp": \$util.toJson(\$util.time.nowISO8601())
        }
      `),
    });

    // ============================================
    // Household / Profile Mutations (W7)
    // ============================================
    dbDataSource.createResolver("MutationCreateHouseholdResolver", {
      typeName: "Mutation",
      fieldName: "createHousehold",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$householdId = \$util.autoId())
        #set(\$now = \$util.time.nowISO8601())

        {
          "version": "2017-02-28",
          "operation": "TransactWriteItems",
          "transactItems": [
            {
              "Put": {
                "tableName": "\$ctx.stash.tableName",
                "key": {
                  "PK": { "S": "HOUSEHOLD#\$householdId" },
                  "SK": { "S": "META" }
                },
                "attributeValues": {
                  "name": { "S": \$util.toJson(\$input.name) },
                  "ownerId": { "S": \$util.toJson(\$ctx.identity.sub) },
                  "createdAt": { "S": \$util.toJson(\$now) },
                  "entityType": { "S": "Household" },
                  "_version": { "N": "1" },
                  "_lastChangedAt": { "N": \$util.time.nowTimestamp().toString() }
                }
              }
            },
            {
              "Put": {
                "tableName": "\$ctx.stash.tableName",
                "key": {
                  "PK": { "S": "HOUSEHOLD#\$householdId" },
                  "SK": { "S": "MEMBER#\$ctx.identity.sub" }
                },
                "attributeValues": {
                  "role": { "S": "owner" },
                  "joinedAt": { "S": \$util.toJson(\$now) },
                  "entityType": { "S": "HouseholdMember" }
                }
              }
            }
          ]
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "id": \$util.toJson(\$householdId),
          "name": \$util.toJson(\$input.name),
          "ownerId": \$util.toJson(\$ctx.identity.sub),
          "createdAt": \$util.toJson(\$util.time.nowISO8601())
        }
      `),
    });

    dbDataSource.createResolver("MutationInviteMemberResolver", {
      typeName: "Mutation",
      fieldName: "inviteMember",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "tableName": "\$ctx.stash.tableName",
          "key": {
            "PK": { "S": "HOUSEHOLD#\$input.householdId" },
            "SK": { "S": "INVITE#\$input.email" }
          },
          "attributeValues": {
            "email": { "S": \$util.toJson(\$input.email) },
            "invitedBy": { "S": \$util.toJson(\$ctx.identity.sub) },
            "sentAt": { "S": \$util.time.nowISO8601() },
            "entityType": { "S": "HouseholdInvite" }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        { "success": true }
      `),
    });

    // ============================================
    // Lambda data source for AI functions (Phase B)
    // ============================================
    // Phase B will create Lambda functions for:
    // - classify-food (Haiku 4.5 with prompt caching)
    // - ocr-expiry-date (Textract + Bedrock fallback)
    // Then wire them as AppSync data sources with resolvers

    // ============================================
    // CloudFront Distribution for API caching/DDoS protection
    // ============================================
    this.distribution = new cloudfront.Distribution(this, "ApiDistribution", {
      defaultBehavior: {
        origin: new origins.HttpOrigin(
          `${this.api.apiId}.appsync-api.${this.config.region}.amazonaws.com`,
          {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }
        ),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        compress: true,
      },
    });
    // Phase B: Add custom domain (api.whatsforlunch.com) and WAF rules in NetworkStack

    this.apiUrl = this.config.apiUrl;

    new cdk.CfnOutput(this, "AppSyncApiUrl", {
      value: `https://${this.api.apiId}.appsync-api.${this.config.region}.amazonaws.com/graphql`,
      description: "AppSync GraphQL API endpoint (direct)",
      exportName: `${appName}-ApiUrl-${env}`,
    });

    new cdk.CfnOutput(this, "CloudFrontApiUrl", {
      value: `https://${this.distribution.distributionDomainName}/graphql`,
      description: "AppSync GraphQL API endpoint (via CloudFront)",
      exportName: `${appName}-CloudFrontApiUrl-${env}`,
    });

    new cdk.CfnOutput(this, "AppSyncApiId", {
      value: this.api.apiId,
      description: "AppSync API ID",
      exportName: `${appName}-ApiId-${env}`,
    });
  }
}
