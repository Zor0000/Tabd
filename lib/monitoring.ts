/** Deliberately excludes URLs, query strings, credentials, bodies and error messages. */
export function operationalEvent(
  event: string,
  fields: Record<string, string | number | boolean> = {},
) {
  const line = JSON.stringify({
    service: "tabd",
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  if (fields.status && Number(fields.status) >= 500) console.error(line);
  else console.info(line);
}

export function monitored<Args extends unknown[]>(
  route: string,
  handler: (...args: Args) => Response | Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    const started = performance.now();
    const requestId = crypto.randomUUID();
    let status = 500;
    try {
      const response = await handler(...args);
      status = response.status;
      response.headers.set("X-Request-Id", requestId);
      return response;
    } finally {
      operationalEvent("api_request", {
        route,
        requestId,
        status,
        durationMs: Math.round(performance.now() - started),
      });
    }
  };
}
