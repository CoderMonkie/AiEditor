# AiEditor 源码协作示例

此示例直接从本仓库 `src/` 导入 AiEditor，连接同级 `kam-collaboration` 的 Hocuspocus 开发服务，不依赖历史 `AiEditor/server` 的 `/api/docs/{docId}` 或 `/ws` 接口。

在两个终端分别运行：

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/kam-collaboration
npm run dev
```

```sh
cd /Users/mac/teld/Workspace_for_Collaboration/AiEditor
npm install
npm run demo:collaboration
```

`npm run build:collaboration-demo` 可单独构建示例的首页和参与者页面；它依赖同一工作空间内运行的开发协作服务地址，主要用于回归检查，不是生产部署配置。

打开 `http://127.0.0.1:4404/`。默认在同一 `demo-source-1` 房间加入一名编辑者与一名只读查看者；可添加参与者、切换房间和关闭 iframe。刷新或重启服务后，正文从 SQLite 恢复。服务当前使用 `dev-writer` / `dev-reader` 固定测试身份，仅绑定本机地址。

每个参与者顶部的“断开本端 / 重新连接”用于检查断线后的输入禁用与恢复；“关闭本页参与者”用于检查 provider/Y.Doc 和服务端连接释放。

示例先等待协作服务首次同步，再创建编辑器，避免本地初始空段落混入工作稿。连接断开时示例禁用输入；正式业务中的保存确认、提交、KAM 权限和 TAdvancedEditor 包装仍需后续实现。

源码协作 API 要求先创建 `AiEditorCollaborationSession`，调用 `waitForInitialSync()`，再把该 session 传入 `new AiEditor({ collaboration: { …, session } })`。编辑器销毁时会释放 session、provider、WebSocket 和 Y.Doc。直接把未同步的 URL 配置传给编辑器会被拒绝，防止本地初始内容参与合并。
