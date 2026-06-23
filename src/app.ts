import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "../src/routes/auth.routes";
import businessRoutes from "./routes/business.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import contentRoutes from "./routes/content.routes";
import analyticsRoutes from "./routes/analytics.routes";
import paymentRoutes from "./routes/payment.routes";

const app = express();

/**
 * Global middleware
 */
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

/**
 * IMPORTANT:
 * Webhook raw body MUST come BEFORE express.json()
 */
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);

/**
 * Normal JSON parsing for everything else
 */

app.use(express.json());

/**
 * Routes
 */
app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "LocalLift API Running",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);

// app.use("/api/v1/content", contentRoutes);

app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payments", paymentRoutes);

export default app;