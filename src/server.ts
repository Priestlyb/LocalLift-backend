import "./config/env";

import app from "./app";
import { connectDB } from "./config/database";
import { startSubscriptionJob } from "./jobs/subscription.job";

/**
 * ==========================================
 * SERVER CONFIGURATION
 * ==========================================
 */

const PORT = Number(process.env.PORT) || 5000;

/**
 * ==========================================
 * ENVIRONMENT VALIDATION
 * ==========================================
 *
 * Secrets should be validated at startup,
 * but NEVER logged.
 */

const requiredEnvVariables = [
  "PAYSTACK_SECRET_KEY",
  "KORA_SECRET_KEY",
] as const;

const validateEnvironment = (): void => {
  const missingVariables =
    requiredEnvVariables.filter(
      (variable) =>
        !process.env[variable]?.trim()
    );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(
        ", "
      )}`
    );
  }

  if (
    !Number.isInteger(PORT) ||
    PORT <= 0 ||
    PORT > 65535
  ) {
    throw new Error(
      `Invalid PORT configuration: ${PORT}`
    );
  }
};

/**
 * ==========================================
 * SERVER STARTUP
 * ==========================================
 */

const startServer = async (): Promise<void> => {
  try {
    /**
     * Validate environment before
     * connecting to external services.
     */
    validateEnvironment();

    /**
     * Connect to MongoDB.
     */
    await connectDB();

    /**
     * Start scheduled subscription jobs.
     */
    startSubscriptionJob();

    /**
     * Start HTTP server.
     */
    const server = app.listen(
      PORT,
      () => {
        console.log(
          `Server running on port ${PORT}`
        );
      }
    );

    /**
     * ========================================
     * GRACEFUL SHUTDOWN
     * ========================================
     */

    const shutdown = (
      signal: string
    ): void => {
      console.log(
        `${signal} received. Shutting down server...`
      );

      server.close(() => {
        console.log(
          "HTTP server closed."
        );

        process.exit(0);
      });

      /**
       * Force shutdown if something prevents
       * the server from closing cleanly.
       */
      setTimeout(() => {
        console.error(
          "Forced shutdown after timeout."
        );

        process.exit(1);
      }, 10000).unref();
    };

    process.once(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );

    process.once(
      "SIGINT",
      () => shutdown("SIGINT")
    );
  } catch (error) {
    console.error(
      "❌ Failed to start server:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
};

void startServer();