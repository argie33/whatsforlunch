/**
 * Export Data Handler (CDK entry point)
 * Triggered by AppSync mutation `requestDataExport`.
 * Exports all household data to S3 and returns a pre-signed URL.
 * Actual implementation: services/export-data/src/index.ts
 */
exports.handler = async (event) => {
  const { handler } = await import('/var/task/index.mjs');
  return handler(event);
};
