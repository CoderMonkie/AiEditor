import type { Node } from "@tiptap/pm/model";
import { Doc, encodeStateAsUpdate } from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";

// KAM_COLLAB_INITIAL_UPDATE — only for an absent document, never for restoring a working copy.
// Parse HTML with the actual editor schema first; the server stores this binary unchanged.
export function createCollaborationInitialUpdate(documentNode: Node): string {
  const initialDocument = new Doc();
  try {
    const fragment = initialDocument.getXmlFragment("content");
    prosemirrorToYXmlFragment(documentNode, fragment);
    const update = encodeStateAsUpdate(initialDocument);
    let binary = "";
    for (const byte of update) binary += String.fromCharCode(byte);
    return btoa(binary);
  } finally {
    initialDocument.destroy();
  }
}
