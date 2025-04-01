import { Editor } from "@tiptap/core";
import {Node,Fragment} from "prosemirror-model";

export const getText = (node:Node | Fragment) => {
    let text = "";
    node.descendants((node)=>{
        if (node.text){
            text += node.text;
        }
    })
    return text;
}

// 获取光标前文本内容
export const getTextBeforeCursor = (editor: Editor, maxChars: number = 1000) => {
    const { state } = editor;
    const { selection, doc } = state;
    const cursorPos = selection.$head.pos;
    
    // 从光标位置开始向前搜索
    let startPos = Math.max(0, cursorPos - maxChars);
    
    // 获取从startPos到cursorPos的文本
    const textBefore = doc.textBetween(startPos, cursorPos, "\n\n", " ");
    
    return textBefore;
};

/**
 * Strategy for getting context text:
 * 1. If selection is not empty, return the selected text
 * 2. If the parent of the cursor is a paragraph with conent, return the text content of the paragraph
 * 3. If the parent of the cursor is an empty paragraph, return the recent {1000} text before cursor
 * @param editor 
 * @returns 
 */
export const getContextText = (editor: Editor) => {
    const {selection,doc} = editor.state;
    if (!selection.empty) {
        return doc.textBetween(selection.from, selection.to);
    }
    const textContent = selection.$head.parent.textContent;
    const pText = textContent.replace(/^\//, '').replace(/\/$/, '').trim();
    if (pText.length > 0) {
        return pText;
    }
    return getTextBeforeCursor(editor).trim();   
}
