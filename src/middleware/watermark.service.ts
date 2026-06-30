import sharp from "sharp";

import { PlanKey } from "../types/subscription.types";
import entitlementService from "../services/subscription/entitlement.service";

class WatermarkService {
  /**
   * Returns whether images generated under
   * this plan should contain a watermark.
   */
  shouldApplyWatermark(
    plan: PlanKey
  ): boolean {
    return entitlementService.hasFeature(
      plan,
      "watermark"
    );
  }

  /**
   * Applies a watermark to an image buffer.
   *
   * @param imageBuffer Generated image.
   * @param watermarkBuffer PNG watermark.
   */
  async applyWatermark(
    imageBuffer: Buffer,
    watermarkBuffer: Buffer
  ): Promise<Buffer> {
    const metadata =
      await sharp(imageBuffer).metadata();

    const imageWidth =
      metadata.width ?? 1024;

    const imageHeight =
      metadata.height ?? 1024;

    const watermarkWidth = Math.round(
      imageWidth * 0.18
    );

    const resizedWatermark =
      await sharp(watermarkBuffer)
        .resize({
          width: watermarkWidth,
          fit: "contain",
        })
        .png()
        .toBuffer();

    return sharp(imageBuffer)
      .composite([
        {
          input: resizedWatermark,
          gravity: "southeast",
        },
      ])
      .png()
      .toBuffer();
  }

  /**
   * Applies a watermark only if required
   * by the subscription plan.
   */
  async process(
    plan: PlanKey,
    imageBuffer: Buffer,
    watermarkBuffer: Buffer
  ): Promise<Buffer> {
    if (
      !this.shouldApplyWatermark(plan)
    ) {
      return imageBuffer;
    }

    return this.applyWatermark(
      imageBuffer,
      watermarkBuffer
    );
  }
}

export default new WatermarkService();