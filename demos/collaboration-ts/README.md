# AiEditor 源码协作示例

此示例直接从本仓库 `src/` 导入 AiEditor，连接同级 `kam-collaboration` 的 Hocuspocus 开发服务，不依赖历史 `AiEditor/server` 的 `/api/docs/{docId}` 或 `/ws` 接口。

在两个终端分别运行：

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/kam-collaboration
npm run dev
```

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/AiEditor
npm run demo:collaboration
```

脚本定义在 AiEditor 根目录的 `package.json`，会加载本示例专用的 `vite.config.ts`，固定端口 4404 并代理 `/api` 到协作服务的 4402、`/kam-collab/ws` 到 4401。首次缺依赖时在 AiEditor 根目录执行 `npm install`。从 `demos/collaboration-ts` 目录直接运行普通 Vite 不会应用这套配置。

`npm run build:collaboration-demo` 可单独构建示例的首页和参与者页面；它依赖同一工作空间内运行的开发协作服务地址，主要用于回归检查，不是生产部署配置。

打开 `http://127.0.0.1:4404/`。默认以测试文档 ID `22222222-2222-4222-8222-222222222222` 加入一名编辑者与一名只读查看者；可添加参与者、切换文档 ID 和关闭 iframe。刷新或重启服务后，正文从 SQLite 恢复。服务当前使用 `dev-writer` / `dev-reader` 固定测试身份，仅绑定本机地址；业务接入时文档 ID 为 KAM `DocIndexID`。

每个参与者顶部的“断开本端 / 重新连接”用于检查断线后的输入禁用与恢复；“关闭本页参与者”用于检查 provider/Y.Doc 和服务端连接释放。

## 手工验证

1. 打开 `http://127.0.0.1:4404/`，等两个窗口显示“协作中”。默认有钱七、李四两个本页演示窗口；点击“在线窗口”可展开名单。同一文档在其它标签页仍有连接时，名单也会列出它们并标“其他页面”。
2. 在“可编辑”窗口末尾输入测试文字，“只读查看”窗口应立即出现相同文字。只读端工具栏已隐藏，正文不可输入。
3. 刷新页面，两个窗口应恢复刚才的文字。可在 `kam-collaboration` 目录执行 `sqlite3 .data/collaboration.sqlite 'SELECT id, revision FROM documents;'` 核对记录与修订号。
4. 在编辑端点“断开本端”，状态应提示输入已停用、在线头像暂时隐藏；再点“重新连接”，待同步后恢复编辑和头像。新增参与者时人数、头像和名单应更新；关闭本页参与者时连接数应下降。

示例参考旧 `collaboration-demo` 的人员条：当前用户有圆形文字头像和角色标签，其他在线窗口以头像展示；点“在线窗口”可查看完整名单。头像文字来自姓名，颜色来自协作 awareness。每个 iframe 使用独立的演示身份 ID；当前没有 KAM 真实用户身份，因此数字表示**同一文档的在线演示窗口数**，并标注“本页”或“其他页面”，不冒充实际人数。上方健康信息显示**整个服务**的 WebSocket 连接数，可能还包含其它文档。其他人的编辑/只读角色没有在当前 awareness 数据里传输，因此名单不猜测角色。断线时隐藏过期在线名单，避免把旧状态误认为实时在线。“关闭本页参与者”会清空本页窗口并重置演示姓名序号；其它标签页仍可在线。

这是源码 AiEditor + 独立服务的验证页。尚未接入 KAM-UI 或 TAdvancedEditor，页面外观不是知识库的最终界面。

示例先等待协作服务首次同步，再创建编辑器，避免本地初始空段落混入工作稿。连接断开时示例禁用输入；正式业务中的保存确认、提交、KAM 权限和 TAdvancedEditor 包装仍需后续实现。

源码协作 API 要求先创建 `AiEditorCollaborationSession`，调用 `waitForInitialSync()`，再把该 session 传入 `new AiEditor({ collaboration: { …, session } })`。编辑器销毁时会释放 session、provider、WebSocket 和 Y.Doc。直接把未同步的 URL 配置传给编辑器会被拒绝，防止本地初始内容参与合并。

地址与旧 demo 的区分：本工作空间源码示例固定 4404，浏览器经当前站点 /kam-collab/ws，由 Vite 转到新服务 4401；HTTP /api 转到 4402。可通过启动进程环境变量 KAM_COLLAB_WS_TARGET / KAM_COLLAB_HTTP_TARGET 改代理目标。旧 /Users/mac/dev/CoderMonkie/AiEditor/server 仍用 1235，原 collaboration-demo 的 start 脚本用 2235、前端 5174，不与本例共用端口。源代码 resolveCollaborationUrl（KAM_COLLAB_URL）支持省略 URL 使用当前页面同域路径，HTTPS 自动使用 wss。真实部署仍须配置代理。

## 文档 ID 与名称

`collaboration.documentId` 必填，业务接入传 KAM `DocIndexID`；`documentName` 是可选名称元数据，不能代替 ID。页面的“文档名称”与“文档 ID”分别传递，修改名称后用同一 ID 加入仍恢复原正文；同名但不同 ID 则是两份独立正文。标题目前不经协作通道持久化，KAM 名称仍由 KAM 管理。Hocuspocus 内部 `name` 是协议房间键，在边界显式映射自 `documentId`。
