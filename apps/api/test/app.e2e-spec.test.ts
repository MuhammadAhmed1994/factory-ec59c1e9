// The package Jest regex recognizes *.spec.ts and *.test.ts, but not *.e2e-spec.ts.
// Import the task's e2e suite through a recognized test filename so the configured
// `app.e2e-spec` verification command discovers and executes it.
import './app.e2e-spec';
