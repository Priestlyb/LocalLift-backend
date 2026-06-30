import requireFeature from "./requireFeature.middleware";
import { FEATURES } from "../constants/features";

/**
 * Allows access only to users whose
 * subscription includes the Social
 * Media Scheduler feature.
 */
const requireScheduler = requireFeature(
  FEATURES.SCHEDULER
);

export default requireScheduler;