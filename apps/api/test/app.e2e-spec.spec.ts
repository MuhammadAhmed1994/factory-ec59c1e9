// Jest's configured testRegex matches *.spec.ts but not the requested *.e2e-spec.ts name.
// Import the task-owned e2e suite through a matching filename so the registered
// verification command executes it without changing package-level test config.
import './app.e2e-spec';
