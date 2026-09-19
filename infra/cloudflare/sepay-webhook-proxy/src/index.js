const ALLOWED_PATHS = new Set([
  "/api/customer-payments/sepay/webhook",
  "/api/customer-payments/sepay/readiness",
]);

export default {
  async fetch(request, env) {
    if (!env.UPSTREAM_ORIGIN) {
      return new Response("SePay webhook proxy is not configured.", {
        status: 503,
      });
    }

    const requestUrl = new URL(request.url);

    if (!ALLOWED_PATHS.has(requestUrl.pathname)) {
      return new Response("Not found.", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed.", {
        status: 405,
        headers: {
          Allow: "POST",
        },
      });
    }

    const upstreamUrl = new URL(env.UPSTREAM_ORIGIN);
    upstreamUrl.pathname = requestUrl.pathname;
    upstreamUrl.search = requestUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    const upstreamResponse = await fetch(
      new Request(upstreamUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      }),
    );

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("set-cookie");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
