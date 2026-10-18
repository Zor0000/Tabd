import type { Instrumentation } from "next";
import { operationalEvent } from "./lib/monitoring";

export const onRequestError: Instrumentation.onRequestError = (
  _error,
  _request,
  context,
) => {
  operationalEvent("unhandled_server_error", {
    route: context.routePath,
    kind: context.routeType,
    status: 500,
  });
};
