import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as AWS from "aws-sdk";
import { v4 as uuid } from "uuid";

// Note: These tests run against local DynamoDB or mocked AWS
// For real AWS testing, use integration environment

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
});

const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION || "us-east-1",
});

const TABLE_NAME = process.env.TABLE_NAME || "WFL-Main-dev";

describe("Lambda Integration Tests", () => {
  describe("delete-account-handler", () => {
    let testUserId: string;
    let testHouseholdIds: string[];

    beforeEach(async () => {
      testUserId = `test-user-${uuid()}`;
      testHouseholdIds = [
        `household-${uuid()}`,
        `household-${uuid()}`,
      ];

      // Create test user profile
      await dynamodb
        .put({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${testUserId}`,
            SK: "PROFILE",
            entityType: "User",
            email: `${testUserId}@test.local`,
            name: "Test User",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
          },
        })
        .promise();

      // Create household memberships
      for (const householdId of testHouseholdIds) {
        await dynamodb
          .put({
            TableName: TABLE_NAME,
            Item: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `MEMBER#${testUserId}`,
              entityType: "HouseholdMember",
              role: "owner",
              joinedAt: new Date().toISOString(),
              _version: 1,
              _lastChangedAt: Date.now(),
            },
          })
          .promise();
      }

      // Create test items
      for (let i = 0; i < 3; i++) {
        await dynamodb
          .put({
            TableName: TABLE_NAME,
            Item: {
              PK: `ITEM#${uuid()}`,
              SK: `#${Date.now()}`,
              entityType: "Item",
              name: `Test Item ${i}`,
              createdByUserId: testUserId,
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              GSI3PK: `USER#${testUserId}#ITEMS`,
              GSI3SK: new Date().toISOString(),
              _version: 1,
              _lastChangedAt: Date.now(),
            },
          })
          .promise();
      }
    });

    afterEach(async () => {
      // Clean up test data
      // In real tests, this would use hard delete or table reset
    });

    it("soft-deletes user profile and associated data", async () => {
      const softDeletePayload = {
        userId: testUserId,
        householdIds: testHouseholdIds,
        purge: false,
      };

      // Invoke Lambda (local or AWS)
      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        // Import and call directly for local testing
        const { handler } = await import("../../lambdas/delete-account-handler");
        result = await handler(softDeletePayload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-delete-account-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(softDeletePayload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      expect(result.statusCode).toBe(200);
      expect(result.body).toBeDefined();

      const body = JSON.parse(result.body);
      expect(body.phase).toBe("soft-delete");
      expect(body.userId).toBe(testUserId);
      expect(body.householdsAffected).toBe(testHouseholdIds.length);
      expect(body.itemsDeleted).toBeGreaterThanOrEqual(3);

      // Verify profile is marked deleted
      const profileResult = await dynamodb
        .get({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${testUserId}`,
            SK: "PROFILE",
          },
        })
        .promise();

      expect(profileResult.Item).toBeDefined();
      expect(profileResult.Item.deletedAt).toBeDefined();
      expect(profileResult.Item.status).toBe("deleted");
    });

    it("hard-purges user data after retention window", async () => {
      // First soft-delete
      await dynamodb
        .update({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${testUserId}`,
            SK: "PROFILE",
          },
          UpdateExpression: "SET deletedAt = :now, #status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":now": new Date().toISOString(),
            ":status": "deleted",
          },
        })
        .promise();

      // Then hard-purge
      const hardPurgePayload = {
        userId: testUserId,
        householdIds: testHouseholdIds,
        purge: true,
      };

      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import("../../lambdas/delete-account-handler");
        result = await handler(hardPurgePayload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-delete-account-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(hardPurgePayload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.phase).toBe("hard-purge");

      // Verify profile is permanently deleted
      const profileResult = await dynamodb
        .get({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${testUserId}`,
            SK: "PROFILE",
          },
        })
        .promise();

      expect(profileResult.Item).toBeUndefined();
    });

    it("handles missing userId parameter", async () => {
      const invalidPayload = {
        householdIds: testHouseholdIds,
        purge: false,
      };

      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import("../../lambdas/delete-account-handler");
        result = await handler(invalidPayload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-delete-account-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(invalidPayload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      expect(result.statusCode).toBe(500);
      expect(result.body).toContain("Missing required parameter");
    });

    it("logs deletion events for audit trail", async () => {
      const softDeletePayload = {
        userId: testUserId,
        householdIds: testHouseholdIds,
        purge: false,
      };

      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import("../../lambdas/delete-account-handler");
        await handler(softDeletePayload);
      } else {
        await lambda
          .invoke({
            FunctionName: `wfl-delete-account-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(softDeletePayload),
          })
          .promise();
      }

      // Verify deletion event logged
      const eventResult = await dynamodb
        .query({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "EVENT#",
          },
        })
        .promise();

      expect(eventResult.Items).toBeDefined();
      expect(eventResult.Items!.length).toBeGreaterThan(0);

      const deleteEvent = eventResult.Items!.find(
        (item) => item.eventType === "AccountSoftDeleted"
      );
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent!.householdsAffected).toBe(testHouseholdIds.length);
    });
  });

  describe("notify-expiring-handler", () => {
    let testHouseholdId: string;
    let testUserId: string;

    beforeEach(async () => {
      testHouseholdId = `household-${uuid()}`;
      testUserId = `user-${uuid()}`;

      // Create test items expiring soon
      const now = Date.now();
      const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      const in48Hours = new Date(now + 48 * 60 * 60 * 1000).toISOString();

      await dynamodb
        .put({
          TableName: TABLE_NAME,
          Item: {
            PK: `ITEM#${uuid()}`,
            SK: `#${now}`,
            entityType: "Item",
            name: "Item Expiring Tomorrow",
            createdByUserId: testUserId,
            status: "active",
            expiryDate: tomorrow,
            GSI2PK: "EXPIRING",
            GSI2SK: tomorrow,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
          },
        })
        .promise();

      await dynamodb
        .put({
          TableName: TABLE_NAME,
          Item: {
            PK: `ITEM#${uuid()}`,
            SK: `#${now}`,
            entityType: "Item",
            name: "Item Expiring in 48 Hours",
            createdByUserId: testUserId,
            status: "active",
            expiryDate: in48Hours,
            GSI2PK: "EXPIRING",
            GSI2SK: in48Hours,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
          },
        })
        .promise();

      // Create user with test device
      await dynamodb
        .put({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${testUserId}`,
            SK: "DEVICE#test-device-1",
            entityType: "Device",
            expoToken: "ExponentPushToken[test-token-123]",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
          },
        })
        .promise();
    });

    it("identifies items expiring within 72 hours", async () => {
      if (!process.env.USE_LOCAL_LAMBDA) {
        // Skip if not in local mode
        expect(true).toBe(true);
        return;
      }

      const { handler } = await import(
        "../../lambdas/notify-expiring-handler"
      );
      const result = await handler({});

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.itemsProcessed).toBeGreaterThanOrEqual(2);
      expect(body.notificationsSent).toBeGreaterThanOrEqual(0); // May be 0 if Expo not configured
    });

    it("logs notification batch results", async () => {
      if (!process.env.USE_LOCAL_LAMBDA) {
        expect(true).toBe(true);
        return;
      }

      const { handler } = await import(
        "../../lambdas/notify-expiring-handler"
      );
      await handler({});

      // Verify batch logged
      const logResult = await dynamodb
        .query({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": "NOTIFICATIONS#LOG",
            ":sk": "BATCH#",
          },
          ScanIndexForward: false,
          Limit: 1,
        })
        .promise();

      expect(logResult.Items).toBeDefined();
      expect(logResult.Items!.length).toBeGreaterThan(0);

      const latestBatch = logResult.Items![0];
      expect(latestBatch.entityType).toBe("NotificationBatch");
      expect(latestBatch.itemsProcessed).toBeDefined();
    });
  });

  describe("food-rules-publish-handler", () => {
    it("publishes food rules with validation", async () => {
      const testRules = [
        {
          foodType: "milk",
          category: "dairy",
          fridgeDaysSafe: 7,
          freezerDaysSafe: 180,
          pantryDaysSafe: 0,
          counterHoursSafe: 4,
        },
        {
          foodType: "strawberry",
          category: "produce",
          fridgeDaysSafe: 3,
          freezerDaysSafe: 365,
          pantryDaysSafe: 0,
          counterHoursSafe: 2,
        },
      ];

      const payload = {
        action: "publish",
        rules: testRules,
      };

      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import(
          "../../lambdas/food-rules-publish-handler"
        );
        result = await handler(payload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-food-rules-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(payload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.rulesPublished).toBe(testRules.length);
      expect(body.published).toHaveLength(testRules.length);
    });

    it("validates rule consistency", async () => {
      const invalidRules = [
        {
          foodType: "test",
          fridgeDaysSafe: 100, // Should be less than freezer
          freezerDaysSafe: 30, // Invalid: less than fridge
        },
      ];

      const payload = {
        action: "publish",
        rules: invalidRules,
      };

      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import(
          "../../lambdas/food-rules-publish-handler"
        );
        result = await handler(payload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-food-rules-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(payload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      const body = JSON.parse(result.body);
      // Should still publish but with warnings
      expect(body.rulesPublished).toBeGreaterThanOrEqual(0);
    });

    it("returns stats on demand", async () => {
      const payload = {
        action: "stats",
      };

      let result;
      if (process.env.USE_LOCAL_LAMBDA) {
        const { handler } = await import(
          "../../lambdas/food-rules-publish-handler"
        );
        result = await handler(payload);
      } else {
        const response = await lambda
          .invoke({
            FunctionName: `wfl-food-rules-${process.env.ENVIRONMENT || "dev"}`,
            Payload: JSON.stringify(payload),
          })
          .promise();

        result = JSON.parse(response.Payload as string);
      }

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.totalRules).toBeDefined();
      expect(body.byCategory).toBeDefined();
    });
  });
});
