import { AiEditor, AiEditorCollaborationSession, type AiEditorCollaborationUser } from "../../src/index.ts";

const query = new URLSearchParams(location.search);
const documentId = query.get("id") || "22222222-2222-4222-8222-222222222222";
const documentName = query.get("documentName") || "源码协作示例文档";
const role = query.get("role") === "reader" ? "reader" : "writer";
const name = query.get("name") || "源码用户";
const pageId = query.get("pageId") || crypto.randomUUID();
const userId = query.get("userId") || crypto.randomUUID();
const title = document.querySelector<HTMLDivElement>("#title")!;
const roleEl = document.querySelector<HTMLSpanElement>("#role")!;
const selfAvatar = document.querySelector<HTMLSpanElement>("#self-avatar")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const statusDot = document.querySelector<HTMLSpanElement>("#status-dot")!;
const avatarGroup = document.querySelector<HTMLDivElement>("#avatar-group")!;
const presenceToggle = document.querySelector<HTMLButtonElement>("#presence-toggle")!;
const presencePanel = document.querySelector<HTMLDivElement>("#presence-panel")!;
const connectionButton = document.querySelector<HTMLButtonElement>("#connection")!;
document.body.classList.add(role);
title.textContent = name;
title.title = `${documentName} · ID: ${documentId}`;
roleEl.textContent = role === "reader" ? "只读查看者" : "编辑者";

let editor: AiEditor | undefined;
let session: AiEditorCollaborationSession | undefined;
let joining = false;
let closed = false;
let joinError = "";

function avatarText(value: string) {
  const characters = [...value.trim()];
  return characters.filter(character => /[\u3400-\u9fff]/.test(character)).at(-1)
    || characters[0]?.toUpperCase() || "?";
}

function avatarColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#64748b";
}

function makeAvatar(user: AiEditorCollaborationUser, current = false) {
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = avatarText(user.name);
  avatar.style.setProperty("--avatar-color", avatarColor(user.color));
  avatar.title = `${user.name}${current ? "（我）" : user.id.startsWith(`demo:${pageId}:`) ? "（本页）" : "（其他页面）"}`;
  avatar.setAttribute("aria-label", avatar.title);
  return avatar;
}

function uniqueOnlineUsers() {
  if (!session) return [];
  const byId = new Map<string, AiEditorCollaborationUser>();
  for (const user of session.getUsers()) {
    if (user?.id && user.name) byId.set(user.id, user);
  }
  byId.set(session.user.id, session.user);
  return [session.user, ...[...byId.values()]
    .filter(user => user.id !== session!.user.id)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))];
}

function renderPresence(ready: boolean) {
  const users = ready ? uniqueOnlineUsers() : [];
  const others = users.slice(1);
  avatarGroup.replaceChildren(...others.slice(0, 4).map(user => makeAvatar(user)));
  if (others.length > 4) {
    const overflow = document.createElement("span");
    overflow.className = "avatar avatar-overflow";
    overflow.textContent = `+${others.length - 4}`;
    overflow.title = `另有 ${others.length - 4} 个窗口在线`;
    avatarGroup.append(overflow);
  }
  presenceToggle.textContent = ready ? `${users.length} 个窗口在线` : "-- 个窗口在线";
  presenceToggle.disabled = !ready;
  if (!ready) {
    presencePanel.hidden = true;
    presenceToggle.setAttribute("aria-expanded", "false");
  }
  const rows = users.map((user, index) => {
    const row = document.createElement("div");
    row.className = "presence-row";
    const label = document.createElement("span");
    label.className = "presence-row-name";
    label.textContent = `${user.name}${index === 0 ? "（我）" : ""}`;
    const note = document.createElement("span");
    note.className = "presence-row-note";
    note.textContent = index === 0 ? roleEl.textContent
      : user.id.startsWith(`demo:${pageId}:`) ? "本页" : "其他页面";
    row.append(makeAvatar(user, index === 0), label, note);
    return row;
  });
  presencePanel.replaceChildren(...rows);
}

presenceToggle.addEventListener("click", () => {
  presencePanel.hidden = !presencePanel.hidden;
  presenceToggle.setAttribute("aria-expanded", String(!presencePanel.hidden));
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    presencePanel.hidden = true;
    presenceToggle.setAttribute("aria-expanded", "false");
  }
});

connectionButton.addEventListener("click", () => {
  if (!session || joining) return;
  if (session.getStatus().connected) session.disconnect();
  else if (!editor) void join(true);
  else {
    joinError = "";
    void session.reconnect().catch(showJoinError);
  }
});

function updateEditableAndStatus() {
  if (!session) return;
  const state = session.getStatus();
  const ready = role === "writer" ? state.writable : state.connected && state.authenticated && state.synced;
  roleEl.textContent = role === "reader" ? "只读查看者" : ready ? "编辑者" : editor ? "编辑暂停" : "申请编辑";
  statusEl.textContent = state.rejectionReason === "KAM_EDITOR_LIMIT"
    ? editor ? "编辑席位已满 · 本端修改保留，可重新连接" : "编辑席位已满 · 未进入共享稿，可重新连接"
    : state.rejectionReason ? `无法加入：${state.rejectionReason}`
    : joinError || (ready ? "协作中" : joining || state.connected ? "正在加入 · 输入已停用" : "连接断开 · 输入已停用");
  statusEl.title = statusEl.textContent;
  connectionButton.textContent = state.connected ? "断开本端" : "重新连接";
  connectionButton.disabled = joining;
  selfAvatar.style.setProperty("--avatar-color", avatarColor(session.user.color));
  statusDot.classList.toggle("ready", ready);
  statusDot.classList.toggle("offline", !state.connected);
  document.body.classList.toggle("offline", !ready);
  renderPresence(ready);
}

function showJoinError(error: unknown) {
  if (closed) return;
  if (!session?.getStatus().rejectionReason) {
    joinError = `加入失败：${error instanceof Error ? error.message : String(error)}`;
  }
  updateEditableAndStatus();
}

async function join(retry = false) {
  if (!session || joining || closed) return;
  joining = true;
  joinError = "";
  updateEditableAndStatus();
  try {
    if (retry) await session.reconnect();
    await session.waitForInitialSync();
    if (closed) return;
    editor = new AiEditor({
      element: "#editor",
      documentName,
      contentRetention: false,
      editable: role === "writer",
      draggable: false,
      toolbarKeys: role === "writer"
        ? ["undo", "redo", "divider", "bold", "italic", "underline", "divider", "bullet-list", "ordered-list"]
        : [],
      collaboration: { documentId, documentName, userName: name, session },
    });
  } catch (error) {
    if (!session.getStatus().rejectionReason) session.disconnect();
    showJoinError(error);
  } finally {
    joining = false;
    if (!closed) updateEditableAndStatus();
  }
}

try {
  session = new AiEditorCollaborationSession({
    url: "/kam-collab/ws", documentId, documentName, userId, userName: name,
    token: role === "reader" ? "dev-reader" : "dev-writer",
    userColor: role === "reader" ? "#64748b" : undefined,
    parameters: { kam: "1" },
    requireEditorAdmission: role === "writer",
    onConnectionStatusChange: updateEditableAndStatus,
    onUsersUpdate: updateEditableAndStatus,
  });
  selfAvatar.textContent = avatarText(session.user.name);
  selfAvatar.title = `${session.user.name}（我）`;
  void join();
} catch (error) {
  statusEl.textContent = `加入失败：${String(error)}`;
  connectionButton.disabled = true;
}

window.addEventListener("pagehide", () => {
  closed = true;
  if (editor && !editor.isDestroyed()) editor.destroy();
  else session?.destroy();
}, { once: true });
