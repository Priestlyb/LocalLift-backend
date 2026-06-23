import { Express } from "express";

import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import businessRoutes from "./business.routes";
import subscriptionRoutes from "./subscription.routes";
import analyticsRoutes from "./analytics.routes";

export function registerRoutes(app: Express) {
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/business", businessRoutes);
  app.use("/api/v1/subscription", subscriptionRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
}