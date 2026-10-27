const roomInput = document.querySelector<HTMLInputElement>("#room")!;
const clients = document.querySelector<HTMLDivElement>("#clients")!;
const health = document.querySelector<HTMLParagraphElement>("#health")!;
let participantNumber = 0;

function addParticipant(role: "writer" | "reader") {
  const room = roomInput.value.trim();
  if (!/^demo-[a-z0-9-]{1,80}$/.test(room)) {
    alert("房间须以 demo- 开头，只能包含小写字母、数字和连字符。 ");
    return;
  }
  participantNumber += 1;
  const iframe = document.createElement("iframe");
  iframe.title = `${role === "writer" ? "编辑者" : "查看者"} ${participantNumber}`;
  iframe.src = `/client.html?${new URLSearchParams({ room, role, name: `源码用户${participantNumber}` })}`;
  clients.appendChild(iframe);
}

document.querySelector("#writer")!.addEventListener("click", () => addParticipant("writer"));
document.querySelector("#reader")!.addEventListener("click", () => addParticipant("reader"));
document.querySelector("#clear")!.addEventListener("click", () => clients.replaceChildren());

async function updateHealth() {
  try {
    const response = await fetch("/api/health");
    const state = await response.json();
    health.textContent = `服务在线 · 活跃文档 ${state.activeDocuments} · 连接 ${state.connections} · SQLite 文档 ${state.storage.storedDocuments}`;
  } catch {
    health.textContent = "协作服务不可用；先在同级 kam-collaboration 运行 npm run dev。";
  }
}

addParticipant("writer");
addParticipant("reader");
void updateHealth();
const timer = window.setInterval(updateHealth, 2000);
window.addEventListener("pagehide", () => window.clearInterval(timer), { once: true });
