// Jest's package testRegex requires a final `.spec.ts`, while the task's verify
// command targets `app.e2e-spec`; importing the requested suite preserves both.
import './app.e2e-spec';
