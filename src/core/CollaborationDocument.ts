// KAM_COLLAB_DOCUMENT_ID BEGIN — copied readably into TAdvancedEditor/lib/editor.js.
// Business documentId is the room/storage identity. documentName is only a title.
export function resolveCollaborationDocumentId(options: { documentId?: unknown }): string {
  if (typeof options.documentId !== "string" || !options.documentId.trim()) {
    throw new Error("Collaboration requires documentId; documentName is only a title");
  }
  return options.documentId.trim();
}
// KAM_COLLAB_DOCUMENT_ID END
