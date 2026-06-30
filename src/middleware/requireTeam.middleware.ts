import requireFeature from "./requireFeature.middleware";
import { FEATURES } from "../constants/features";

/**
 * Allows access only to users whose
 * subscription includes Team Access.
 */
const requireTeam = requireFeature(
  FEATURES.TEAM_ACCESS
);

export default requireTeam;