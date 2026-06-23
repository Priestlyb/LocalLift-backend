import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import businessRoutes from "./routes/business.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import contentRoutes from "./routes/content.routes";
import analyticsRoutes from "./routes/analytics.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

/**
 * =========================
 * GLOBAL MIDDLEWARE
 * =========================
 */
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

/**
 * Webhook MUST come before express.json()
 */
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);

/**
 * JSON parser
 */
app.use(express.json());

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "LocalLift API Running",
  });
});

const API_PREFIX = "/api/v1";

/**
 * =========================
 * ROUTE REGISTRATION SAFETY WRAPPER
 * =========================
 * This prevents silent route failure (VERY IMPORTANT)
 */
const loadRoute = (path: string, route: any) => {
  try {
    app.use(path, route);
    console.log(`✅ Route loaded: ${path}`);
  } catch (err) {
    console.error(`❌ Failed loading route: ${path}`, err);
  }
};

/**
 * =========================
 * ROUTES
 * =========================
 */
loadRoute(`${API_PREFIX}/auth`, authRoutes);
loadRoute(`${API_PREFIX}/admin`, adminRoutes);
loadRoute(`${API_PREFIX}/business`, businessRoutes);
loadRoute(`${API_PREFIX}/subscription`, subscriptionRoutes);
loadRoute(`${API_PREFIX}/analytics`, analyticsRoutes);

// optional routes (commented safely)
//loadRoute(`${API_PREFIX}/content`, contentRoutes);
//loadRoute(`${API_PREFIX}/payments`, paymentRoutes);

/**
 * =========================
 * DEBUG ROUTES (DEV ONLY)
 * =========================
 */
if (process.env.NODE_ENV !== "production") {
  app.get("/_debug/routes", (_, res) => {
    const routes: any[] = [];

    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push({
          method: Object.keys(middleware.route.methods)[0].toUpperCase(),
          path: middleware.route.path,
        });
      } else if (middleware.name === "router") {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            routes.push({
              method: Object.keys(handler.route.methods)[0].toUpperCase(),
              path: handler.route.path,
            });
          }
        });
      }
    });

    res.json(routes);
  });

  console.log("\n📌 ROUTES LOADED SUCCESSFULLY");
}

/**
 * =========================
 * 404 HANDLER (FINAL SAFETY NET)
 * =========================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "Check API prefix (/api/v1) and route registration",
  });
});

export default app;