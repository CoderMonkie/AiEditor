// @ts-ignore
import styles from "./ai-panel.css?inline";
import { t } from "i18next";
import { Svgs } from "../../commons/Svgs.ts";
import { AIBubbleMenuItem } from "../bubbles/types.ts";
import { type Holder } from "../bubbles/items/selection/AI.ts"; // Assuming Holder type is here
import { SmoothAppender } from "../../util/SmoothAppender.ts";
import { AiModelManager } from "../../ai/AiModelManager.ts";
import { TextSelection } from "@tiptap/pm/state";
// @ts-ignore
import Draggabilly from 'draggabilly';

// Define the pin SVG icon
const pinIconSVG = `<svg t="1744960444014" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="17407" width="16" height="16" fill="currentColor"><path d="M692.992 125.098667l205.909333 205.909333a117.333333 117.333333 0 0 1-30.506666 187.904l-207.786667 103.893333a32 32 0 0 0-15.957333 18.176l-61.44 177.749334a53.333333 53.333333 0 0 1-88.106667 20.309333L362.666667 706.602667 173.226667 896H128v-45.226667l189.44-189.44-132.48-132.437333a53.333333 53.333333 0 0 1 20.309333-88.149333l177.749334-61.44a32 32 0 0 0 18.176-15.914667l103.893333-207.786667a117.333333 117.333333 0 0 1 187.946667-30.506666z m160.682667 251.136l-205.909334-205.909334a53.333333 53.333333 0 0 0-85.418666 13.866667l-103.893334 207.829333a96 96 0 0 1-54.528 47.786667l-161.664 55.893333 286.08 286.037334 55.808-161.664a96 96 0 0 1 47.786667-54.485334l207.872-103.936a53.333333 53.333333 0 0 0 13.866667-85.418666z" p-id="17408"></path></svg>`;
const unpinIconSVG = `<svg t="1744960463927" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="17554" width="16" height="16" fill="currentColor"><path d="M139.946667 94.72a32 32 0 0 0-45.226667 45.226667l251.946667 251.946666L205.226667 440.746667a53.333333 53.333333 0 0 0-20.309334 88.106666L317.397333 661.333333 128 850.773333V896h45.226667l189.44-189.44 132.48 132.48a53.333333 53.333333 0 0 0 88.106666-20.309333l48.853334-141.354667 251.946666 251.904a32 32 0 0 0 45.226667-45.226667L139.946667 94.72z m441.813333 532.309333l-53.418667 154.709334-286.08-286.08 154.709334-53.418667 184.789333 184.789333z m258.048-165.376l-161.578667 80.810667 47.701334 47.701333 142.506666-71.253333a117.333333 117.333333 0 0 0 30.464-187.904l-205.866666-205.909333a117.333333 117.333333 0 0 0-187.946667 30.506666l-71.253333 142.506667 47.701333 47.658667 80.810667-161.578667a53.333333 53.333333 0 0 1 85.418666-13.866667l205.909334 205.909334a53.333333 53.333333 0 0 1-13.866667 85.418666z" p-id="17555"></path></svg>`; // Placeholder, ideally a different icon
const xSvg=`<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path></svg>`;

export interface AiPanelReference {
    title: string;
    content: string;
    link?: string;
};

export class AiPanel extends HTMLElement {
    private holder?: Holder;
    private aiBubbleMenuItems: AIBubbleMenuItem[] = [];
    private smoothAppender?: SmoothAppender;
    private draggabillyInstance?: any;
    private pinned: boolean = false; // Add pinned state
    private refList: AiPanelReference[] = [];
    private enableReference: boolean = false;

    static styleSheet: CSSStyleSheet | null = null;

    static {
        try {
            // @ts-ignore
            if (typeof CSSStyleSheet !== 'undefined' && CSSStyleSheet.prototype.replaceSync) {
                AiPanel.styleSheet = new CSSStyleSheet();
                AiPanel.styleSheet.replaceSync(styles);
            } else {
                console.warn('CSSStyleSheet or replaceSync not supported for AiPanel, falling back to <style> tag.');
            }
        } catch (e) {
            console.error('Failed to create CSSStyleSheet for AiPanel:', e);
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        if (this.shadowRoot) {
            if (AiPanel.styleSheet && this.shadowRoot.adoptedStyleSheets !== undefined) {
                this.shadowRoot.adoptedStyleSheets = [AiPanel.styleSheet];
            } else {
                const styleEl = document.createElement('style');
                styleEl.textContent = styles;
                this.shadowRoot.appendChild(styleEl);
            }
        }
    }

    connectedCallback() {
        this.enableReference = this.editor?.aiEditor.options.ai?.chatConfig?.enableReference || false;
        this.render();
        this.setupEventListeners();
        this.initDraggable();
        // Auto-start logic if options are already set
        if (this.holder?.autoStart && this.holder?.autoPrompt) {
            this.startChat(this.holder.autoPrompt);
        }
        this.shadowRoot?.querySelector<HTMLInputElement>("#prompt")?.focus();
    }

    disconnectedCallback() {
        this.draggabillyInstance?.destroy();
        this.holder?.aiClient?.stop();
        this.holder = void 0;
    }

    setOptions(options: { holder: Holder, aiBubbleMenuItems: AIBubbleMenuItem[] }) {
        this.holder = options.holder;
        this.aiBubbleMenuItems = options.aiBubbleMenuItems;
        this.renderMenuItems();
        if (this.isConnected) {
            this.initDraggable();
            if (this.holder?.autoStart && this.holder?.autoPrompt) {
                this.startChat(this.holder.autoPrompt);
            }
            this.shadowRoot?.querySelector<HTMLInputElement>("#prompt")?.focus();
        }
    }

    private get editor() {
        return this.holder?.editor;
    }

    private get aiPanelInstance() {
        return this.holder?.aiPanelInstance;
    }

    private get tippyInstance() {
        return this.holder?.tippyInstance;
    }

    /**
     * Renders a reference list item
     * @param item The reference item to render
     * @returns HTML string for the reference item
     */
    private renderReferenceItem(item: AiPanelReference): string {
        const refContentElement = document.createElement('span');
        refContentElement.className = 'ref-content truncate';
        refContentElement.title = item.content.slice(0, 200) || item.title;
        refContentElement.textContent = item.title || item.content.slice(0, 200);
        return `
        <div class="ref-list-item truncate" data-link="${item.link || ''}">
          ${refContentElement.outerHTML}
          <span class="ref-remove">
            ${xSvg}
          </span>
        </div>
        `.trim();
    }

    private updateClearAllVisibility() {
        const display = this.refList.length > 1 ? 'block' : 'none';
        const shadow = this.shadowRoot;
        if (!shadow) return;

        const clearAllElement = shadow.querySelector(".clear-all") as HTMLDivElement;
        const relatedDivider = shadow.querySelector('.divider.divider-for-clear-all') as HTMLElement;
        if (relatedDivider) {
            relatedDivider.style.display = display;
        }
        if (clearAllElement) {
            clearAllElement.style.display = display;
        }
    }

    private render() {
        if (!this.shadowRoot) return;

        this.refList = this.editor?.aiEditor.options.ai?.chatConfig?.references || [];

        this.shadowRoot.innerHTML = `
            ${this.shadowRoot.querySelector('style')?.outerHTML || ''} <!-- Preserve existing style if fallback was used -->
            <div class="aie-ai-panel-container">
                <div class="aie-ai-panel-body">
                    <div class="header">
                        <div class="handlebar"></div>
                        <div class="icon-btn-pin">
                            ${pinIconSVG} <!-- Add pin icon -->
                        </div>
                        <div class="icon-btn-close">
                            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path></svg>
                        </div>
                    </div>
                    <div class="aie-ai-panel-body-content" style="display: none;">
                        <div class="loader">${Svgs.refresh}</div>
                        <textarea readonly id="result"></textarea>
                    </div>
                    <div class="aie-ai-panel-body-input">
                        <textarea id="prompt" placeholder="${t('placeholder-tell-ai-what-to-do-next')}" rows="2" autocomplete="off"></textarea>
                        <button type="button" id="go" style="width: 30px;height: 30px">${Svgs.aiPanelStart}</button>
                    </div>
                    <div class="aie-ai-panel-body-tips" style="display:none;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 17C9 17 16 18 19 21H20C20.5523 21 21 20.5523 21 20V13.937C21.8626 13.715 22.5 12.9319 22.5 12C22.5 11.0681 21.8626 10.285 21 10.063V4C21 3.44772 20.5523 3 20 3H19C16 6 9 7 9 7H5C3.89543 7 3 7.89543 3 9V15C3 16.1046 3.89543 17 5 17H6L7 22H9V17ZM11 8.6612C11.6833 8.5146 12.5275 8.31193 13.4393 8.04373C15.1175 7.55014 17.25 6.77262 19 5.57458V18.4254C17.25 17.2274 15.1175 16.4499 13.4393 15.9563C12.5275 15.6881 11.6833 15.4854 11 15.3388V8.6612ZM5 9H9V15H5V9Z" fill="currentColor"></path></svg>
                        ${t("tip-you-can-enter-text-above-or-select-the-operation-below")}
                    </div>
                    <div class="aie-ai-panel-body-reference" style="${this.enableReference?'':'display:none;'}">
                        <div class="ref-icon">
                            <svg t="1744977578251" class="icon-reference" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1146" width="16" height="16" fill="currentColor"><path d="M928 161H699.2c-49.1 0-97.1 14.1-138.4 40.7L512 233l-48.8-31.3A255.2 255.2 0 0 0 324.8 161H96c-17.7 0-32 14.3-32 32v568c0 17.7 14.3 32 32 32h228.8c49.1 0 97.1 14.1 138.4 40.7l44.4 28.6c1.3 0.8 2.8 1.3 4.3 1.3s3-0.4 4.3-1.3l44.4-28.6C602 807.1 650.1 793 699.2 793H928c17.7 0 32-14.3 32-32V193c0-17.7-14.3-32-32-32zM324.8 721H136V233h188.8c35.4 0 69.8 10.1 99.5 29.2l48.8 31.3 6.9 4.5v462c-47.6-25.6-100.8-39-155.2-39z m563.2 0H699.2c-54.4 0-107.6 13.4-155.2 39V298l6.9-4.5 48.8-31.3c29.7-19.1 64.1-29.2 99.5-29.2H888v488z" fill="#000000" fill-opacity=".85" p-id="1147"></path><path d="M396.9 361H211.1c-3.9 0-7.1 3.4-7.1 7.5v45c0 4.1 3.2 7.5 7.1 7.5h185.7c3.9 0 7.1-3.4 7.1-7.5v-45c0.1-4.1-3.1-7.5-7-7.5z m223.1 7.5v45c0 4.1 3.2 7.5 7.1 7.5h185.7c3.9 0 7.1-3.4 7.1-7.5v-45c0-4.1-3.2-7.5-7.1-7.5H627.1c-3.9 0-7.1 3.4-7.1 7.5zM396.9 501H211.1c-3.9 0-7.1 3.4-7.1 7.5v45c0 4.1 3.2 7.5 7.1 7.5h185.7c3.9 0 7.1-3.4 7.1-7.5v-45c0.1-4.1-3.1-7.5-7-7.5z m416 0H627.1c-3.9 0-7.1 3.4-7.1 7.5v45c0 4.1 3.2 7.5 7.1 7.5h185.7c3.9 0 7.1-3.4 7.1-7.5v-45c0.1-4.1-3.1-7.5-7-7.5z" fill="#216DCD" p-id="1148"></path></svg>
                            <span>${t("tip-click-to-add-references", '添加参考')}</span>
                        </div>
                        <div class="divider"></div>
                        <div class="ref-list">
                            ${this.refList.map(item => this.renderReferenceItem(item)).join('')}
                        </div>
                        <div class="divider divider-for-clear-all"></div>
                        <div class="clear-all">
                            <svg class="icon-clear-all" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"><path d="M426.667 384a42.667 42.667 0 0 1 42.666 42.667v426.666a42.667 42.667 0 1 1-85.333 0V426.667A42.667 42.667 0 0 1 426.667 384z m170.666 0A42.667 42.667 0 0 1 640 426.667v426.666a42.667 42.667 0 1 1-85.333 0V426.667A42.667 42.667 0 0 1 597.333 384zM291.243 85.333v85.334h441.514V85.333z m-85.334 85.334V85.333A85.333 85.333 0 0 1 291.243 0h441.514a85.333 85.333 0 0 1 85.334 85.333v85.334h120.576a42.667 42.667 0 1 1 0 85.333H85.333a42.667 42.667 0 0 1 0-85.333z m7.424 170.666A42.667 42.667 0 0 1 256 384v512a42.667 42.667 0 0 0 42.667 42.667h426.666A42.667 42.667 0 0 0 768 896V384a42.667 42.667 0 1 1 85.333 0v512a128 128 0 0 1-128 128H298.667a128 128 0 0 1-128-128V384a42.667 42.667 0 0 1 42.666-42.667z" p-id="3472"></path></svg>
                        </div>
                    </div>
    
                    <div class="aie-ai-panel-body-actions" style="display:none;">
                        <div>&nbsp;</div>
                        <div style="display: flex">
                            <div id="actionHide" class="action-button">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 4V6H15V4H9Z" fill="currentColor"></path></svg>
                                ${t('ai-cancel')}
                            </div>
                            <div id="actionReplace" class="action-button">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M10.071 4.92902L11.4852 6.34323L6.82834 11.0001L16.0002 11.0002L16.0002 13.0002L6.82839 13.0001L11.4852 17.6569L10.071 19.0712L2.99994 12.0001L10.071 4.92902ZM18.0001 19V5.00003H20.0001V19H18.0001Z" fill="currentColor"></path></svg>
                                ${t('ai-replace')}
                            </div>
                            <button id="actionInsert" class="action-button primary">${t('ai-append')}</button>
                        </div>
                    </div>
                </div>
                <div class="aie-ai-panel-footer aie-ai-panel-actions">
                    <div class="aie-ai-panel-footer-tips">${t("you-can-do-the-following")}</div>
                    <div class="menu-items-container"></div>
                </div>
            </div>
        `;
        this.updateClearAllVisibility();
        this.renderMenuItems(); // Render menu items after main structure
        this.updatePinIcon(); // Update pin icon based on state
    }

    private renderMenuItems() {
        const menuContainer = this.shadowRoot?.querySelector('.menu-items-container');
        if (!menuContainer) return;

        menuContainer.innerHTML = this.aiBubbleMenuItems.map((menuItem) => {
            if (typeof menuItem === "string") {
                // Assuming strings are separators like '<hr>'
                return menuItem; 
            }
            // Check if it's a valid menu item object
            if (menuItem && typeof menuItem === 'object' && menuItem.prompt && menuItem.icon && menuItem.title) {
                 return `<p data-prompt="${menuItem.prompt}">${menuItem.icon} ${t(menuItem.title)} </p>`;
            }
            return ''; // Return empty string for invalid items
        }).join('');

        // Add event listeners after rendering
        this.shadowRoot?.querySelectorAll(".aie-ai-panel-actions p[data-prompt]").forEach((element) => {
            const prompt = element.getAttribute("data-prompt")!;
            // Remove previous listener if any to prevent duplicates
            element.replaceWith(element.cloneNode(true)); // Simple way to remove listeners
            this.shadowRoot?.querySelector(`p[data-prompt="${prompt}"]`)?.addEventListener("click", () => {
                this.startChat(prompt);
            });
        });
    }

    private setupEventListeners() {
        const shadow = this.shadowRoot;
        if (!shadow) return;

        const container = shadow.querySelector(".aie-ai-panel-container");
        container?.addEventListener("click", (e) => {
            if (e.target === container) {
                this.hideAiPanel(e);
            }
        });

        shadow.querySelector(".icon-btn-close")?.addEventListener("click", this.forceHideAiPanel.bind(this)); // Close always hides
        shadow.querySelector("#actionHide")?.addEventListener("click", this.forceHideAiPanel.bind(this)); // Cancel respects pin

        // Add listener for pin icon
        shadow.querySelector(".icon-btn-pin")?.addEventListener("click", this.togglePin.bind(this));

        shadow.querySelector("#actionReplace")?.addEventListener("click", () => {
            const textarea = shadow.querySelector("textarea");
            if (textarea?.value && this.editor) {
                this.editor.insertMarkdown(textarea.value);
                this.forceHideAiPanel();
            }
        });

        shadow.querySelector("#actionInsert")?.addEventListener("click", () => {
            const textarea = shadow.querySelector("textarea");
            if (textarea?.value && this.editor) {
                const { state: { selection, doc } } = this.editor;
                this.editor.commands.setTextSelection(TextSelection.create(doc, selection.to));
                this.editor.insertMarkdown(textarea.value);
                this.forceHideAiPanel();
            }
        });

        shadow.querySelector("#go")?.addEventListener("click", () => {
            if (this.holder?.aiClient) {
                this.holder.aiClient.stop();
                return;
            }
            const promptInput = shadow.querySelector<HTMLInputElement>("#prompt");
            const prompt = promptInput?.value.trim();
            if (!prompt) {
                // Maybe show a small validation message?
                return;
            }
            this.startChat(prompt);
        });

        shadow.querySelector<HTMLTextAreaElement>("#prompt")?.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                this.hideAiPanel();
            }
        });

        // Add click event listener for ref-icon to add references
        shadow.querySelector(".ref-icon")?.addEventListener("click", () => {
            // Check if addReference function is configured
            const addReferenceFunc = this.editor?.aiEditor.options.ai?.chatConfig?.addReference;
            if (addReferenceFunc && typeof addReferenceFunc === 'function') {
                // Pin if not already pinned, to avoid hiding
                if (!this.pinned ) this.togglePin();
                // Call the addReference function with a callback
                addReferenceFunc((newReferences: AiPanelReference[]) => {
                    if (Array.isArray(newReferences) && newReferences.length > 0) {
                        // Add new references to the existing list with deduplication
                        const updatedRefList = [...this.refList];
                        
                        // Add new references that don't already exist
                        newReferences.forEach(newRef => {
                            // Check if this reference already exists (by content)
                            const exists = updatedRefList.some(existingRef => 
                                existingRef.content === newRef.content
                            );
                            
                            if (!exists) {
                                updatedRefList.push(newRef);
                            }
                        });
                        
                        // Update the reference list
                        this.refList = updatedRefList;
                        this.editor!.aiEditor.options.ai!.chatConfig!.references = this.refList;
                        
                        // Re-render the reference list
                        const refListElement = shadow.querySelector(".ref-list");
                        if (refListElement) {
                            refListElement.innerHTML = this.refList.map(item => this.renderReferenceItem(item)).join('');
                        }
                        this.updateClearAllVisibility();
                    }
                });
            }
        });

        // Add event delegation for reference list remove buttons
        shadow.querySelector(".ref-list")?.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            debugger
            // Check if the clicked element is a remove button or its child (svg)
            const removeBtn = target.closest(".ref-remove");
            if (removeBtn) {
                // Find the parent list item
                const listItem = removeBtn.closest(".ref-list-item");
                if (listItem) {
                    // Find the index of this item in the list
                    const refItems = Array.from(shadow.querySelectorAll(".ref-list-item"));
                    const index = refItems.indexOf(listItem as HTMLElement);
                    if (index !== -1 && index < this.refList.length) {
                        // Remove the item from refList array
                        this.refList.splice(index, 1);
                        // clearAllElement.style.display = this.refList.length > 1 ? 'block' : 'none';
                        this.updateClearAllVisibility();
                        
                        // Also update the references in editor options
                        this.editor!.aiEditor.options.ai!.chatConfig!.references = this.refList;
                        // Remove the item from DOM directly instead of re-rendering
                        listItem.remove();
                    }
                }
                return;
            }

            const listItem = target.closest(".ref-list-item") as HTMLElement;
            const link = listItem?.dataset.link;
            if (link) {
                window.open(link, '_blank');
                return;
            }
        });
        
        // Add click event listener for clear-all button
        shadow.querySelector(".clear-all")?.addEventListener("click", (e) => {
            this.refList = [];
            this.editor!.aiEditor.options.ai!.chatConfig!.references = [];
            const refListElement = shadow.querySelector(".ref-list");
            if (refListElement) {
                refListElement.innerHTML = '';
            }
            this.updateClearAllVisibility();
        });
    }

    private hideAiPanel(e?: Event) {
        e?.stopPropagation();
        e?.preventDefault();
        if (this.pinned) return; // Don't hide if pinned

        this.aiPanelInstance?.hide();
        this.editor?.aiEditor.focus();
        this.remove();
    }

    // force hide, ignoring pin state (used by close button)
    private forceHideAiPanel(e?: Event) {
        e?.stopPropagation();
        e?.preventDefault();
        this.pinned = false; // Unpin when closing

        this.aiPanelInstance?.hide();
        this.editor?.aiEditor.focus();
        this.remove();
    }

    // toggle pin state
    private togglePin() {
        this.pinned = !this.pinned;
        this.updatePinIcon();
        const tipRoot = this.closest("[data-tippy-root]") as HTMLElement;
        const tfm = tipRoot?.style.transform;
        // Optionally, prevent tippy from hiding if now pinned
        if (this.pinned && this.tippyInstance?.state.isVisible) {
            // This might need more specific tippy interaction if available
        }
        this.aiPanelInstance?.setProps({hideOnClick: !this.pinned});
        setTimeout(() => {
          tipRoot.style.transform = tfm;
        });
    }

    // update pin icon appearance
    private updatePinIcon() {
        const pinButton = this.shadowRoot?.querySelector<HTMLElement>(".icon-btn-pin");
        if (pinButton) {
            pinButton.classList.toggle('pinned', this.pinned);
            pinButton.innerHTML = this.pinned ? unpinIconSVG : pinIconSVG; // Change icon based on state (using placeholder for unpin)
            // pinButton.title = this.pinned ? t('ai-unpin-panel') : t('ai-pin-panel');
        }
    }

    private startChat(prompt: string) {
        if (!this.holder || !this.editor) return;

        if (this.holder.aiClient) {
            this.holder.aiClient.stop(); // Stop existing chat if any
            // UI should reset in onStop, but ensure it does
            this.resetUIForNewChat();
        }

        const textarea = this.shadowRoot?.querySelector("textarea");
        if (!textarea) return;

        textarea.value = "";
        textarea.style.height = "auto"; // Reset height

        const selectedText = this.editor.aiEditor.getSelectedMarkdown();
        if (!selectedText && !prompt) {
            console.warn("AI Panel: No text selected and no prompt provided.");
            return; // Nothing to do
        }

        const options = this.editor.aiEditor.options;
        let aiModelName = options.ai?.bubblePanelModel;
        let aiModel = aiModelName ? AiModelManager.get(aiModelName) : null;

        if (!aiModel) {
            const defaultModelName = "auto"; // Assuming "auto" is the intended default key
            console.warn(`AI model '${aiModelName || '(not configured)'}' not found or invalid, attempting to use default model ('${defaultModelName}').`);
            aiModel = AiModelManager.get(defaultModelName);

            if (!aiModel) {
                const errorMsg = `AI chat failed: Neither specified model ('${aiModelName || 'none'}') nor default model ('${defaultModelName}') could be loaded. Check AI configuration.`;
                console.error(errorMsg);
                if (textarea) { // Ensure textarea exists before setting value
                    textarea.value = `Error: ${errorMsg}`;
                }
                // Optionally reset UI state here if needed
                this.resetUIForNewChat(); // Or a more specific error state reset
                return; // Critical failure, cannot proceed
            }
             // If default model is found, update aiModelName for potential later use or logging
             aiModelName = defaultModelName; // Or aiModel.name if available and preferred
             console.log(`Using default AI model: '${aiModelName}'`);
        }

        // At this point, 'aiModel' should be valid (either the specified one or the default)
        // The original error check for !aiModelName is now redundant and removed.
        // The original 'const aiModel = AiModelManager.get(aiModelName);' is also removed.

        // Proceed with the chat logic using the guaranteed 'aiModel'
        // The check 'if (aiModel)' below is technically redundant if the above logic is sound,
        // but kept for safety.
        if (aiModel) {
            this.smoothAppender = new SmoothAppender(30, textarea);
            const bodyContentEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-body-content");
            const bodyActionsEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-body-actions");
            const footerActionsEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-actions");
            const loaderEl = this.shadowRoot?.querySelector<HTMLElement>(".loader");
            const goButton = this.shadowRoot?.querySelector<HTMLButtonElement>("#go");

            aiModel.chat(selectedText, prompt, {
                onStart: (aiClient) => {
                    this.holder!.aiClient = aiClient;
                    if (bodyActionsEl) bodyActionsEl.style.display = "none";
                    if (footerActionsEl) footerActionsEl.style.display = "none";
                    if (loaderEl) loaderEl.style.display = "block";
                    if (bodyContentEl) bodyContentEl.style.display = "block";
                    if (goButton) goButton.innerHTML = Svgs.aiPanelStop;
                    textarea.value = ''; // Clear previous content
                    textarea.style.height = '100px'; // Set initial height
                },
                onStop: () => {
                    this.holder!.aiClient = undefined;
                    if (goButton) goButton.innerHTML = Svgs.aiPanelStart;
                    if (bodyActionsEl) bodyActionsEl.style.display = "flex";
                    if (loaderEl) loaderEl.style.display = "none";
                    // Keep footer actions hidden until explicitly shown or panel reset
                    // if (footerActionsEl) footerActionsEl.style.display = "block";
                    this.smoothAppender?.finished();
                    this.smoothAppender = undefined;
                    // Adjust textarea height after content is loaded
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                },
                onMessage: (message) => {
                    this.smoothAppender?.appendText(message.content);
                    // Auto-scroll textarea
                    textarea.scrollTop = textarea.scrollHeight;
                     // Dynamically adjust height during streaming
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                },
                onError: (error) => {
                    console.error("AI Chat Error:", error);
                    textarea.value = `Error: ${error.message || 'Failed to get response'}`;
                    // Ensure UI resets correctly on error
                     this.holder!.aiClient = undefined;
                    if (goButton) goButton.innerHTML = Svgs.aiPanelStart;
                    if (bodyActionsEl) bodyActionsEl.style.display = "flex";
                    if (loaderEl) loaderEl.style.display = "none";
                    this.smoothAppender?.finished();
                    this.smoothAppender = undefined;
                }
            });
        } else {
             // This block should ideally not be reached if the logic above is correct.
             console.error(`AI model '${aiModelName || 'unknown'}' could not be initialized after checks.`);
             if (textarea) {
                 textarea.value = `Error: Failed to initialize AI model '${aiModelName || 'unknown'}'.`;
             }
             this.resetUIForNewChat(); // Reset UI on failure
        }
    }

    private resetUIForNewChat() {
        const textarea = this.shadowRoot?.querySelector("textarea");
        const bodyContentEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-body-content");
        const bodyActionsEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-body-actions");
        const footerActionsEl = this.shadowRoot?.querySelector<HTMLElement>(".aie-ai-panel-actions");
        const loaderEl = this.shadowRoot?.querySelector<HTMLElement>(".loader");
        const goButton = this.shadowRoot?.querySelector<HTMLButtonElement>("#go");

        if (textarea) textarea.value = '';
        if (bodyContentEl) bodyContentEl.style.display = 'none';
        if (bodyActionsEl) bodyActionsEl.style.display = 'none';
        if (footerActionsEl) footerActionsEl.style.display = 'block'; // Show menu actions again
        if (loaderEl) loaderEl.style.display = 'none';
        if (goButton) goButton.innerHTML = Svgs.aiPanelStart;
        this.smoothAppender?.finished();
        this.smoothAppender = undefined;
        this.holder!.aiClient = undefined; // Ensure client reference is cleared
    }

    private initDraggable() {
        const panelElement = this.shadowRoot?.querySelector<HTMLElement>('.aie-ai-panel-container');
        const handleElement = this.shadowRoot?.querySelector<HTMLElement>('.handlebar');
        const containmentElement = this.editor?.aiEditor.mainEl;

        if (panelElement && handleElement && containmentElement && typeof Draggabilly !== 'undefined') {
             // Destroy previous instance if exists
            this.draggabillyInstance?.destroy();
            this.draggabillyInstance = new Draggabilly(panelElement, {
                handle: handleElement,
                containment: containmentElement,
            });
        } else {
            if (typeof Draggabilly === 'undefined') {
                 console.warn('Draggabilly library not found. Dragging disabled for AiPanel.');
            }
            // console.warn('Could not initialize dragging for AiPanel. Elements not found or Draggabilly missing.');
        }
    }

    // Public method to show the panel (optional, could be handled by tippy)
    // show() {
    //     this.style.display = 'block'; // Or manage visibility as needed
    //     this.resetUIForNewChat(); // Reset UI state when shown
    //     this.shadowRoot?.querySelector<HTMLInputElement>("#prompt")?.focus();
    //     this.tippyInstance?.hide();
    // }

    // Public method to hide the panel (optional, could be handled by tippy)
    // hide() {
    //      if (this.pinned) return; // Respect pin state
    //      this.holder?.aiClient?.stop(); // Stop any ongoing AI task when hiding
    //      this.remove();
    //      this.holder?.aiPanelInstance?.hide();
    // }
}
