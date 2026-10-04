import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import "dotenv/config";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    "https://bc3304e08d8a6083053dbe7ba1b8b3d9@o4508023681581056.ingest.us.sentry.io/4512136465940480",
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
});
