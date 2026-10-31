# Collaboration

Multi-person collaboration means that multiple users **simultaneously** edit the same document, and users can see each other's document operations, including writing, deleting, modifying text content, inserting pictures, etc.

At the same time, you can see other users' nicknames, focus location and other information.

> PS: This feature is only available in the Pro version , not in the open source version. Pro version preview address: http://pro.aieditor.com.cn

## How to use

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

- **url**: Backend service for multi-person collaboration, provided by AIEditor official.
- **documentId**: Required unique document ID (KAM `DocIndexID`). Room selection and storage use only this ID; equal titles do not merge documents and renaming does not change rooms.
- **documentName**: Optional display title, never a fallback for `documentId`. The internal Hocuspocus protocol field `name` carries `documentId`, not the title.
- **token**: user verification token（or user JWT）, used to verify the current user in backend service
- **userName**: user nickname
- **userColor**: user color (the color of the mouse displayed in the editor, the background color of the selected text, etc.), when not configured, the system automatically generates it.
- **onAuthenticated**: Monitors the user's token authorization success.
- **onAuthenticationFailed**: Monitors the user's token authorization failure.
- **onUsersUpdate**: Monitors user changes, such as new users joining the document editing, or users leaving.
