const serverlessExpress = require('@vendia/serverless-express');

// Import the compiled JavaScript version from dist directory
const webApiModule = require('./dist/web-api.js');
const app = webApiModule.default || webApiModule;

if (!app) {
  throw new Error('Failed to import Express app from compiled web-api module');
}

console.log('Express app imported successfully for Lambda handler');

// Try the configure method with different options
const handler = serverlessExpress.configure({
  app: app,
  resolutionMode: 'CALLBACK'
});

// Export the Lambda handler
exports.handler = handler;