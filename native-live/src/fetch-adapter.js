// Loaded before the immutable Viewer script; desktop API transport only.
(() => {
  const original = window.fetch.bind(window);
  const apiHosts = new Set(['api.frommyarti.com', 'account-api.frommyarti.com', 'channel-api.frommyarti.com']);
  window.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (!apiHosts.has(url.hostname)) return original(input, init);
    const request = new Request(url, init);
    const result = await frommDesktop.request({ url: request.url, method: request.method,
      headers: Object.fromEntries(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text() });
    if (!result.ok) throw new Error(result.code || 'DESKTOP_NETWORK_FAILED');
    return new Response(result.body, { status: result.status, headers: { 'content-type': result.contentType } });
  };
})();
