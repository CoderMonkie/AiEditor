import { AiEditorEvent, AiEditorEventListener, AiEditorOptions } from '../../core/AiEditor';
import { InnerEditor } from '../../core/AiEditor';
import { EditorEvents } from '@tiptap/core';
import { createStyle, createTemplate } from './utils';

declare global {
  interface HTMLElementTagNameMap {
    'aie-outline-view': OutlineView;
  }
}

export interface IOutline {
  text: string;
  level: number;
  id: string;
  pos: number;
  isCurrent?: boolean;
}

// 定义组件的三种状态
type OutlineState = 'is-collapsed' | 'is-hovered' | 'is-fixed';

export class OutlineView extends HTMLElement implements AiEditorEventListener {
  private editor?: InnerEditor;
  private outlines: IOutline[] = [];
  private options: any;
  private currentId: string = '';
  private _shadowRoot: ShadowRoot;
  private state: OutlineState = 'is-collapsed'; // 默认状态为折叠

  private indicatorContainerEl!: HTMLDivElement;
  private outlineListEl!: HTMLDivElement;
  private indicatorsEl!: HTMLDivElement;
  private btnToggleEl!: HTMLElement;

  private hoverTimer: number | null = null;

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.btnToggleEl = this._shadowRoot.querySelector('.outline-view-head-toggle') as HTMLElement;
    this.indicatorContainerEl = this._shadowRoot.querySelector('.indicators-container') as HTMLDivElement;
    this.indicatorsEl = this._shadowRoot.querySelector('.outline-indicators') as HTMLDivElement;
    this.outlineListEl = this._shadowRoot.querySelector('.outline-list') as HTMLDivElement;
  }
  private initEvents() {
    this.indicatorContainerEl.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    //
    this.outlineListEl.addEventListener('click', this.handleOutlineClick);
    //
    this.btnToggleEl.addEventListener('click', this.handleToggleClick);
    //
    this.bindContentScrollHandler();
  }

  private handleMouseEnter = () => {
    this.hoverTimer && clearTimeout(this.hoverTimer);
    this.hoverTimer = window.setTimeout(() => {
      if (this.state === 'is-collapsed' && this.outlines.length > 0) {      
        this.updateState('is-hovered');
        
        this.currentId &&  setTimeout(() => {
          const tocItem = this.outlineListEl.querySelector(`.aie-outline-item[data-outline-id="${this.currentId}"]`) as HTMLElement;
          if (tocItem) {
            tocItem.scrollIntoView({ behavior: "auto", block: 'center' });
          }
        }, 50); // 短暂延迟确保DOM已更新
      }
    }, 300);
  }

  private handleMouseLeave = () => {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    if (this.state === 'is-hovered') {
      this.updateState('is-collapsed');
    }
  }

  private handleToggleClick = () => {
    switch (this.state) {
      case 'is-collapsed':
        break;
      case 'is-hovered':
        this.updateState('is-fixed');
        // 通知编辑器状态变化
        this.options.onVisibleChange?.(true);
        break;
      case 'is-fixed':
        this.updateState('is-collapsed');
        // 通知编辑器状态变化
        this.options.onVisibleChange?.(false);
        break;
    
      default:
        break;
    }
  }

  private updateState(newState: OutlineState) {
    const outerMainEl = this.editor?.aiEditor.mainEl;
    this.state = newState;
    // 移除所有状态类
    this.classList.remove('is-collapsed', 'is-hovered', 'is-fixed');
    outerMainEl?.classList.remove(
      'with-outline--is-collapsed',
      'with-outline--is-hovered',
      'with-outline--is-fixed'
    );
    // 添加新状态类
    this.classList.add(newState);
    outerMainEl?.classList.add(`with-outline--${newState}`);

    this.generateOutline(this.editor!);
  }

  private render() {
    this.shadowRoot!.appendChild(createStyle());
    this.shadowRoot!.appendChild(createTemplate().content.cloneNode(true));
  }

  onCreate(props: EditorEvents['create'], options: AiEditorOptions) {
    this.editor = props.editor as InnerEditor;
    this.options = options.outline;

    setTimeout(() => {
      this.updateState(this.options.visible?'is-fixed':'is-collapsed');
    });
  }
  onTransaction({transaction}: EditorEvents['transaction']) {
    if (transaction.docChanged) {
      const hasHeadingChange = transaction.steps.some(step => {
        const map = step.getMap();
        let changed = false;
        
        map.forEach((oldStart, oldEnd, newStart, newEnd) => {
          // 检查旧范围和新范围中的节点
          const checkRange = (doc: Node, start: number, end: number) => {
            (doc as any).nodesBetween(start, end, (node: { type: { name: string; }; }) => {
              if (node.type.name === "heading") {
                changed = true;
                return false;
              }
              return true;
            });
          };

          checkRange(transaction.before as any, oldStart, oldEnd);
          !changed && checkRange(transaction.doc as any, newStart, newEnd);
          
          return changed;
        });
        return changed;
      });

      if (hasHeadingChange) {
        this.generateOutline(this.editor!);
      }
    }
  }
  onEditableChange() {}

  private createOutlineList() {
    if (this.outlines.length === 0) {
      return "";
    }

    const topLevel = Math.min(...this.outlines.map(item => item.level));
    const SUB_MENU_INDENT = 16;

    return this.outlines
      .map((item) => {
        const { text, level, id, pos, isCurrent } = item;
        const levelDiffFromTop = level - topLevel;
        const isTopLevel = levelDiffFromTop === 0;
        const indent = levelDiffFromTop * SUB_MENU_INDENT;

        return `
          <div class="aie-outline-item ${isCurrent ? 'is-current' : ''}" data-outline-id="${id}" data-pos="${pos}">
            <span class="aie-outline-item__title ${isTopLevel ? "toplevel" : "secondary"}" 
                  style="margin-left:${indent}px;${'width:calc(100% - ' + indent + 'px);'}">
              <span class="aie-outline-item__symbol"></span>
              <span class="aie-outline-item__text" title="${text}">${text}</span>
            </span>
          </div>
        `.trim();
      })
      .join("");
  }

  private createIndicators() {
    if (this.outlines.length === 0) {
      return "";
    }

    // 获取所有不同的level值并排序
    const uniqueLevels = [...new Set(this.outlines.map(item => item.level))].sort((a, b) => a - b);
    // 根据uniqueLevels的顺序动态生成宽度映射
    const widths = [24, 20, 16]; // 前三个level对应的宽度值
    const DEFAULT_WIDTH = 12; // 第四个及之后的level宽度

    return this.outlines.map(item => { // 改为遍历全部outlines
      const { level, id, isCurrent } = item;
      // 根据当前level在uniqueLevels中的索引决定宽度
      const levelIndex = uniqueLevels.indexOf(level);
      const width = widths[levelIndex] || DEFAULT_WIDTH;

      return `
<div class="linear-indicator level-${level} id-${id} ${isCurrent?'is-current':''}">
  <div class="indicator" style="width:${width}px"></div>
</div>
      `.trim();
    }).join('');
  }

  private handleOutlineClick = (e: Event) => {
    const outlineItemEl = (e?.target as HTMLElement).closest(".aie-outline-item") as HTMLElement;
    if (outlineItemEl) {
      const id = outlineItemEl.dataset.outlineId as string;
      const heading = document.getElementById(id);
      if (heading) {
        heading.scrollIntoView({ behavior: "smooth", block: 'start' });
      }
    }
  };

  private bindContentScrollHandler() {
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
    const includeLevels = this.options.includeLevels;
    const editorMainEl = this.editor!.aiEditor.mainEl;
    const outlineView = this.shadowRoot;
  
    const updateCurrentTocItem = (id: string) => {
      this.currentId = id;
    }
    function indicatorHandler(e: Event) {
      const scrollTop = (e.target as HTMLElement).scrollTop;
      const elList = editorMainEl.querySelectorAll(includeLevels.map((n:number) => `h${n}`).join(', '));
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
        // 更新指示器的当前状态
        const indicators = outlineView!.querySelectorAll(".linear-indicator");
        indicators.forEach(indicator => {
          indicator.classList.remove('is-current');
        });
        
        const currentIndicator = outlineView!.querySelector(`.linear-indicator.id-${closestHeading.id}`);
        if (currentIndicator) {
          currentIndicator.classList.add('is-current');

          // 滚动指示器到可见区域
          const indicatorsContainer = outlineView!.querySelector('.indicators-container') as HTMLElement;
          if (indicatorsContainer) {
            currentIndicator.scrollIntoView({ behavior: "smooth", block: 'center' });
          }
          
          updateCurrentTocItem(closestHeading.id);
        }
      }
    }
    function outlineHandler(e: Event) {
      const scrollTop = (e.target as HTMLElement).scrollTop;
      const elList = editorMainEl.querySelectorAll(includeLevels.map((n:number) => `h${n}`).join(', '));
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
        const outlineRows = outlineView!.querySelectorAll(".aie-outline-item");
        outlineRows.forEach(row => {
          row.classList.remove('is-current');
        })
        const outlineItem = outlineView!.querySelector(`.aie-outline-item[data-outline-id="${closestHeading.id}"]`) as HTMLElement;
        if (outlineItem) {
          outlineItem.classList.add('is-current');
          outlineItem.scrollIntoView({ behavior: "smooth", block:'nearest' });
          updateCurrentTocItem(closestHeading.id);
        }
      }
    }

    const debouncedScrollHandler = debounce((event:Event) => {
      if (this.state === 'is-collapsed') {
        indicatorHandler(event);
      } else {
        outlineHandler(event);
      }
    }, 100);

    // aie-content-scrollable
    const contentEl = this.editor!.aiEditor.mainEl.querySelector(".aie-content-scrollable");
    contentEl && contentEl.addEventListener("scroll", debouncedScrollHandler);
  }


  private generateOutline  ({ state: { doc } }: InnerEditor){
    const outlines = [] as IOutline[];

    doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const level = node.attrs.level;
        if (this.options.includeLevels.includes(level)) {
          const text = node.textContent;
          const id = node.attrs.id;
          outlines.push({ text, level, id, pos, isCurrent: id === this.currentId });
        }
      }
    });

    const outerMainEl = this.editor?.aiEditor.mainEl;
    // 如果没有提纲项，重置当前选中状态
    if (outlines.length === 0) {
      this.currentId = '';
      // 添加 no-data 类
      outerMainEl?.classList.add('with-outline--no-data');
    } else {
      if (!this.currentId) {
        outlines[0].isCurrent = true;
        this.currentId = outlines[0].id;
      }
      // 移除 no-data 类
      outerMainEl?.classList.remove('with-outline--no-data');
    }
    this.outlines = outlines;

    this.createOutlineView();
  }

  createOutlineView() {
    const outlineContents = this.createOutlineList();
    this.outlineListEl.innerHTML = outlineContents;

    const indicatorContents = this.createIndicators();
    this.indicatorsEl.innerHTML = indicatorContents;

    setTimeout(() => {
      this.fireScroll();
    });
  }

  private fireScroll() {
    if (!this.currentId) return;
    if (this.state === 'is-collapsed') {
      // scroll indicator
      this.indicatorsEl.querySelector('.is-current')?.scrollIntoView({ behavior: "auto", block:'center' });
    } else {
      // scroll outline
      this.outlineListEl.querySelector('.is-current')?.scrollIntoView({ behavior: "auto", block:'center' });
    }
  }

  public onEvent (event: AiEditorEvent) {
    if (event.type === 'outlineVisibleChange') {
      const visible = event.value;
      this.updateState(visible ? 'is-fixed': 'is-collapsed');
      this.options.onVisibleChange?.(visible);
    }
  }
}