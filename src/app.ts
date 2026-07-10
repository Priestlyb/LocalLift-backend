import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/**
 * Route modules
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
 * Background workers
 */
import "./workers/ai.worker";

/**
 * Background jobs
 */
import "./jobs/cleanup.job";
import "./jobs/retryVideo.job";
import "./jobs/analytics.job";

const app = express();

/**
 * Global middleware
 */
app.use(cors());

app.use(helmet());

app.use(morgan("dev"));

/**
 * Payment webhook must receive the raw body.
 */
app.use(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
  })
);

/**
 * Parse JSON for every other route.
 */
app.use(express.json());

/**
 * Health check
 */
app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "LocalLift API Running",
  });
});

const API_PREFIX = "/api/v1";

/**
 * Safely register routes.
 */
const loadRoute = (
  path: string,
  router: express.Router
) => {
  try {
    app.use(path, router);
  } catch (error) {
    console.error(
      `❌ Failed loading route: ${path}`,
      error
    );
  }
};

/**
 * API Routes
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
 * Debug endpoint
 */
if (
  process.env.NODE_ENV !==
  "production"
) {
  app.get(
    "/_debug/routes",
    (_, res) => {
      const routes: any[] = [];

      const stack =
        (app as any)._router?.stack ??
        [];

      stack.forEach(
        (middleware: any) => {
          if (
            middleware.route
          ) {
            routes.push({
              method: Object.keys(
                middleware.route
                  .methods
              )[0].toUpperCase(),

              path: middleware.route
                .path,
            });

            return;
          }

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
                      )[0].toUpperCase(),

                    path: handler
                      .route.path,
                  });
                }
              }
            );
          }
        }
      );

      res.json(routes);
    }
  );

  console.log(
    "\n📌 ROUTES LOADED SUCCESSFULLY\n"
  );
}

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,

    message: `Route not found: ${req.method} ${req.originalUrl}`,

    hint: "Check API prefix (/api/v1) and route registration.",
  });
});

export default app;