interface Env {
  ASSETS: Fetcher;
  TURN_API_KEY: string; // store as a secret
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ice") {
    const iceData = await fetchIceCredentials(env);
    if (!iceData) return new Response("ICE fetch failed", { status: 502 });
    return Response.json(iceData);
    }

    // Serve static assets (JS, CSS, images) directly — no need to modify these
    if (url.pathname.match(/\.\w+$/) && !url.pathname.endsWith(".html")) {
      return env.ASSETS.fetch(request);
    }

    // Start fetching ICE credentials immediately (don't await yet)
    const icePromise = fetchIceCredentials(env);

    // Fetch the SPA shell from static assets
    const shell = await env.ASSETS.fetch(
      new Request(new URL("/index.html", request.url))
    );

    // Use HTMLRewriter to stream HTML and inject ICE credentials into <body>
    return new HTMLRewriter()
      .on("body", {
        async element(el) {
          const iceData = await icePromise;
          if (iceData) {
            el.prepend(
              `<script>window.__ICE_SERVERS__=${JSON.stringify(iceData)}</script>`,
              { html: true }
            );
          }
        },
      })
      .transform(shell);
  },
} satisfies ExportedHandler<Env>;

async function fetchIceCredentials(env: Env) {
  try {
    const res = await fetch("https://rtc.live.cloudflare.com/v1/turn/keys/f9c1f8fafb2f096e0fa80c18e1a76ae6/credentials/generate-ice-servers", {
      headers: { Authorization: `Bearer ${env.TURN_API_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // If the API is down, the shell still loads — Vue app can
    // fall back to client-side fetching or show an error
    return null;
  }
}
