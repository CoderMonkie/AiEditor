import { EditorEvents } from "@tiptap/core";
import { AiEditorEvent, AiEditorOptions } from "../../core/AiEditor";
import {AbstractMenuButton} from "../AbstractMenuButton";
import { FindAndReplaceToolBox } from "../FindAndReplaceToolBox";

export class FindReplaceIconBtn extends AbstractMenuButton {
    constructor() {
        super();
        this.template = `
        <div>
            <svg t="1741077563678" class="icon" viewBox="0 0 1142 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3563" width="200" height="200"><path d="M26.269538 52.499692C26.269538 23.512615 49.782154 0 78.769231 0h945.230769a52.499692 52.499692 0 0 1 0 105.038769H78.769231A52.499692 52.499692 0 0 1 26.269538 52.499692zM26.269538 420.115692c0-29.026462 23.512615-52.539077 52.499693-52.539077h210.038154a52.499692 52.499692 0 0 1 0 105.03877H78.769231a52.499692 52.499692 0 0 1-52.499693-52.499693zM78.769231 787.692308a52.499692 52.499692 0 0 0 0 105.038769h210.038154a52.499692 52.499692 0 0 0 0-105.038769H78.769231zM998.124308 785.604923a315.076923 315.076923 0 1 0-81.48677 66.284308l106.259693 126.660923a52.499692 52.499692 0 0 0 80.462769-67.505231l-105.235692-125.44z m-26.624-207.950769a210.038154 210.038154 0 1 1-420.115693 0 210.038154 210.038154 0 0 1 420.115693 0z" p-id="3564"></path></svg>
        </div>
        `;
        this.registerClickListener();
    }
    private isActive: boolean = false;

    // @ts-ignore
    onClick(commands) {
        const toolbox = document.querySelector(".aie-toolbox__find-and-replace") as FindAndReplaceToolBox;
        const isActive = toolbox && toolbox.visible;
        isActive ? commands.hideFindAndReplace() : commands.showFindAndReplace();
        this.toggleActiveView(!isActive);
    }
    
    /**
     * turn to new state
     * @param isActive 
     * @returns
     */
    private toggleActiveView(isActive: boolean = false) {
        const htmlDivElement = this.querySelector("div");
        if (!htmlDivElement) return;

        if (isActive) {
            htmlDivElement.classList.add("active")
        } else {
            htmlDivElement.classList.remove("active")
        }
        this.isActive = isActive;
    }
    
    onCreate(props: EditorEvents["create"], options: AiEditorOptions): void {
        super.onCreate(props, options);
    }

    onActive(): boolean {
        return this.isActive;
    }

    onEvent(event: AiEditorEvent) {
        const { type, value } = event;
        switch (type) {
            case 'findAndReplaceToolboxVisibleChange':
                this.toggleActiveView(value);
                break;
            default:
                break;
        }
    }
}
