# AiEditor 源码协作示例

此示例直接从本仓库 `src/` 导入 AiEditor，连接同级 `kam-collaboration` 的 Hocuspocus 开发服务，不依赖历史 `AiEditor/server` 的 `/api/docs/{docId}` 或 `/ws` 接口。

在两个终端分别运行：

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/kam-collaboration
KAM_COLLAB_MAX_EDITORS_PER_ROOM=2 npm run dev
```

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/AiEditor
npm run demo:collaboration
```

脚本定义在 AiEditor 根目录的 `package.json`，会加载本示例专用的 `vite.config.ts`，固定端口 4404 并代理 `/api` 到协作服务的 4402、`/kam-collab/ws` 到 4401。首次缺依赖时在 AiEditor 根目录执行 `npm install`。从 `demos/collaboration-ts` 目录直接运行普通 Vite 不会应用这套配置。

`npm run build:collaboration-demo` 可单独构建示例的首页和参与者页面；它依赖同一工作空间内运行的开发协作服务地址，主要用于回归检查，不是生产部署配置。

打开 `http://127.0.0.1:4404/`。页面先通过现有 KAM 初稿接口准备测试文档 `22222222-2222-4222-8222-222222222223`，再加入两个编辑者。初稿已存在时继续使用原共享正文。若 ID 属于旧 demo 或其它业务周期，页面会提示换一个测试 GUID。建议使用隔离的开发数据库。

每个参与者顶部的“断开本端 / 重新连接”用于检查断线后的输入禁用与恢复；“关闭本页参与者”用于检查 provider/Y.Doc 和服务端连接释放。

## 手工验证

1. 等钱七、李四都显示“协作中”，确认头像不同色。在一个窗口选中文字，另一端的远端光标、姓名标签和选区应与该人的头像同色。
2. 点击“加入编辑者”。第三个窗口显示“编辑席位已满”，不加载共享正文。再点击“加入查看者”，只读端能看到正文和实时修改，不占编辑席位。
3. 让一个编辑者断开，在第三个窗口点“重新连接”。第三人进房后，原编辑者重连会收到满员提示，原编辑器保留且不可输入。再空出一个席位，原编辑者重试后恢复编辑；原色已被占用时改用空闲色。
4. 可用 `node demos/collaboration-ts/verify-admission.cjs` 复跑浏览器验收。脚本使用本地 Playwright/Chromium；可用 `KAM_PLAYWRIGHT` 指定 Playwright 模块路径，`KAM_AI_DEMO_URL` 指定 demo 地址。请用上限 2 且无其它参与者的隔离服务运行。

示例参考旧 `collaboration-demo` 的人员条：当前用户有圆形文字头像和角色标签，其他在线窗口以头像展示；点“在线窗口”可查看完整名单。头像文字来自姓名，颜色来自协作 awareness。每个 iframe 使用独立的演示身份 ID；当前没有 KAM 真实用户身份，因此数字表示**同一文档的在线演示窗口数**，并标注“本页”或“其他页面”，不冒充实际人数。上方健康信息显示**整个服务**的 WebSocket 连接数，可能还包含其它文档。其他人的编辑/只读角色没有在当前 awareness 数据里传输，因此名单不猜测角色。断线时隐藏过期在线名单，避免把旧状态误认为实时在线。“关闭本页参与者”会清空本页窗口并重置演示姓名序号；其它标签页仍可在线。

这是源码 AiEditor + 独立服务的验证页。尚未接入 KAM-UI 或 TAdvancedEditor，页面外观不是知识库的最终界面。

源码协作 API 要求先创建 `AiEditorCollaborationSession`，调用 `waitForInitialSync()`，再把该 session 传入 `new AiEditor({ collaboration: { …, session } })`。受服务端管理的写入端传 `requireEditorAdmission: true`、稳定 `userId` 和无查询串的 URL，连接参数由会话合并。等待认证、颜色和首次同步三者齐备，才创建编辑器、广播颜色和允许写入。只读端不等待编辑席位；保留传统独立房间行为。

使用会话的 `disconnect()` / `reconnect()` 可以暂停和重试，期间保留同一个 Y.Doc，状态中的 `rejectionReason` 区分满员等情况。编辑器销毁才释放 session、provider、WebSocket 和 Y.Doc。消息见[服务端接入契约](../../../kam-collaboration/design/editor-admission.md)。

地址与旧 demo 的区分：本工作空间源码示例固定 4404，浏览器经当前站点 /kam-collab/ws，由 Vite 转到新服务 4401；HTTP /api 转到 4402。可通过启动进程环境变量 KAM_COLLAB_WS_TARGET / KAM_COLLAB_HTTP_TARGET 改代理目标。旧 /Users/mac/dev/CoderMonkie/AiEditor/server 仍用 1235，原 collaboration-demo 的 start 脚本用 2235、前端 5174，不与本例共用端口。源代码 resolveCollaborationUrl（KAM_COLLAB_URL）支持省略 URL 使用当前页面同域路径，HTTPS 自动使用 wss。真实部署仍须配置代理。

## 文档 ID 与名称

`collaboration.documentId` 必填，业务接入传 KAM `DocIndexID`；`documentName` 是可选名称元数据，不能代替 ID。页面的“文档名称”与“文档 ID”分别传递，修改名称后用同一 ID 加入仍恢复原正文；同名但不同 ID 则是两份独立正文。标题目前不经协作通道持久化，KAM 名称仍由 KAM 管理。Hocuspocus 内部 `name` 是协议房间键，在边界显式映射自 `documentId`。
