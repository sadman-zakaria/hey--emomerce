import serverless from "serverless-http";
import app from "../../src/app.js";

// Netlify Function entry point. Requests to /api/* are redirected here by
// netlify.toml.
export const handler = serverless(app);
