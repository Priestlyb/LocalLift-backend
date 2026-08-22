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
  process.env.NODE_ENV ||
  "development";

const IS_PRODUCTION =
  NODE_ENV === "production";

const API_PREFIX =
  "/api/v1";

/**
 * ==========================================
 * SECURITY: REMOVE EXPRESS FINGERPRINT
 * ==========================================
 *
 * Prevents Express from exposing:
 *
 * X-Powered-By: Express
 */

app.disable("x-powered-by");

/**
 * ==========================================
 * SECURITY: TRUST PROXY
 * ==========================================
 *
 * Required when running behind a reverse
 * proxy such as:
 *
 * - Render
 * - Railway
 * - Fly.io
 * - Nginx
 * - Cloudflare
 *
 * This allows Express to correctly identify
 * the original client IP.
 *
 * IMPORTANT:
 *
 * Only trust the number of proxy hops that
 * actually exist in your deployment.
 *
 * "1" is appropriate for a single reverse
 * proxy in front of the application.
 */

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", 1);
}

/**
 * ==========================================
 * SECURITY: CORS
 * ==========================================
 *
 * NEVER use:
 *
 * cors()
 *
 * in production for an authenticated API.
 *
 * Only allow known frontend origins.
 *
 * Configure:
 *
 * CLIENT_URL=https://your-frontend.com
 *
 * If you have multiple frontend applications,
 * you can provide:
 *
 * CLIENT_URL=https://app.example.com,https://admin.example.com
 */

const configuredClientUrls =
  process.env.CLIENT_URL
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean) ?? [];

/**
 * Development fallback.
 *
 * This allows local development without
 * requiring CLIENT_URL to be configured.
 */
const allowedOrigins =
  IS_PRODUCTION
    ? configuredClientUrls
    : [
      ...configuredClientUrls,
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8081",
    ];

const corsOptions: CorsOptions = {
  origin: (
    origin,
    callback
  ) => {
    /**
     * Allow requests without an Origin header.
     *
     * This is useful for:
     *
     * - Server-to-server requests
     * - Mobile applications
     * - Postman
     * - Native clients
     *
     * If your API is strictly browser-only,
     * you can change this behavior.
     */
    if (!origin) {
      return callback(null, true);
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

  /**
   * Only allow HTTP methods actually
   * required by the API.
   */
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  /**
   * Explicitly define allowed request headers.
   */
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Idempotency-Key",
  ],

  /**
   * Allow Authorization headers and
   * other credentials when required.
   *
   * NOTE:
   *
   * If authentication remains purely
   * Authorization: Bearer <token>, you
   * generally don't need cookies.
   */
  credentials: false,

  /**
   * Cache preflight responses.
   */
  maxAge: 86400,
};

/**
 * Apply CORS.
 */
app.use(cors(corsOptions));

/**
 * Handle OPTIONS preflight requests.
 */
app.options(
  "*",
  cors(corsOptions)
);

/**
 * ==========================================
 * SECURITY HEADERS
 * ==========================================
 *
 * Helmet sets a collection of security
 * related HTTP headers.
 */

app.use(
  helmet({
    /**
     * Prevent MIME type sniffing.
     */
    noSniff: true,

    /**
     * Prevent browsers from loading the API
     * inside frames.
     */
    frameguard: {
      action: "deny",
    },

    /**
     * Prevent browsers from sending the
     * full referrer to less-secure origins.
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
     * Restrict browser cross-origin behavior.
     */
    crossOriginResourcePolicy: {
      policy: "same-site",
    },

    /**
     * Only enable HSTS in production.
     *
     * HSTS tells browsers to use HTTPS.
     */
    strictTransportSecurity:
      IS_PRODUCTION
        ? {
          maxAge:
            31536000,
          includeSubDomains:
            true,
          preload:
            true,
        }
        : false,
  })
);

/**
 * ==========================================
 * HTTP LOGGING
 * ==========================================
 *
 * Development:
 *
 *     dev
 *
 * Production:
 *
 *     combined
 *
 * Production logs should eventually be
 * forwarded to a centralized logging service.
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
 * Payment providers may require the ORIGINAL
 * raw request body to verify their signature.
 *
 * Therefore this MUST be registered BEFORE
 * express.json().
 *
 * DO NOT move this below express.json().
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
 *
 * Limit request body size.
 *
 * This helps prevent attackers from sending
 * extremely large JSON payloads.
 *
 * 1 MB is a reasonable default for most
 * authentication/business APIs.
 *
 * If an endpoint genuinely needs larger
 * payloads, configure a route-specific parser.
 */

app.use(
  express.json({
    limit: "1mb",

    /**
     * Strict JSON parsing.
     *
     * Only valid JSON objects/arrays are
     * accepted.
     */
    strict: true,
  })
);

/**
 * ==========================================
 * URL-ENCODED BODY PARSER
 * ==========================================
 *
 * Limit URL-encoded request bodies as well.
 */

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",

    /**
     * Prevent extremely large numbers of
     * parameters from being submitted.
     */
    parameterLimit: 100,
  })
);

/**
 * ==========================================
 * GLOBAL API RATE LIMITER
 * ==========================================
 *
 * Applies to every API route.
 *
 * Sensitive endpoints additionally have their
 * own stricter rate limiters.
 */

app.use(
  API_PREFIX,
  globalApiLimiter
);

/**
 * ==========================================
 * HEALTH CHECK
 * ==========================================
 *
 * Keep the health endpoint outside the global
 * API limiter so infrastructure monitoring
 * isn't unnecessarily rate limited.
 */

app.get(
  "/",
  (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message:
        "LocalLift API Running",
      environment:
        IS_PRODUCTION
          ? "production"
          : "development",
    });
  }
);

/**
 * ==========================================
 * API HEALTH CHECK
 * ==========================================
 *
 * Useful for deployment platforms and
 * monitoring systems.
 *
 * Keep the response minimal.
 */

app.get(
  "/health",
  (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      status: "healthy",
    });
  }
);

/**
 * ==========================================
 * ROUTE LOADER
 * ==========================================
 *
 * Safely register route modules.
 */

const loadRoute = (
  path: string,
  router: express.Router
) => {
  try {
    app.use(
      path,
      router
    );
  } catch (error) {
    console.error(
      `❌ Failed loading route: ${path}`,
      error
    );

    /**
     * Fail fast in production.
     *
     * A production API should not start
     * successfully if an essential route
     * failed to load.
     */
    if (IS_PRODUCTION) {
      throw error;
    }
  }
};

/**
 * ==========================================
 * API ROUTES
 * ==========================================
 */

loadRoute(
  `${API_PREFIX}/auth`,
  authRoutes
);

loadRoute(
  `${API_PREFIX}/admin`,
  adminRoutes
);

loadRoute(
  `${API_PREFIX}/business`,
  businessRoutes
);

loadRoute(
  `${API_PREFIX}/subscription`,
  subscriptionRoutes
);

loadRoute(
  `${API_PREFIX}/payments`,
  paymentRoutes
);

loadRoute(
  `${API_PREFIX}/content`,
  contentRoutes
);

loadRoute(
  `${API_PREFIX}/analytics`,
  analyticsRoutes
);

loadRoute(
  `${API_PREFIX}/scheduler`,
  schedulerRoutes
);

loadRoute(
  `${API_PREFIX}/team`,
  teamRoutes
);

/**
 * ==========================================
 * DEBUG ROUTES
 * ==========================================
 *
 * NEVER expose these in production.
 */

if (!IS_PRODUCTION) {
  app.get(
    "/_debug/routes",
    (_req, res) => {
      const routes: Array<{
        method: string;
        path: string;
      }> = [];

      const stack =
        (app as any)._router
          ?.stack ?? [];

      stack.forEach(
        (middleware: any) => {
          /**
           * Direct route.
           */
          if (
            middleware.route
          ) {
            routes.push({
              method:
                Object.keys(
                  middleware
                    .route
                    .methods
                )[0]
                  .toUpperCase(),

              path:
                middleware
                  .route
                  .path,
            });

            return;
          }

          /**
           * Router middleware.
           */
          if (
            middleware.name ===
            "router"
          ) {
            middleware.handle.stack.forEach(
              (
                handler: any
              ) => {
                if (
                  handler.route
                ) {
                  routes.push({
                    method:
                      Object.keys(
                        handler
                          .route
                          .methods
                      )[0]
                        .toUpperCase(),

                    path:
                      handler
                        .route
                        .path,
                  });
                }
              }
            );
          }
        }
      );

      return res.status(200).json({
        success: true,
        routes,
      });
    }
  );

  console.log(
    "\n📌 ROUTES LOADED SUCCESSFULLY\n"
  );
}

/**
 * ==========================================
 * 404 HANDLER
 * ==========================================
 *
 * Do not expose the complete requested URL
 * in production.
 *
 * This prevents unnecessary information
 * disclosure through API responses/logs.
 */

app.use(
  (
    req: Request,
    res: Response
  ) => {
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
 * This MUST be the final middleware.
 *
 * Never expose raw errors, stack traces,
 * database errors, JWT errors, or internal
 * implementation details to production clients.
 */

app.use(
  (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    /**
     * Log the actual error server-side.
     *
     * Your production logging service should
     * eventually capture this instead of relying
     * only on console.error.
     */
    console.error(
      "[GLOBAL ERROR]",
      error
    );

    /**
     * Handle CORS errors.
     */
    if (
      error?.message ===
      "CORS origin not allowed"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Origin is not allowed.",
      });
    }

    /**
     * Handle JSON parsing errors.
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
     * Handle request body too large.
     */
    if (
      error?.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large.",
      });
    }

    /**
     * Never expose internal errors
     * in production.
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
     *
     * Useful while debugging locally.
     */
    return res.status(500).json({
      success: false,
      message:
        error?.message ??
        "Internal server error.",
    });
  }
);

/**
 * ==========================================
 * EXPORT APPLICATION
 * ==========================================
 */

export default app;