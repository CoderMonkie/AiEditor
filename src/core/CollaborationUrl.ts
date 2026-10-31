// KAM_COLLAB_URL BEGIN — copied readably into TAdvancedEditor/lib/editor.js.
// Browser clients use a same-origin path; only development proxies know backend ports.
export function resolveCollaborationUrl(input = "/kam-collab/ws", pageUrl = globalThis.location?.href) {
  const url = new URL(input.trim() || "/kam-collab/ws", pageUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("Collaboration URL must use ws, wss, http or https");
  }
  if (pageUrl && new URL(pageUrl).protocol === "https:" && url.protocol !== "wss:") {
    throw new Error("HTTPS pages require a secure wss collaboration URL");
  }
  if (url.hash) throw new Error("Collaboration URL must not contain a fragment");
  return url.href;
}
// KAM_COLLAB_URL END
