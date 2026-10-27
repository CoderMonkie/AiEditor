import { AiEditor, AiEditorCollaborationSession } from "../../src/index.ts";

const query = new URLSearchParams(location.search);
const room = query.get("room") || "demo-source-1";
const role = query.get("role") === "reader" ? "reader" : "writer";
const name = query.get("name") || "源码用户";
const title = document.querySelector<HTMLDivElement>("#title")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const connectionButton = document.querySelector<HTMLButtonElement>("#connection")!;
title.textContent = `${name} · ${room} · ${role === "reader" ? "只读" : "编辑"}`;

let editor: AiEditor | undefined;
let session: AiEditorCollaborationSession | undefined;
let deliberatelyDisconnected = false;

connectionButton.addEventListener("click", () => {
  if (!session) return;
  deliberatelyDisconnected = !deliberatelyDisconnected;
  connectionButton.textContent = deliberatelyDisconnected ? "重新连接" : "断开本端";
  if (deliberatelyDisconnected) session.provider.disconnect();
  else session.provider.connect();
});

function updateEditableAndStatus() {
  if (!session) return;
  const state = session.getStatus();
  const ready = state.connected && state.authenticated && state.synced;
  if (editor && !editor.isDestroyed()) editor.setEditable(role === "writer" && ready);
  statusEl.textContent = ready
    ? `已同步 · 在线 ${session.getUsers().length} 人${role === "reader" ? " · 服务端只读" : ""}`
    : "连接中断或尚未同步 · 输入已停用";
}

async function start() {
  session = new AiEditorCollaborationSession({
    url: "ws://127.0.0.1:4401",
    documentName: room,
    token: role === "reader" ? "dev-reader" : "dev-writer",
    userId: crypto.randomUUID(),
    userName: name,
    onConnectionStatusChange: updateEditableAndStatus,
    onUsersUpdate: updateEditableAndStatus,
    onAuthenticationFailed: reason => { statusEl.textContent = `认证失败：${reason}`; },
  });
  await session.waitForInitialSync();
  editor = new AiEditor({
    element: "#editor",
    contentRetention: false,
    editable: role === "writer",
    collaboration: {
      url: "ws://127.0.0.1:4401",
      documentName: room,
      userName: name,
      session,
    },
    onCreated: created => {
      editor = created;
      updateEditableAndStatus();
    },
  });
}

void start().catch(error => {
  statusEl.textContent = `加入失败：${error instanceof Error ? error.message : String(error)}`;
  session?.destroy();
});

window.addEventListener("pagehide", () => {
  if (editor && !editor.isDestroyed()) editor.destroy();
  else session?.destroy();
}, { once: true });
