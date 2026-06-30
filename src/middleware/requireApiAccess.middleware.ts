import requireFeature from "./requireFeature.middleware";
import { FEATURES } from "../constants/features";

/**
 * Allows access only to users whose
 * subscription includes API Access.
 */
const requireApiAccess = requireFeature(
  FEATURES.API_ACCESS
);

export default requireApiAccess;