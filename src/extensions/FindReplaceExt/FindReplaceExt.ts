import {CommandProps, Extension} from "@tiptap/core";
import {InnerEditor} from "../../core/AiEditor.ts";
import { FindAndReplaceToolBox } from "../../components/FindAndReplaceToolBox.ts";
import type {FindAndReplaceTabType} from "../../components/FindAndReplaceToolBox.ts";
// @ts-ignore
import Draggabilly from 'draggabilly';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        FindReplaceExt: {
            showFindAndReplace: (tabType: FindAndReplaceTabType) => ReturnType,
            hideFindAndReplace: () => ReturnType,
      },
    }
}

const showFindAndReplace = (editor: InnerEditor, tabType: FindAndReplaceTabType) => {
    let toolbox = document.querySelector(".aie-toolbox__find-and-replace") as FindAndReplaceToolBox;
    if (!toolbox) {
        toolbox = document.createElement('find-and-replace') as FindAndReplaceToolBox;
        toolbox.classList.add('aie-toolbox__find-and-replace');
        editor.aiEditor.container.appendChild(toolbox);
        toolbox.editor = editor;
        editor.aiEditor.eventComponents.push(toolbox);
        toolbox.onCreate({editor}, editor.aiEditor.options);

        // @ts-ignore
        new Draggabilly(toolbox, {
            handle: toolbox.shadowRoot!.querySelector('[part="handlebar"]'),
            containment: editor.aiEditor.mainEl,
        });
    }
    toolbox.open({tabType})
    return true;
}
const hideFindAndReplace = (): boolean => {
    let toolbox = document.querySelector(".aie-toolbox__find-and-replace") as FindAndReplaceToolBox;
    if (toolbox) {
        toolbox.close();
        return true;
    }
    return false;
}

export const FindReplaceExt = Extension.create({
    name: "findAndReplaceExt",
    addCommands() {
        return {
            showFindAndReplace: (tabType: FindAndReplaceTabType = 'find') => (cmdProps: CommandProps) => {
                return showFindAndReplace(cmdProps.editor as InnerEditor, tabType);
            },
            hideFindAndReplace: () => (/*cmdProps: CommandProps*/) => {
                return hideFindAndReplace();
            },
        }  
    },
    addKeyboardShortcuts() {
        return {
            'Mod-f': ({editor}) => {
                showFindAndReplace(editor as InnerEditor, 'find');
                return true;
            },
            'Mod-h': ({editor}) => {
                showFindAndReplace(editor as InnerEditor, 'replace');
                return true;
            },
            'Escape': (/*{editor}*/) => {                
                return hideFindAndReplace();
            },
        }
    },
})
