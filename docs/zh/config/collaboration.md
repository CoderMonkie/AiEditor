# 多人协作

多人协作指的是多个用户 **同时** 编辑同一个文档，可以相互看到对方的所有文档操作，包括编写、删除、修改文字内容、插入图片...等等操作。

同时可以看到其他用户的昵称、焦点所在位置等信息。

> PS：此功能在 Pro 版本才有，开源版没有这个功能。 Pro 版预览地址：http://pro.aieditor.com.cn 

## 使用方法

```typescript
import { AiEditor, AiEditorCollaborationSession } from "aieditor";

const collaboration = {
        url: "ws://127.0.0.1:8080?somekey=value",
        documentId: "22222222-2222-4222-8222-222222222222",
        documentName: "my document",
        token: "your-token",
        userName: "Michael Yang",
        userColor: "#abcdef",
        onAuthenticated: () => {
        },
        onAuthenticationFailed: (reason: string) => {
        },
        onUsersUpdate: (users: any[]) => {
        },
};
const session = new AiEditorCollaborationSession(collaboration);
await session.waitForInitialSync();
const editor = new AiEditor({
    element: "#aiEditor",
    collaboration: { ...collaboration, session },
});
// editor.destroy() also releases the session.
```

- **url**: 多人协作的后台服务，由 AIEditor 官方提供运行 SDK，部署在客户（购买 AIEditor 的用户）自己的服务器里。
- **documentId**: 必填，文档唯一 ID；KAM 使用 `DocIndexID`。协作房间与持久化只按 ID 定位，同名文档不共享正文，改名不换房间。
- **documentName**: 可选，文档名称，仅展示用，不能替代 `documentId`。Hocuspocus 协议内部的 `name` 字段映射自 `documentId`，不是标题。
- **token**:  用户校验的 Token（或 JWT 等），用于后台对当前用户进行校验
- **userName**:  用户的昵称
- **userColor**:  用户的颜色（用户在编辑器显示鼠标颜色、选中文字的背景颜色等），当未配置时，系统自动生成。
- **onAuthenticated**:  监听用户的 token 授权成功。
- **onAuthenticationFailed**:  监听用户的 token 授权失败。
- **onUsersUpdate**:  监听用户发生变化，比如有新用户加入文档编辑，或者有用户离开等。
