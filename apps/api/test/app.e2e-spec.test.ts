// Jest's configured testRegex accepts .test.ts files but not Nest's .e2e-spec.ts naming.
// Import the suite so `jest app.e2e-spec` discovers and executes it.
import './app.e2e-spec';
