import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import analyticsService from "../services/analytics/analytics.service";
import reportService from "../services/analytics/report.service";
import insightService from "../services/analytics/insight.service";

interface BusinessParams {
  businessId: string;
}

interface ContentParams {
  contentId: string;
}

class AnalyticsController {
  /**
   * Dashboard summary.
   */
  async getSummary(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const summary =
        await analyticsService.getSummary(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns analytics for a business.
   */
  async getBusinessAnalytics(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const analytics =
        await analyticsService.getBusinessAnalytics(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns analytics for a content item.
   */
  async getContentAnalytics(
    req: AuthRequest & {
      params: ContentParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const analytics =
        await analyticsService.getContentAnalytics(
          req.userId,
          req.params.contentId
        );

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Weekly analytics report.
   */
  async getWeeklyReport(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const report =
        await reportService.getWeeklyReport(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Monthly analytics report.
   */
  async getMonthlyReport(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const report =
        await reportService.getMonthlyReport(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Platform breakdown.
   */
  async getPlatformBreakdown(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const breakdown =
        await reportService.getPlatformBreakdown(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: breakdown,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Top performing posts.
   */
  async getTopPerformingContent(
    req: AuthRequest & {
      params: BusinessParams;
      query: {
        limit?: string;
      };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const parsedLimit = Number(req.query.limit ?? 10);

      const limit = Number.isFinite(parsedLimit)
        ? Math.max(1, Math.min(parsedLimit, 100))
        : 10;

      const content =
        await reportService.getTopPerformingContent(
          req.userId,
          req.params.businessId,
          limit
        );

      return res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Posting activity.
   */
  async getPostingActivity(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const activity =
        await reportService.getPostingActivity(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Business insights.
   */
  async getInsights(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const insights =
        await insightService.generateInsights(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Best performing platform.
   */
  async getBestPlatform(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const platform =
        await insightService.getBestPlatform(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: platform,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Best performing content.
   */
  async getBestContent(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const content =
        await insightService.getBestContent(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Overall engagement score.
   */
  async getEngagementScore(
    req: AuthRequest & {
      params: BusinessParams;
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const score =
        await insightService.getEngagementScore(
          req.userId,
          req.params.businessId
        );

      return res.json({
        success: true,
        data: {
          engagementScore: score,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsController();