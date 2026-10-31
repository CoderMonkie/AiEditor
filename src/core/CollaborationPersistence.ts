// KAM_COLLAB_PERSISTENCE：保留可读结构，去掉类型后定点移植到定制 bundle。
// 正文更新与确认请求使用同一条有序 WebSocket；synced 不等于已经落盘。
export function requestCollaborationPersistence(provider: any, documentId: string, signal?: AbortSignal): Promise<any> {
  if (signal?.aborted) return Promise.reject(new Error("Collaboration session destroyed"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const requestId = typeof crypto.randomUUID === "function" ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const finish = (error?: Error, result?: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      provider.off("stateless", onStateless);
      provider.off("disconnect", onDisconnect);
      signal?.removeEventListener("abort", onDisconnect);
      error ? reject(error) : resolve(result);
    };
    const onDisconnect = () => finish(new Error("Collaboration disconnected before persistence confirmation"));
    const onStateless = ({ payload }: { payload: string }) => {
      let result;
      try { result = JSON.parse(payload); } catch { return; }
      if (result.type !== "kam:persisted" || result.requestId !== requestId || result.documentId !== documentId) return;
      finish(result.error ? new Error(result.error) : undefined, result);
    };
    const timer = setTimeout(() => finish(new Error("Collaboration persistence confirmation timed out")), 12000);
    provider.on("stateless", onStateless);
    provider.on("disconnect", onDisconnect);
    signal?.addEventListener("abort", onDisconnect, { once: true });
    try { provider.sendStateless(JSON.stringify({ type: "kam:persist", requestId, documentId })); }
    catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
  });
}
