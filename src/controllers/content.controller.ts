import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import generationService from "../services/ai-tools/generation.service";
import contentService from "../services/content/content.service";

class ContentController {
  /**
   * Generate AI content.
   */
  async generate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        type,
        businessId,
        details,
        productName,
        platform,
        tone,
        audience,
      } = req.body;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Content type is required.",
        });
      }

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: "Business ID is required.",
        });
      }

      if (!details) {
        return res.status(400).json({
          success: false,
          message: "Content details are required.",
        });
      }

      const content =
        await generationService.generate({
          userId: req.userId!,
          type,
          businessId,
          details,
          productName,
          platform,
          tone,
          audience,
        });

      return res.status(201).json({
        success: true,
        message:
          "Content generated successfully.",
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns one content item.
   */
  async getContent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const content =
        await contentService.getUserContent(
          req.userId!,
          req.params.id as string
        );

      if (!content) {
        return res.status(404).json({
          success: false,
          message:
            "Content not found.",
        });
      }

      return res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns the user's generation history.
   */
  async getHistory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const history =
        await contentService.getHistory(
          req.userId!
        );

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns paginated history.
   */
  async getHistoryPage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = Math.max(
        Number(req.query.page ?? 1),
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit ?? 20),
          1
        ),
        100
      );

      const result =
        await contentService.getHistoryPage(
          req.userId!,
          page,
          limit
        );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a content item.
   */
  async deleteContent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const content =
        await contentService.delete(
          req.userId!,
          req.params.id as string
        );

      if (!content) {
        return res.status(404).json({
          success: false,
          message:
            "Content not found.",
        });
      }

      return res.json({
        success: true,
        message:
          "Content deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns recent content.
   */
  async recent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const limit = Math.min(
        Math.max(
          Number(req.query.limit ?? 10),
          1
        ),
        100
      );

      const recent =
        await contentService.getRecent(
          limit
        );

      return res.json({
        success: true,
        data: recent,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ContentController();