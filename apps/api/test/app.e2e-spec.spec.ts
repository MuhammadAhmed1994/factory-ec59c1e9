// Jest's current testRegex recognizes *.spec.ts but not the existing *.e2e-spec.ts name.
// Import the owned e2e suite so the task's app.e2e-spec pattern discovers and executes it.
import './app.e2e-spec';
