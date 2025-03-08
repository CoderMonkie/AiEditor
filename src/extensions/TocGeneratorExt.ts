import { Extension } from "@tiptap/core";
import { t } from 'i18next';
import { InnerEditor } from "../core/AiEditor";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tocGenerator: {
      generateToc: () => ReturnType,
    }
  }
}

export interface ITocItem {
  text: string;
  level: number;
  id: string;
  pos: number;
  isCurrent?: boolean;
}
export type TocPosition = 'left' | 'top';

const SUB_MENU_INDENT = 16; // 子菜单缩进单位 16px

export const createTocHead = (visible = false) => {
  return (visible ? `
<div class="aside-toc-head is-open">
  <span class="aside-toc-head-text">${t('toc')}</span>
  <span class="aside-toc-head-toggle">
    <svg class="aside-toc-toggle-icon" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 8.6a.6.6 0 100-1.2v1.2zm-8 0h8V7.4H3v1.2z" fill="currentColor"></path><path d="M7 4.001l-4 4 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M14 2v12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path></svg>
  </span>
</div>
  ` : `
<div class="aside-toc-head is-close">
  <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3.5h9M5 8h9m-9 4.5h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path><rect x="1.875" y="7.625" width=".75" height=".75" rx=".375" stroke="currentColor" stroke-width=".75"></rect><rect x="1.875" y="3.125" width=".75" height=".75" rx=".375" stroke="currentColor" stroke-width=".75"></rect><rect x="1.875" y="12.125" width=".75" height=".75" rx=".375" stroke="currentColor" stroke-width=".75"></rect></svg>
</div>
  `).trim();
}

/**
 * 生成目录条目列表
 */
export function createTocList(arr: ITocItem[], position: TocPosition = 'left') {
  if (!Array.isArray(arr) || arr.length === 0) {
    return "";
  }

  const isLeft = position === 'left';
  const topLevel = Math.min(...arr.map(item => item.level));

  return arr
    .map((item) => {
      const { text, level, id, pos, isCurrent } = item;
      const levelDiffFromTop = level - topLevel;
      const isTopLevel = levelDiffFromTop === 0;
      const indent = levelDiffFromTop * SUB_MENU_INDENT;

      return `
<div class="aie-toc-item ${isCurrent ? 'is-current' : ''}" data-toc-id="${id}" data-pos="${pos}">
  <span class="aie-toc-item__title ${
    isTopLevel ? "toplevel" : "secondary"
  }" style="margin-left:${indent}px;${isLeft?'width:calc(100% - ' + indent + 'px);':''}">
    <span class="aie-toc-item__symbol"></span>
    <span class="aie-toc-item__text" title="${text}">${text}</span>
  </span>
  <span class="aie-toc-item__dots"></span>
</div>
    `.trim();
    })
    .join("");
}

/**
 * 点击目录条目时滚动到对应位置
 */
export const handleTocClick = (e: Event) => {
  const tocRow = (e?.target as HTMLElement).closest(".aie-toc-item") as HTMLElement;
  if (tocRow) {
    const id = tocRow.dataset.tocId as string;
    const heading = document.getElementById(id);
    if (heading) {
      heading.scrollIntoView({ behavior: "smooth", block: 'start' });
    }
  }
};

export const bindContentScrollHandler = (includeLevels: number[], cb: (id: string) => void) => {
  function debounce(func: Function, wait: number) {
    let timer: number | null = null;
    return function (this: any, ...args: any[]) {
      if (timer) {
        clearTimeout(timer);
      }
      // @ts-ignore
      timer = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
  }

  function onContentScroll(e: Event) {
    const scrollTop = (e.target as HTMLElement).scrollTop;

    const elList = document.querySelectorAll(includeLevels.map((n:number) => `h${n}`).join(', '));
    const headingPositions = Array.prototype.slice.call(elList).map(heading => {
      return {
        id: heading.id,
        offsetTop: heading.offsetTop,
      }
    });

    let closestHeading = null;
    let minDistance = Infinity;
    for (let heading of headingPositions) {
      const distance = Math.abs(heading.offsetTop - scrollTop);
      if (distance < minDistance) {
        minDistance = distance;
        closestHeading = heading;
      }
    }

    if (closestHeading) {
      const tocItems = document.querySelectorAll(".aie-toc-item");
      tocItems.forEach(tocItem => {
        tocItem.classList.remove('is-current');
      })
      const tocItem = document.querySelector(`.aie-toc-item[data-toc-id="${closestHeading.id}"]`) as HTMLElement;
      if (tocItem) {
        tocItem.classList.add('is-current');
        tocItem.scrollIntoView({ behavior: "smooth", block:'start' });
        cb(closestHeading.id);
      }
    }
  }
  const debouncedScrollHandler = debounce(onContentScroll, 100);
  
  const contentEl = document.querySelector(".aie-container__main")!;
  contentEl.addEventListener("scroll", debouncedScrollHandler);
};

export const createTocView = ({
    editor,
    tocItems,
    position = 'left',
    visible = false
  }:{
    editor: InnerEditor,
    tocItems: ITocItem[],
    position: TocPosition,
    visible: boolean,
  }) => {
  const tocDiv = document.querySelector(".aie-container__toc")!;
  tocDiv.classList.remove('aside-toc--is-close', 'aside-toc--is-open');

  if (position === 'left') {
    tocDiv.classList.add(`aside-toc--is-${visible ? 'open' : 'close'}`);

    const asideTocHead = document.createElement('div');
    asideTocHead.innerHTML = createTocHead(visible);
    asideTocHead.addEventListener('click', (e) => {
      if ((e!.target as HTMLElement).closest('svg')) {
        editor.aiEditor.setTocVisible(!editor.aiEditor.options.toc!.visible);
      }
    });
    tocDiv.appendChild(asideTocHead);
  }
  
  if (visible) {
    const tocListEl = document.createElement("div");
    tocListEl.setAttribute("tableOfContents", "");
    tocListEl.classList.add("table-of-contents");

    const tocItemsEl = createTocList(tocItems, position);
    tocListEl.innerHTML = tocItemsEl;
    tocListEl.addEventListener("click", handleTocClick);
    
    tocDiv.appendChild(tocListEl);
  }
}

export const TocGeneratorExt = Extension.create({
  name: "tocGenerator",
  addStorage() {
    return {
      isScrollHandlerBinded: false,
      currentId: '',
    };
  },
  addOptions() {
    return {
      visible: false,
      includeLevels: [1, 2, 3, 4],
      position: 'left',
    };
  },
  addCommands() {
    return {
      generateToc: () => ({ state: { doc } }) => {
        const tocItems = [] as ITocItem[];

        if (this.options.visible) {
          doc.descendants((node, pos) => {
            if (node.type.name === "heading") {
              const level = node.attrs.level;
              if (this.options.includeLevels.includes(level)) {
                const text = node.textContent;
                const id = node.attrs.id;
                tocItems.push({ text, level, id, pos, isCurrent: id === this.storage.currentId });
              }
            }
          });

          if (!this.storage.currentId && tocItems.length > 0) {
            tocItems[0].isCurrent = true;
            this.storage.currentId = tocItems[0].id;
          }
        }

        createTocView({
          tocItems: tocItems,
          position: this.options.position,
          visible:  this.options.visible,
          editor: this.editor! as InnerEditor,
        });

        if (
          this.options.position === 'left' &&
          this.options.visible &&
          tocItems.length > 0 &&
          !this.storage.isScrollHandlerBinded
        ) {
          const updateCurrentTocItem = (id: string) => {
            this.storage.currentId = id;
          }
          bindContentScrollHandler(this.options.includeLevels, updateCurrentTocItem);
          this.storage.isScrollHandlerBinded = true;
        }

        if (this.storage.currentId) {
          const tocItem = (this.editor as InnerEditor).aiEditor.tocEl.querySelector(`[data-toc-id="${this.storage.currentId}"]`)!;
          tocItem.scrollIntoView({ behavior: "instant", block:'start' });
        }

        return true;
      },
    };
  },
});
