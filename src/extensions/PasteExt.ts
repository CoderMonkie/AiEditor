import {Plugin} from 'prosemirror-state'
import {Extension} from "@tiptap/core";
import {PluginKey} from "@tiptap/pm/state";
import {InnerEditor} from "../core/AiEditor.ts";
import {Slice} from '@tiptap/pm/model';
import {cleanHtml, clearDataMpSlice, isExcelDocument, removeEmptyParagraphs, removeHtmlTags} from "../util/htmlUtil.ts";
import {uuid} from "../util/uuid.ts";

export const PasteExt = Extension.create({
    name: 'pasteExt',
    priority: 1000,

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey("aie-paste"),
                props: {
                    handlePaste: (view, event) => {
                        if (view.props.editable && !view.props.editable(view.state)) {
                            return false;
                        }

                        if (!event.clipboardData) return false;
                        const text = event.clipboardData.getData('text/plain');
                        let html = event.clipboardData.getData('text/html');
                        if (!html && text) {
                            const parseMarkdown = (this.editor as InnerEditor).parseMarkdown(text);
                            if (parseMarkdown) {
                                const {state: {tr}, dispatch} = view;
                                dispatch(tr.replaceSelection(new Slice(parseMarkdown, 0, 0)).scrollIntoView());
                                return true;
                            }
                        } else if (html) {
                            const parser = new DOMParser();debugger;
                            const tempDoc = parser.parseFromString(html, 'text/html');
                            // process excel paste
                            const table = tempDoc.querySelector("table");
                            if (text && table && isExcelDocument(tempDoc)) {
                                this.editor.commands.insertContent(table!.outerHTML, {
                                    parseOptions: {
                                        preserveWhitespace: false,
                                    }
                                });
                                return true;
                            }

                            // 处理标题的 ID
                            const headings = tempDoc.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            headings.forEach(heading => {
                                heading.setAttribute('id', uuid());
                            });
                            html = tempDoc.body.innerHTML;

                            html = clearDataMpSlice(html);
                            const {options} = (this.editor as InnerEditor).aiEditor;
                            if (options.htmlPasteConfig) {
                                //pasteAsText
                                if (options.htmlPasteConfig.pasteAsText) {
                                    html = cleanHtml(html, ['p', 'br'], true)
                                }
                                //pasteClean
                                else if (options.htmlPasteConfig.pasteClean) {
                                    html = removeHtmlTags(html, ['a', 'span', 'strong', 'b', 'em', 'i', 'u']);
                                    const parser = new DOMParser();
                                    const document = parser.parseFromString(html, 'text/html');
                                    const workspace = document.documentElement.querySelector('body');
                                    if (workspace) {
                                        workspace?.querySelectorAll('*').forEach(el => {
                                            el.removeAttribute("style");
                                        })
                                        html = workspace?.innerHTML;
                                    }
                                }

                                //remove empty paragraphs
                                if (!(options.htmlPasteConfig.removeEmptyParagraphs === false)) {
                                    html = removeEmptyParagraphs(html)
                                }

                                //paste with custom processor
                                if (options.htmlPasteConfig.pasteProcessor) {
                                    html = options.htmlPasteConfig.pasteProcessor(html);
                                }

                                if (html) {
                                    this.editor.commands.insertContent(html);
                                    return true;
                                }
                            }
                            else {
                                this.editor.commands.insertContent(html);
                                return true;
                            }
                        }
                    }
                }
            }),
        ]
    },


})
