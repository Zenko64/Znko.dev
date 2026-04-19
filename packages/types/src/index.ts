import { activityTypeNames, lanyardPresenceSchema } from "./discord";
import * as request from "./request";
import * as response from "./response";
import * as mime from "./mime";
import * as jobs from "./jobs";

export const shapes = {
  jobs,
  discord: {
    activityTypeNames,
    lanyardPresenceSchema,
  },
  api: {
    request,
    response,
    mime,
  },
};
