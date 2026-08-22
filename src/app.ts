import express, {
  Request,
  Response,
  NextFunction,
} from "express";

import cors, {
  CorsOptions,
} from "cors";

import helmet from "helmet";
import morgan from "morgan";

/**
 * ==========================================
 * RATE LIMITING
 * ==========================================
 */

import {
  globalApiLimiter,
} from "./middleware/rateLimit.middleware";

/**
 * ==========================================
 * ROUTE MODULES
 * ==========================================
 */

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import businessRoutes from "./routes/business.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes";
import contentRoutes from "./routes/content.routes";
import analyticsRoutes from "./routes/analytics.routes";
import schedulerRoutes from "./routes/scheduler.routes";
import teamRoutes from "./routes/team.routes";

/**
 * ==========================================
 * BACKGROUND WORKERS
 * ==========================================
 */

import "./workers/ai.worker";

/**
 * ==========================================
 * BACKGROUND JOBS
 * ==========================================
 */

import "./jobs/cleanup.job";
import "./jobs/retryVideo.job";
import "./jobs/analytics.job";

/**
 * ==========================================
 * APPLICATION
 * ==========================================
 */

const app = express();

/**
 * ==========================================
 * ENVIRONMENT
 * ==========================================
 */

const NODE_ENV =
  process.env.NODE_ENV?.trim() ||
  "development";

const IS_PRODUCTION =
  NODE_ENV === "production";

const API_PREFIX =
  "/api/v1";

/**
 * ==========================================
 * SECURITY CONFIGURATION
 * ==========================================
 */

/**
 * Never expose Express framework
 * information through headers.
 */
app.disable("x-powered-by");

/**
 * Trust exactly one reverse proxy in
 * production.
 *
 * This is appropriate for deployments
 * where the application sits behind a
 * single proxy/load balancer.
 */
app.set(
  "trust proxy",
  1
);

/**
 * ==========================================
 * CORS
 * ==========================================
 *
 * Only explicitly configured origins
 * are allowed.
 */

const configuredClientUrls =
  process.env.CLIENT_URL
    ?.split(",")
    .map((url) =>
      url.trim()
    )
    .filter(Boolean) ?? [];

const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
];

const allowedOrigins = IS_PRODUCTION
  ? configuredClientUrls
  : [
    ...new Set([
      ...configuredClientUrls,
      ...developmentOrigins,
    ]),
  ];

/**
 * In production, fail startup if no
 * frontend origin has been configured.
 *
 * This prevents accidentally deploying
 * an API with an incomplete CORS policy.
 */
if (
  IS_PRODUCTION &&
  allowedOrigins.length === 0
) {
  throw new Error(
    "CLIENT_URL must be configured in production."
  );
}

const corsOptions: CorsOptions = {
  origin: (
    origin,
    callback
  ) => {
    /**
     * Requests without an Origin header
     * can come from:
     *
     * - Mobile/native applications
     * - Server-to-server requests
     * - CLI tools
     * - Postman
     *
     * These are not browser CORS requests.
     */
    if (!origin) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.includes(origin)
    ) {
      return callback(
        null,
        true
      );
    }

    return callback(
      new Error(
        "CORS origin not allowed"
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Idempotency-Key",
  ],

  /**
   * Authorization uses Bearer tokens,
   * so browser cookies are not required.
   */
  credentials: false,

  /**
   * Cache browser preflight responses.
   */
  maxAge: 86400,

  /**
   * Do not expose unnecessary headers.
   */
  exposedHeaders: [],
};

/**
 * Apply CORS globally.
 *
 * IMPORTANT:
 *
 * Do NOT add:
 *
 * app.options("*", ...)
 *
 * Newer Express/path-to-regexp versions
 * reject "*" as a route pattern.
 *
 * The cors middleware handles preflight
 * requests automatically.
 */
app.use(
  cors(corsOptions)
);

/**
 * ==========================================
 * SECURITY HEADERS
 * ==========================================
 */

app.use(
  helmet({
    /**
     * Prevent MIME sniffing.
     */
    noSniff: true,

    /**
     * Prevent clickjacking.
     */
    frameguard: {
      action: "deny",
    },

    /**
     * Control referrer information.
     */
    referrerPolicy: {
      policy:
        "strict-origin-when-cross-origin",
    },

    /**
     * Disable DNS prefetching.
     */
    dnsPrefetchControl: {
      allow: false,
    },

    /**
     * Restrict cross-origin resource loading.
     */
    crossOriginResourcePolicy: {
      policy: "same-site",
    },

    /**
     * HSTS should only be enabled when
     * the application is definitely served
     * through HTTPS.
     */
    strictTransportSecurity:
      IS_PRODUCTION
        ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
        : false,
  })
);

/**
 * ==========================================
 * HTTP LOGGING
 * ==========================================
 */

app.use(
  morgan(
    IS_PRODUCTION
      ? "combined"
      : "dev"
  )
);

/**
 * ==========================================
 * PAYMENT WEBHOOK
 * ==========================================
 *
 * IMPORTANT:
 *
 * This route MUST receive the raw body
 * before express.json() processes it.
 *
 * Payment providers use the raw payload
 * to verify webhook signatures.
 */

app.use(
  `${API_PREFIX}/payments/webhook`,
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

/**
 * ==========================================
 * JSON BODY PARSER
 * ==========================================
 */

app.use(
  express.json({
    limit: "1mb",
    strict: true,
  })
);

/**
 * ==========================================
 * URL-ENCODED BODY PARSER
 * ==========================================
 */

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
    parameterLimit: 100,
  })
);

/**
 * ==========================================
 * GLOBAL API RATE LIMITER
 * ==========================================
 */

app.use(
  API_PREFIX,
  globalApiLimiter
);

/**
 * ==========================================
 * HEALTH CHECKS
 * ==========================================
 *
 * Keep these outside the API rate limiter
 * so deployment platforms and monitoring
 * systems can access them reliably.
 */

/**
 * Root endpoint.
 *
 * Do not expose NODE_ENV here.
 */
app.get(
  "/",
  (
    _req: Request,
    res: Response
  ) => {
    return res.status(200).json({
      success: true,
      message:
        "LocalLift API Running",
    });
  }
);

/**
 * Basic health endpoint.
 */
app.get(
  "/health",
  (
    _req: Request,
    res: Response
  ) => {
    return res.status(200).json({
      success: true,
      status: "healthy",
    });
  }
);

/**
 * ==========================================
 * API ROUTES
 * ==========================================
 *
 * Register routes directly.
 *
 * This makes startup failures explicit
 * instead of swallowing route errors.
 */

app.use(
  `${API_PREFIX}/auth`,
  authRoutes
);

app.use(
  `${API_PREFIX}/admin`,
  adminRoutes
);

app.use(
  `${API_PREFIX}/business`,
  businessRoutes
);

app.use(
  `${API_PREFIX}/subscription`,
  subscriptionRoutes
);

app.use(
  `${API_PREFIX}/payments`,
  paymentRoutes
);

app.use(
  `${API_PREFIX}/content`,
  contentRoutes
);

app.use(
  `${API_PREFIX}/analytics`,
  analyticsRoutes
);

app.use(
  `${API_PREFIX}/scheduler`,
  schedulerRoutes
);

app.use(
  `${API_PREFIX}/team`,
  teamRoutes
);

/**
 * ==========================================
 * DEVELOPMENT DEBUG ROUTES
 * ==========================================
 *
 * NEVER expose these in production.
 */

if (!IS_PRODUCTION) {
  app.get(
    "/_debug/routes",
    (
      _req: Request,
      res: Response
    ) => {
      const routes: Array<{
        method: string;
        path: string;
      }> = [];

      /**
       * Express internals are not part of
       * the public TypeScript API.
       *
       * This route is development-only,
       * so accessing the internal router
       * is acceptable here.
       */
      const routerStack =
        (
          app as unknown as {
            _router?: {
              stack?: any[];
            };
          }
        )._router?.stack ?? [];

      for (
        const middleware of routerStack
      ) {
        if (
          middleware.route
        ) {
          const methods =
            Object.keys(
              middleware.route.methods
            );

          for (
            const method of methods
          ) {
            routes.push({
              method:
                method.toUpperCase(),
              path:
                middleware.route.path,
            });
          }

          continue;
        }

        if (
          middleware.name ===
          "router"
        ) {
          const stack =
            middleware.handle
              ?.stack ?? [];

          for (
            const handler of stack
          ) {
            if (
              handler.route
            ) {
              const methods =
                Object.keys(
                  handler.route.methods
                );

              for (
                const method of methods
              ) {
                routes.push({
                  method:
                    method.toUpperCase(),
                  path:
                    handler.route.path,
                });
              }
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        routes,
      });
    }
  );

  console.log(
    "📌 Development debug routes enabled."
  );
}

/**
 * ==========================================
 * 404 HANDLER
 * ==========================================
 */

app.use(
  (
    req: Request,
    res: Response
  ) => {
    /**
     * Never expose the requested URL
     * in production responses.
     */
    if (IS_PRODUCTION) {
      return res.status(404).json({
        success: false,
        message:
          "The requested resource was not found.",
      });
    }

    return res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
      hint:
        "Check API prefix (/api/v1) and route registration.",
    });
  }
);

/**
 * ==========================================
 * GLOBAL ERROR HANDLER
 * ==========================================
 *
 * MUST remain the final middleware.
 */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    /**
     * Log errors server-side.
     *
     * Avoid returning these details to
     * clients in production.
     */
    if (error instanceof Error) {
      console.error(
        "[GLOBAL ERROR]",
        error.message
      );

      if (!IS_PRODUCTION) {
        console.error(
          error.stack
        );
      }
    } else {
      console.error(
        "[GLOBAL ERROR]",
        error
      );
    }

    /**
     * CORS error.
     */
    if (
      error instanceof Error &&
      error.message ===
      "CORS origin not allowed"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Origin is not allowed.",
      });
    }

    /**
     * Invalid JSON.
     */
    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON payload.",
      });
    }

    /**
     * Request body too large.
     */
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (
        error as {
          type?: string;
        }
      ).type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large.",
      });
    }

    /**
     * Production response.
     *
     * Never expose:
     *
     * - stack traces
     * - MongoDB errors
     * - JWT errors
     * - filesystem paths
     * - internal service information
     */
    if (IS_PRODUCTION) {
      return res.status(500).json({
        success: false,
        message:
          "Internal server error.",
      });
    }

    /**
     * Development response.
     */
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal server error.",
    });
  }
);

/**
 * ==========================================
 * EXPORT APPLICATION
 * ==========================================
 */

export default app;