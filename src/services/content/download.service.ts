import Content, {
  IContent,
} from "../../models/Content";

import featureService from "../subscription/feature.service";
import usageService from "../subscription/usage.service";

class DownloadService {
  /**
   * Returns a downloadable version
   * of generated content.
   */
  async download(options: {
    contentId: string;
    userId: string;
    plan: "FREE" | "STARTER" | "GROWTH" | "PRO";
    status:
      | "ACTIVE"
      | "EXPIRED"
      | "CANCELLED";
  }): Promise<IContent> {
    const {
      contentId,
      userId,
      plan,
      status,
    } = options;

    const content =
      await Content.findOne({
        _id: contentId,
        user: userId,
      });

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    if (
      !featureService.hasAccess({
        plan,
        status,
      })
    ) {
      throw new Error(
        "Your subscription is inactive."
      );
    }

    await usageService.incrementDownloadUsage(
      userId
    );

    return content;
  }

  /**
   * Returns the maximum download
   * resolution for the user's plan.
   */
  getResolution(
    plan:
      | "FREE"
      | "STARTER"
      | "GROWTH"
      | "PRO"
  ) {
    return featureService.getMaxResolution(
      plan
    );
  }

  /**
   * Determines whether a watermark
   * should be applied.
   */
  requiresWatermark(
    plan:
      | "FREE"
      | "STARTER"
      | "GROWTH"
      | "PRO"
  ) {
    return plan === "FREE";
  }
}

export default new DownloadService();