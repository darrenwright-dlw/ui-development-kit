const serverlessExpress = require('@vendia/serverless-express');

// Import the compiled JavaScript version from dist directory
const webApiModule = require('./dist/web-api.js');
const app = webApiModule.default || webApiModule;

if (!app) {
  throw new Error('Failed to import Express app from compiled web-api module');
}

console.log('Express app imported successfully for Lambda handler');
console.log('App type:', typeof app);
console.log('App constructor:', app.constructor ? app.constructor.name : 'no constructor');
console.log('App listen method exists:', typeof app.listen);

// Export the Lambda handler
exports.handler = serverlessExpress(app);