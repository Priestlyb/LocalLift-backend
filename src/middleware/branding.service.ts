import Business from "../models/Business";
import { PlanKey } from "../types/subscription.types";
import entitlementService from "../services/subscription/entitlement.service";

export interface BrandingResult {
  businessName: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  website?: string;
  phone?: string;
  email?: string;
  watermarkEnabled: boolean;
}

class BrandingService {
  /**
   * Returns whether the user's subscription
   * supports business branding.
   */
  canUseBranding(
    plan: PlanKey
  ): boolean {
    return entitlementService.hasFeature(
      plan,
      "branding"
    );
  }

  /**
   * Returns whether the subscription
   * supports multiple brands.
   */
  canUseMultipleBrands(
    plan: PlanKey
  ): boolean {
    return entitlementService.hasFeature(
      plan,
      "multipleBrands"
    );
  }

  /**
   * Returns the active branding for a business.
   */
  async getBranding(
    businessId: string,
    plan: PlanKey
  ): Promise<BrandingResult> {
    const business =
      await Business.findById(businessId);

    if (!business) {
      throw new Error(
        "Business not found."
      );
    }

    const brandingEnabled =
      this.canUseBranding(plan);

    return {
      businessName: business.businessName,

      logo: brandingEnabled
        ? business.logo
        : undefined,

      primaryColor: brandingEnabled
        ? business.primaryColor
        : undefined,

      secondaryColor: brandingEnabled
        ? business.secondaryColor
        : undefined,

      website: brandingEnabled
        ? business.website
        : undefined,

      phone: brandingEnabled
        ? business.phone
        : undefined,

      email: brandingEnabled
        ? business.email
        : undefined,

      watermarkEnabled:
        !entitlementService.hasFeature(
          plan,
          "watermark"
        ),
    };
  }

  /**
   * Removes branding from content
   * when the subscription doesn't allow it.
   */
  stripBranding(
    branding: BrandingResult
  ): BrandingResult {
    return {
      businessName:
        branding.businessName,
      watermarkEnabled: true,
    };
  }
}

export default new BrandingService();