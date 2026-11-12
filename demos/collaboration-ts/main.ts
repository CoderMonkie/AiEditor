import { Doc, XmlElement, XmlText, encodeStateAsUpdate } from "yjs";

const documentIdInput = document.querySelector<HTMLInputElement>("#document-id")!;
const documentNameInput = document.querySelector<HTMLInputElement>("#document-name")!;
const clients = document.querySelector<HTMLDivElement>("#clients")!;
const health = document.querySelector<HTMLParagraphElement>("#health")!;
const joinStatus = document.querySelector<HTMLParagraphElement>("#join-status")!;
let participantNumber = 0;
let pageEpoch = 0;
const pageId = crypto.randomUUID();
const participantNames = ["钱七", "李四", "张三", "王五", "赵六", "孙八", "周九", "吴十"];

const initializing = new Map<string, Promise<void>>();

function initializeDocument(documentId: string, documentName: string): Promise<void> {
  const pending = initializing.get(documentId);
  if (pending) return pending;
  const doc = new Doc();
  const paragraph = new XmlElement("paragraph");
  const text = new XmlText();
  text.insert(0, "协作示例：在两个编辑者窗口选中文字，观察对方的光标、姓名和选区。");
  paragraph.insert(0, [text]);
  doc.getXmlFragment("content").insert(0, [paragraph]);
  const initialUpdate = btoa(String.fromCharCode(...encodeStateAsUpdate(doc)));
  doc.destroy();
  const result = (async () => {
    const response = await fetch(`/kam-collab/api/documents/${encodeURIComponent(documentId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer dev-writer" },
      body: JSON.stringify({ documentId, documentName, initialUpdate, baseVersion: "aieditor-source-demo" }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || `HTTP ${response.status}`);
    }
  })().finally(() => initializing.delete(documentId));
  initializing.set(documentId, result);
  return result;
}

async function addParticipant(role: "writer" | "reader") {
  const documentId = documentIdInput.value.trim();
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(documentId)) {
    alert("请输入 GUID 格式的文档 ID。");
    return;
  }
  const number = ++participantNumber;
  const epoch = pageEpoch;
  const documentName = documentNameInput.value.trim();
  joinStatus.textContent = "正在准备测试文档…";
  try {
    await initializeDocument(documentId, documentName);
  } catch (error) {
    if (epoch === pageEpoch) joinStatus.textContent = `准备失败：${String(error)}。可换一个测试文档 ID 后重试。`;
    return;
  }
  if (epoch !== pageEpoch) return;
  joinStatus.textContent = "";
  const iframe = document.createElement("iframe");
  iframe.title = `${role === "writer" ? "编辑者" : "查看者"} ${number}`;
  const name = participantNames[number - 1] || `演示用户${number}`;
  iframe.src = `/client.html?${new URLSearchParams({
    id: documentId, documentName, role, name, pageId,
    userId: `demo:${pageId}:${crypto.randomUUID()}`,
  })}`;
  clients.appendChild(iframe);
  void updateHealth();
}

document.querySelector("#writer")!.addEventListener("click", () => addParticipant("writer"));
document.querySelector("#reader")!.addEventListener("click", () => addParticipant("reader"));
document.querySelector("#clear")!.addEventListener("click", () => {
  pageEpoch++;
  clients.replaceChildren();
  participantNumber = 0;
  joinStatus.textContent = "";
  void updateHealth();
});

async function updateHealth() {
  try {
    const response = await fetch("/api/health");
    const state = await response.json();
    health.textContent = `本页 ${clients.childElementCount} 个演示窗口 · 服务在线 · 活跃文档 ${state.activeDocuments} · 服务总 WebSocket 连接 ${state.connections}（含其它页面） · SQLite 文档 ${state.storage.storedDocuments}`;
  } catch {
    health.textContent = "协作服务不可用；先在同级 kam-collaboration 运行 npm run dev。";
  }
}

void addParticipant("writer");
void addParticipant("writer");
void updateHealth();
const timer = window.setInterval(updateHealth, 2000);
window.addEventListener("pagehide", () => window.clearInterval(timer), { once: true });
