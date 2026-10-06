// The package Jest regex recognizes .test.ts but not the standard .e2e-spec.ts suffix.
// Import the e2e suite from a matching filename so the registered app.e2e-spec check runs it.
import './app.e2e-spec';
