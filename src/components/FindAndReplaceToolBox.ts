import {EditorEvents} from "@tiptap/core";
import {AiEditorEventListener,InnerEditor} from "../core/AiEditor";
import {t} from "i18next";

export type FindAndReplaceTabType = 'find' | 'replace';

export class FindAndReplaceToolBox extends HTMLElement implements AiEditorEventListener {
    editor!: InnerEditor;
    editable: boolean = true;
    
    closeBtn!: HTMLDivElement;
    tabs!: HTMLCollectionOf<HTMLDivElement>;
    findInput!: HTMLInputElement;
    replaceInput!: HTMLInputElement;
    matchInfo!: HTMLDivElement;
    caseSensitiveBtn!: HTMLDivElement;
    buttons!: {
        prev: HTMLButtonElement;
        next: HTMLButtonElement;
        replace: HTMLButtonElement;
        replaceAll: HTMLButtonElement;
    };
    currentTab: FindAndReplaceTabType | null = null;
    currentMatchIndex: number;
    matchTotal: number = 0;

    private __caseSensitive: boolean = false;
    private __visible: boolean = false;

    public get visible() {
        return this.__visible;
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.__render();
        this.__initElements();
        this.__setupEventListeners();
        this.matchTotal = 0;
        this.currentMatchIndex = 0;
    }

    // @ts-ignore
    onCreate(props: EditorEvents['create'], options: AiEditorOptions) {
        this.editor = props.editor as InnerEditor;
        this.style.display = 'none';
    }
    onTransaction(event: EditorEvents["transaction"]) {
        const {/*editor,*/transaction} = event;
        if (!transaction.docChanged) {
            return;
        }
        this.__setSearchReplace();
    }
    onEditableChange() { }


    __render() {
        const innerStyle = document.createElement('style');
        innerStyle.textContent = `
:host {
    --findAndReplace-border-color: #ddd;
    --findAndReplace-input-border-color: #ccc;
    --findAndReplace-input-border-color-focus: #1a73e8;
    --findAndReplace-active-color: #1a73e8;
    --findAndReplace-button-bg: #f8f9fa;
    --findAndReplace-outline-color: #1a73e8;

    --findAndReplace-tip-color: #aaa;
    --findAndReplace-case-sensitive-bg-color-hover: #eaeaea;
    --findAndReplace-case-sensitive-color-active: #f0f0f0;
    --findAndReplace-case-sensitive-bg-color-active: #9a9ca1;
    
    display: block;
    border: 1px solid var(--findAndReplace-border-color);
    border-radius: 4px;
    width: 380px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--findAndReplace-border-color);
}

.tabs {
    display: flex;
    gap: 16px;
}

.tab {
    padding: 4px 0;
    cursor: pointer;
    position: relative;
    color: #666;
}

.tab.active {
    color: var(--findAndReplace-active-color);
}

.tab.active::after {
    content: "";
    position: absolute;
    bottom: -9px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--findAndReplace-active-color);
}

.close-btn {
    cursor: pointer;
    font-size: 1.2em;
    padding: 0 6px;
    color: #666;
}

[part="handlebar"] {
    flex: 1;
    cursor: move;
}

.content {
    padding: 20px;
    border-bottom: 1px solid var(--findAndReplace-border-color);
}

.input-group {
    position: relative;
}
.input-group.replace-input {
    margin-top: 12px;
}

.input-group > input {
    width: 100%;
    padding: 8px 96px 8px 8px;
    border: 1px solid var(--findAndReplace-input-border-color);
    border-radius: 4px;
    box-sizing: border-box;
    outline: none;
}
.input-group input:focus {
    border: 1px solid var(--findAndReplace-input-border-color-focus,#1e80ff);
}


.find-input__suffix {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--findAndReplace-tip-color,#aaa);
    font-size: 0.9em;
    display: flex;
    align-items: center;
}
.case-sensitive {
    padding: 1px 4px;
    border-radius: 4px;
    margin-right: 8px;
    transition: background 0.2s;
    cursor: pointer;
}
.case-sensitive:not(.active):hover {
    background-color: var(--findAndReplace-case-sensitive-bg-color-hover,#eaeaea);
}
.case-sensitive.active {
    background: var(--findAndReplace-case-sensitive-bg-color-active, #9a9ca1);
    color: var(--findAndReplace-case-sensitive-color-active, #f0f0f0);
}
.case-sensitive::before {
    content: "Aa";
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 1px;
}

.match-info {
    pointer-events: none;
    user-select: none;
}
.match-info.has-matches {
    color: #7a7a7a;
}

.button-group {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px;
}

button {
    padding: 6px 16px;
    border: 1px solid var(--findAndReplace-border-color);
    border-radius: 3px;
    background: var(--findAndReplace-button-bg);
    cursor: pointer;
    transition: opacity 0.2s;
}

button[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
}

button:not([disabled]):hover {
    background: #e9ecef;
}`
    .trim();

        const template = document.createElement('template');
        template.innerHTML = `
<div class="header">
    <div class="tabs">
        <div class="tab active" data-tab="find">${t('find','查找')}</div>
        <div class="tab" data-tab="replace">${t('replace','替换')}</div>
    </div>
    <div part="handlebar"></div>
    <div class="close-btn">×</div>
</div>

<div class="content">
    <div class="input-group">
        <input type="text" id="find-input" autocomplete="off"
            placeholder="${t('search-placeholder','请输入查找内容')}"
            spellcheck="false">
        <span class="find-input__suffix">
            <div class="case-sensitive" title="${t('match-case','区分大小写')}"></div>
            <div class="match-info">0/0</div>
        </span>
    </div>

    <div class="input-group replace-input" hidden>
        <input type="text" id="replace-input" autocomplete="off"
            placeholder="${t('replace-placeholder','请输入替换内容')}"
            spellcheck="false">
    </div>
</div>

<div class="button-group">
    <button id="prev-btn" disabled>${t('find-previous','上一个')}</button>
    <button id="next-btn" disabled>${t('find-next','下一个')}</button>
    <button id="replace-btn" hidden disabled>${t('replace','替换')}</button>
    <button id="replace-all-btn" hidden disabled>${t('replace-all','全部替换')}</button>
</div>
    `.trim();
    
    this.shadowRoot!.appendChild(innerStyle);
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    }

    __initElements() {
        this.tabs = this.shadowRoot!.querySelectorAll('.tab') as unknown as HTMLCollectionOf<HTMLDivElement>;
        this.closeBtn = this.shadowRoot!.querySelector('.close-btn') as HTMLDivElement;
        this.findInput = this.shadowRoot!.getElementById('find-input') as HTMLInputElement;
        this.replaceInput = this.shadowRoot!.getElementById('replace-input') as HTMLInputElement;
        this.matchInfo = this.shadowRoot!.querySelector('.match-info') as HTMLDivElement;
        this.buttons = {
            prev: this.shadowRoot!.getElementById('prev-btn') as HTMLButtonElement,
            next: this.shadowRoot!.getElementById('next-btn') as HTMLButtonElement,
            replace: this.shadowRoot!.getElementById('replace-btn') as HTMLButtonElement,
            replaceAll: this.shadowRoot!.getElementById('replace-all-btn') as HTMLButtonElement
        };
        this.caseSensitiveBtn = this.shadowRoot!.querySelector('.case-sensitive') as HTMLDivElement;
    }

    __setSearchReplace(clearIndex: boolean = false) {
        const editor = this.editor;
        if (!editor) return;
      
        if (clearIndex) editor.commands.resetIndex();
      
        editor.commands.setSearchTerm(this.findInput.value);
        editor.commands.setReplaceTerm(this.replaceInput.value);
        editor.commands.setCaseSensitive(this.__caseSensitive);

        this.__updateMatchInfo();
    }

    __updateMatchInfo() {
        const index = this.currentMatchIndex = this.editor?.storage?.searchAndReplace?.resultIndex || 0;
        const matchTotal = this.matchTotal = this.editor?.storage?.searchAndReplace?.results.length || 0;

        this.__updateButtonStates();

        this.matchInfo.textContent = `${matchTotal ? index + 1 : 0}/${matchTotal}`;
        if (matchTotal > 0) {
            this.matchInfo.classList.add('has-matches')
        } else {
            this.matchInfo.classList.remove('has-matches')
        }
    }

    __onInputFind() {
        this.__setSearchReplace(true);
    }

    __setupEventListeners() {
        // switch tab
        Array.from(this.tabs).forEach(tab =>
            tab.addEventListener('click', () => this.__switchTab(tab.dataset.tab as FindAndReplaceTabType))
        );

        // close button
        this.closeBtn.addEventListener('click', this.close.bind(this));
        this.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });

        // watch input
        this.findInput.addEventListener('input', () => {
            this.__onInputFind();
        });
        this.findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    this.__findPrevious();
                } else {
                    this.__findNext();
                }
            }
        });
        this.replaceInput.addEventListener('input', (e) => {
            this.editor.commands.setReplaceTerm((e.target as HTMLInputElement).value || '');
        });

        // switch case-sensitive
        this.caseSensitiveBtn.addEventListener('click', () => {
            this.__caseSensitive = !this.__caseSensitive;
            this.caseSensitiveBtn.classList.toggle('active', this.__caseSensitive);
            this.__setSearchReplace(true);
        });

        // buttons
        this.buttons.prev.addEventListener('click', () => this.__findPrevious());
        this.buttons.next.addEventListener('click', () => this.__findNext());
        this.buttons.replace.addEventListener('click', () => this.__replaceCurrent());
        this.buttons.replaceAll.addEventListener('click', () => this.__replaceAll());
    }

    __switchTab(tabType: FindAndReplaceTabType) {
        if (this.currentTab === tabType) return;
        this.currentTab = tabType;
        Array.from(this.tabs).forEach(tab =>
            tab.classList.toggle('active', tab.dataset.tab === tabType)
        );
        
        const isReplace = tabType === 'replace';
        this.replaceInput.parentElement!.hidden = !isReplace;
        this.replaceInput.disabled = !this.editable;

        this.__updateButtonStates();

        setTimeout(() => {
            this.findInput.focus();
        });
    }

    __updateButtonStates() {
        const editable = this.editable;
        const matchTotal = this.matchTotal;
        const isReplace = this.currentTab === 'replace';

        this.buttons.prev.disabled = !matchTotal;
        this.buttons.next.disabled = !matchTotal;

        this.buttons.replace.hidden = !isReplace;
        this.buttons.replaceAll.hidden = !isReplace;
        const canReplace = editable && isReplace &&  matchTotal;
        this.buttons.replace.disabled = !canReplace;
        this.buttons.replaceAll.disabled = !canReplace;
    }

    __findPrevious() {
        if (!this.matchTotal) return;
        this.editor.commands.previousSearchResult();
        this.__goToSelection();
        this.__updateMatchInfo();
    }

    __findNext() {
        if (!this.matchTotal) return;
        this.editor.commands.nextSearchResult();
        this.__goToSelection();
        this.__updateMatchInfo();
    }

    __replaceCurrent() {
        if (!this.matchTotal || !this.editable) return;
        this.editor.commands.replace();
        this.__goToSelection();
        this.__updateMatchInfo();
    }

    __replaceAll() {
        if (!this.matchTotal || !this.editable) return;
        this.__setSearchReplace();
        this.editor.commands.replaceAll();
        this.__updateMatchInfo();
    }

    __onVisibleChagne(visible: boolean) {
        this.__visible = visible;
        this.currentTab = null;
        this.style.display = visible ? 'block' : 'none';
        this.editor.aiEditor.eventComponents.forEach(ec=>{
            ec.onEvent && ec.onEvent({type: 'findAndReplaceToolboxVisibleChange', value: visible});
        });
    }

    __goToSelection() {
        const editor = this.editor;
      
        const { results, resultIndex } = editor.storage.searchAndReplace;
        const position = results[resultIndex];
      
        if (!position) return;
      
        editor.commands.setTextSelection(position);
      
        const { node } = editor.view.domAtPos(
          editor.state.selection.anchor
        );
        node instanceof HTMLElement &&
          node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    
    public close() {
        this.__onVisibleChagne(false);
        this.editor!.chain().setSearchTerm('').focus().run();
    }
    public open({tabType}: {tabType: FindAndReplaceTabType}) {
        const editor = this.editor;
        this.editable = editor.options.editable;

        const selection = editor.state.selection;
        if (!selection.empty) {
            const selectedTxt = editor.state.doc.textBetween(selection.from, selection.to);
            this.findInput.value = selectedTxt;
        }
        this.__onInputFind();
        
        this.__switchTab(this.__visible ? this.currentTab! : tabType);
        this.__onVisibleChagne(true);
    }

}