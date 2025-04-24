import {AbstractDropdownMenuButton} from "../AbstractDropdownMenuButton.ts";
import {Editor, EditorEvents} from "@tiptap/core";
import {t} from "i18next";
import tippy from "tippy.js";
import {downloadHtml, downloadMarkdown} from "../../util/downloadUtil.ts";

type DownloadInfo = {
    icon: string,
    title: string,
    value: string,
    disabled?: boolean
}

const downloadInfos: DownloadInfo[] = [
    {
        icon: `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M750.933333 755.456H573.303467c-14.421333 0-26.112 12.475733-26.112 27.869867v168.618666h28.433066L750.933333 760.439467v-4.983467zM750.933333 699.733333v-88.183466c0-15.189333 11.4688-27.477333 25.6-27.477334s25.6 12.288 25.6 27.477334v160.136533c0 7.2192-2.645333 14.1312-7.338666 19.285333L604.6208 998.7072a24.746667 24.746667 0 0 1-18.261333 8.226133H203.093333C138.069333 1006.933333 85.333333 950.306133 85.333333 880.452267V143.530667C85.333333 73.693867 138.069333 17.066667 203.093333 17.066667h481.28C749.397333 17.066667 802.133333 73.693867 802.133333 143.547733v48.930134c0 15.189333-11.4688 27.477333-25.6 27.477333s-25.6-12.288-25.6-27.477333V143.530667c0-39.4752-29.7984-71.492267-66.56-71.492267H203.093333c-36.7616 0-66.56 32.017067-66.56 71.509333v736.887467c0 39.4752 29.7984 71.492267 66.56 71.492267H494.933333v-168.618667C494.933333 737.160533 530.0224 699.733333 573.303467 699.733333H750.933333zM252.654933 263.509333h36.317867l-17.988267 93.44c7.901867-9.6768 16.896-16.674133 26.7264-21.3504 8.789333-4.334933 18.432-6.3488 28.928-6.3488 20.0704 0 33.8944 6.007467 41.386667 18.363734 6.997333 11.6736 8.430933 29.0304 3.9936 52.053333l-20.565333 106.8032h-36.317867l19.285333-100.113067c2.816-14.677333 2.133333-26.043733-1.792-33.706666-4.778667-8.362667-13.243733-12.356267-25.668266-12.356267-11.4688 0-21.282133 4.676267-29.457067 14.011733-8.482133 9.352533-13.909333 21.026133-16.7424 35.720534l-18.568533 96.443733H205.8752l46.779733-242.961067z m248.9344 14.677334l-10.734933 55.739733h36.642133l-6.0416 31.368533h-36.642133l-18.773333 97.450667c-0.750933 4.010667-0.682667 7.0144 0.768 9.352533 1.536 1.9968 3.874133 3.003733 7.697066 3.003734h21.674667l-6.058667 31.368533h-27.6992c-14.336 0-24.081067-4.010667-29.2352-12.014933-4.949333-7.338667-6.144-17.681067-3.447466-31.709867l18.773333-97.450667h-29.627733l6.0416-31.368533h29.610666l7.714134-40.0384 39.338666-15.701333z m151.1424 51.063466c24.2176 0 39.611733 9.352533 46.523734 28.040534 9.710933-10.683733 19.080533-18.0224 28.142933-22.016 8.0896-4.010667 17.7152-6.024533 28.859733-6.024534 16.896 0 29.815467 5.6832 38.9632 17.698134 8.533333 12.014933 11.298133 27.357867 7.6288 46.3872l-21.777066 113.152h-36.317867l20.497067-106.478934c2.645333-13.687467 1.706667-23.688533-2.56-29.696-4.5056-6.3488-12.8512-9.352533-25.6-9.352533-8.9088 0-16.896 3.345067-24.354134 10.683733-7.714133 6.997333-12.458667 16.6912-14.882133 29.354667l-20.309333 105.472h-36.317867l20.4288-106.120533c5.085867-26.368-3.242667-39.389867-24.917333-39.389867-10.496 0-19.5584 4.010667-27.5968 12.680533a56.32 56.32 0 0 0-15.2064 29.371734l-19.933867 103.458133h-36.3008l33.211733-172.544h36.317867l-3.413333 17.698133c16.605867-15.018667 32.989867-22.357333 48.913066-22.357333z m232.891734-65.7408h36.317866l-46.7968 242.961067h-36.3008l46.762667-242.961067z" fill="currentColor"></path></svg>`,
        title: "HTML",
        value: "html"
    },
    {
        icon: `<svg t="1744005738678" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4334" width="200" height="200"><path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326z m1.8 562H232V136h302v216c0 23.2 18.8 42 42 42h216v494z" p-id="4335"></path><path d="M429 481.2c-1.9-4.4-6.2-7.2-11-7.2h-35c-6.6 0-12 5.4-12 12v272c0 6.6 5.4 12 12 12h27.1c6.6 0 12-5.4 12-12V582.1l66.8 150.2c1.9 4.3 6.2 7.1 11 7.1H524c4.7 0 9-2.8 11-7.1l66.8-150.6V758c0 6.6 5.4 12 12 12H641c6.6 0 12-5.4 12-12V486c0-6.6-5.4-12-12-12h-34.7c-4.8 0-9.1 2.8-11 7.2l-83.1 191-83.2-191z" p-id="4336"></path></svg>`,
        title: "Markdown",
        value: "markdown"
    },
    {
        icon: `<svg t="1744013143418" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="14186" width="200" height="200"><path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326z m1.8 562H232V136h302v216c0 23.2 18.8 42 42 42h216v494z" p-id="14187"></path><path d="M528.1 472h-32.2c-5.5 0-10.3 3.7-11.6 9.1L434.6 680l-46.1-198.7c-1.3-5.4-6.1-9.3-11.7-9.3h-35.4c-1.1 0-2.1 0.1-3.1 0.4-6.4 1.7-10.2 8.3-8.5 14.7l74.2 276c1.4 5.2 6.2 8.9 11.6 8.9h32c5.4 0 10.2-3.6 11.6-8.9l52.8-197 52.8 197c1.4 5.2 6.2 8.9 11.6 8.9h31.8c5.4 0 10.2-3.6 11.6-8.9l74.4-276c0.3-1 0.4-2.1 0.4-3.1 0-6.6-5.4-12-12-12H647c-5.6 0-10.4 3.9-11.7 9.3l-45.8 199.1-49.8-199.3c-1.3-5.4-6.1-9.1-11.6-9.1z" p-id="14188"></path></svg>`,
        title: "Word",
        value: "word",
        disabled: true
    },
    {
        icon: `<svg t="1744013173911" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8719" width="200" height="200"><path d="M531.3 574.4l0.3-1.4c5.8-23.9 13.1-53.7 7.4-80.7-3.8-21.3-19.5-29.6-32.9-30.2-15.8-0.7-29.9 8.3-33.4 21.4-6.6 24-0.7 56.8 10.1 98.6-13.6 32.4-35.3 79.5-51.2 107.5-29.6 15.3-69.3 38.9-75.2 68.7-1.2 5.5 0.2 12.5 3.5 18.8 3.7 7 9.6 12.4 16.5 15 3 1.1 6.6 2 10.8 2 17.6 0 46.1-14.2 84.1-79.4 5.8-1.9 11.8-3.9 17.6-5.9 27.2-9.2 55.4-18.8 80.9-23.1 28.2 15.1 60.3 24.8 82.1 24.8 21.6 0 30.1-12.8 33.3-20.5 5.6-13.5 2.9-30.5-6.2-39.6-13.2-13-45.3-16.4-95.3-10.2-24.6-15-40.7-35.4-52.4-65.8zM421.6 726.3c-13.9 20.2-24.4 30.3-30.1 34.7 6.7-12.3 19.8-25.3 30.1-34.7z m87.6-235.5c5.2 8.9 4.5 35.8 0.5 49.4-4.9-19.9-5.6-48.1-2.7-51.4 0.8 0.1 1.5 0.7 2.2 2z m-1.6 120.5c10.7 18.5 24.2 34.4 39.1 46.2-21.6 4.9-41.3 13-58.9 20.2-4.2 1.7-8.3 3.4-12.3 5 13.3-24.1 24.4-51.4 32.1-71.4z m155.6 65.5c0.1 0.2 0.2 0.5-0.4 0.9h-0.2l-0.2 0.3c-0.8 0.5-9 5.3-44.3-8.6 40.6-1.9 45 7.3 45.1 7.4z" p-id="8720"></path><path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326z m1.8 562H232V136h302v216c0 23.2 18.8 42 42 42h216v494z" p-id="8721"></path></svg>`,
        title: "PDF",
        value: "pdf",
        disabled: true
    },
]

export class Download extends AbstractDropdownMenuButton<DownloadInfo> {

    constructor() {
        super();
        // this.menuData = downloadInfos.map((v) => {
        //     return {...v, title: t(v.title)}
        // });
        this.menuData = downloadInfos;
        this.showItemsTip = true;
    }

    createMenuElement() {
        const div = document.createElement("div");
        div.style.height = this.dropDivHeight;
        div.style.width = this.dropDivWith;
        div.classList.add("aie-dropdown-container");

        for (let i = 0; i < this.menuData.length; i++) {
            const menuItem = this.menuData[i];
            
            const item = document.createElement("div");
            item.classList.add("aie-dropdown-item");
            if (menuItem.disabled) {
                item.classList.add("disabled");
            }
            item.innerHTML = `<div class="text" style="padding:5px 10px;">${this.onDropdownItemRender(i)}</div>`;
            
            item.addEventListener("click", (event) => {
                const menuItem = this.menuData[i] as any;
                if (menuItem.onClick) {
                    const result = menuItem.onClick(event, this.editor!.aiEditor)
                    if (result) this.tippyInstance!.hide()
                } else {
                    this.onDropdownItemClick(i);
                    this.tippyInstance!.hide()
                }
            });

            div.appendChild(item)
        }
        this.tippyEl = div;
        return div;
    }

    onDropdownActive(_editor: Editor, _index: number): boolean {
        return false;
    }

    onDropdownItemClick(index: number): void {
        const item = this.menuData[index];
        
        // 如果功能被禁用，则不执行任何操作
        if (item.disabled) {
            return;
        }
        
        switch (item.value) {
            case "html":
                this.downloadHtml();
                break;
            case "markdown":
                this.downloadMarkdown();
                break;
            case "word":
                // 暂不实现
                break;
            case "pdf":
                // 暂不实现
                break;
        }
    }

    onDropdownItemRender(index: number): Element | string {
        const item = this.menuData[index];
        return `
<div style="width:18px;height: 18px;">${item.icon}</div>
<div style="margin-left: 10px">${item.title}</div> 
        `.trim();
    }

    onMenuTextRender(_index: number): Element | string {
        return `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M192 772h640V542c0-22.1 17.9-40 40-40s40 17.9 40 40v270c0 22.1-17.9 40-40 40H152c-22.1 0-40-17.9-40-40V542c0-22.1 17.9-40 40-40s40 17.9 40 40v230z m356-280.5l127.2-127.2c15.6-15.6 40.9-15.6 56.6 0s15.6 40.9 0 56.6L540.9 611.8c-7.9 7.9-18.4 11.9-28.8 11.7-10.4 0.1-20.9-3.8-28.8-11.7l-191-190.9c-15.6-15.6-15.6-40.9 0-56.6s40.9-15.6 56.6 0L468 483.4V152c0-22.1 17.9-40 40-40s40 17.9 40 40v339.5z" fill="currentColor"></path></svg>`;
    }

    onTransaction(_event: EditorEvents["transaction"]): void {
        return;
    }

    private downloadHtml(): void {
        if (!this.editor) return;
        const html = this.editor.aiEditor.getHtml();
        const docName = this.editor.aiEditor.options.documentName || 'Document';
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        downloadHtml(html, `${docName}_${timestamp}`);
    }

    private downloadMarkdown(): void {
        if (!this.editor) return;
        const markdown = this.editor.aiEditor.getMarkdown();
        const docName = this.editor.aiEditor.options.documentName || 'Document';
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        downloadMarkdown(markdown, `${docName}_${timestamp}`);
    }
}