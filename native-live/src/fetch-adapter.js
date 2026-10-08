// Loaded before the current Viewer script; desktop API transport only.
(() => {
  // The browser UI uses Storage for login. In the desktop app those calls must
  // stay in memory even if Chromium changes storage handling for a partition.
  for (const name of ['localStorage', 'sessionStorage']) {
    const data = new Map();
    Object.defineProperty(window, name, { value: Object.freeze({
      get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
      getItem: key => data.get(String(key)) ?? null,
      setItem: (key, value) => { data.set(String(key), String(value)); },
      removeItem: key => { data.delete(String(key)); }, clear: () => data.clear()
    }) });
  }
  for (const name of ['log', 'info', 'warn', 'error', 'debug']) console[name] = () => {};
  document.addEventListener('DOMContentLoaded', () => { document.title = 'Fromm Viewer · Desktop preview'; });
  const original = window.fetch.bind(window);
  const apiHosts = new Set(['api.frommyarti.com', 'account-api.frommyarti.com', 'channel-api.frommyarti.com']);
  window.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (!apiHosts.has(url.hostname)) return original(input, init);
    const request = new Request(input instanceof Request ? input : url, init);
    const result = await frommDesktop.request({ url: request.url, method: request.method,
      headers: Object.fromEntries(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text() });
    if (!result.ok) throw new Error(result.code || 'DESKTOP_NETWORK_FAILED');
    return new Response(result.body, { status: result.status, headers: { 'content-type': result.contentType } });
  };
})();
