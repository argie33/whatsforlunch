/**
 * RevenueCat Webhook Handler (CDK entry point)
 * HTTPS endpoint receiving RevenueCat subscription lifecycle events.
 * Updates subscriptionTier in DynamoDB.
 * Actual implementation: services/revenuecat-webhook/src/index.ts
 */
exports.handler = async (event) => {
  const { handler } = await import('/var/task/index.mjs');
  return handler(event);
};
