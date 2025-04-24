import { InnerEditor } from "../core/AiEditor";
import { DOMSerializer, Fragment, Schema } from "@tiptap/pm/model";

export const serializeFragmentToHTML = (fragment: Fragment, schema: Schema) => {
    const serializer = DOMSerializer.fromSchema(schema);
    const div = document.createElement('div');
    div.appendChild(serializer.serializeFragment(fragment));
    return div.innerHTML;
}

export function getSelectedHtml(editor: InnerEditor) {
    const tr = editor.state.tr;
    return serializeFragmentToHTML(tr.doc.slice(tr.selection.from, tr.selection.to).content, editor.schema)
}