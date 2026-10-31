const documentIdInput = document.querySelector<HTMLInputElement>("#document-id")!;
const documentNameInput = document.querySelector<HTMLInputElement>("#document-name")!;
const clients = document.querySelector<HTMLDivElement>("#clients")!;
const health = document.querySelector<HTMLParagraphElement>("#health")!;
let participantNumber = 0;
const pageId = crypto.randomUUID();
const participantNames = ["钱七", "李四", "张三", "王五", "赵六", "孙八", "周九", "吴十"];

function addParticipant(role: "writer" | "reader") {
  const documentId = documentIdInput.value.trim();
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(documentId)) {
    alert("请输入 GUID 格式的文档 ID。");
    return;
  }
  participantNumber += 1;
  const iframe = document.createElement("iframe");
  iframe.title = `${role === "writer" ? "编辑者" : "查看者"} ${participantNumber}`;
  const name = participantNames[participantNumber - 1] || `演示用户${participantNumber}`;
  iframe.src = `/client.html?${new URLSearchParams({
    id: documentId, documentName: documentNameInput.value.trim(), role, name, pageId,
    userId: `demo:${pageId}:${crypto.randomUUID()}`,
  })}`;
  clients.appendChild(iframe);
  void updateHealth();
}

document.querySelector("#writer")!.addEventListener("click", () => addParticipant("writer"));
document.querySelector("#reader")!.addEventListener("click", () => addParticipant("reader"));
document.querySelector("#clear")!.addEventListener("click", () => {
  clients.replaceChildren();
  participantNumber = 0;
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

addParticipant("writer");
addParticipant("reader");
void updateHealth();
const timer = window.setInterval(updateHealth, 2000);
window.addEventListener("pagehide", () => window.clearInterval(timer), { once: true });
