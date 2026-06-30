import requireFeature from "./requireFeature.middleware";
import { FEATURES } from "../constants/features";

/**
 * Allows access only to users whose
 * subscription includes Analytics.
 */
const requireAnalytics = requireFeature(
  FEATURES.ANALYTICS
);

export default requireAnalytics;