import { t } from 'i18next'

export const createStyle = () => {
  const innerStyle = document.createElement('style');
  innerStyle.textContent = `
:host {
  border-right: 1px solid var(--aie-border-color);
  width: 40px;
  overflow: hidden;
}
:host(.is-hovered),
:host(.is-fixed) {
  width: 240px;
}
.outline-view-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.outline-view-wrapper {
  width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--aie-outline-text-color);
  position: sticky;
  left: 0px;
  top: 0;
  background-color: var(--aie-bg-color);
  transition: width 0.1s ease;
  overflow: hidden;
}

:host(.is-hovered) .outline-view-wrapper,
:host(.is-fixed) .outline-view-wrapper {
  width: 240px;
}

.outline-view-head {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--aie-border-color);
}

:host(.is-hovered) .icon-hide {
  display: none;
}
:host(.is-hovered) .icon-fix {
  display: block;
}
:host(.is-fixed) .icon-hide{
  display: block;
}
:host(.is-fixed) .icon-fix {
  display: none;
}
.outline-view-head-toggle {
  padding: 4px;
  cursor: pointer;
  border-radius: 2px;
}
.outline-view-head-toggle:hover {
  background-color: var(--aie-outline-bg-color);
}
.outline-list {
  padding: 16px;
  flex-grow: 1;
  overflow-x: hidden;
  overflow-y: auto;
}
.outline-list::-webkit-scrollbar{ width: 4px; }
.outline-list::-webkit-scrollbar-track-piece { background-color: var(--aie-content-scrollbar-track-piece);}  /* 轨道颜色 */
.outline-list::-webkit-scrollbar-thumb { background-color: var(--aie-content-scrollbar-thumb); }
.outline-list::-webkit-scrollbar-thumb:hover { background-color:var(--aie-content-scrollbar-thumb-hover); }
.outline-list::-webkit-scrollbar-thumb:active { background-color:var(--aie-content-scrollbar-thumb-active); }
:host(.is-hovered) .outline-list,
:host(.is-fixed) .outline-list {
  display: block;
}

.aie-outline-item {
  cursor: pointer;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  width: 100%;
  color: var(--aie-outline-text-color);
}

.aie-outline-item .aie-outline-item__title {
  width: 100%;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
}

.aie-outline-item .aie-outline-item__title .aie-outline-item__symbol {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 100%;
  background: var(--aie-outline-text-color);
}

.aie-outline-item .aie-outline-item__title .aie-outline-item__text {
  display: inline-block;
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  padding: 8px;
}

.aie-outline-item .aie-outline-item__title.toplevel {
  font-weight: bold;
}

.aie-outline-item .aie-outline-item__title.toplevel .aie-outline-item__symbol {
  display: none;
}

.aie-outline-item:hover {
  color: var(--aie-outline-text-color-hover);
  background-color: var(--aie-outline-bg-color);
}

.aie-outline-item:hover .aie-outline-item__symbol {
  background-color: var(--aie-outline-text-color-hover);
}

.aie-outline-item.is-current {
  color: var(--aie-outline-item-active-color);
}

.aie-outline-item.is-current:hover {
  color: var(--aie-outline-item-active-color);
}

/*
indicators style
*/
.indicators-container::-webkit-scrollbar {
  width: 0;
  display: none;
}
.indicators-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 100%;
  padding: 24px 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  justify-content: center;
  scrollbar-width: none; /* Firefox */
}
:host(.is-hovered) .indicators-container,
:host(.is-fixed) .indicators-container {
  width: 0;
}

.outline-indicators {
  width: 20px;
  min-height:100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
}

.linear-indicator {
  height:20px;
  min-height: 16px;
  display: flex;
  align-items: center;
}
.indicator {
  height:2px;
  background: #ddd;
  border-radius: 1px;
}
.is-current > .indicator {
  background-color: var(--aie-outline-item-active-color);
}
`.trim();
  return innerStyle;
}

export const createTemplate = () => {
  const template = document.createElement('template');
  template.innerHTML = `
<div class="outline-view-container" style="">
  <div class="indicators-container">
    <div class="outline-indicators">
    </div>
  </div>

  <div class="outline-view-wrapper" style="">
    <div class="outline-view-head">
      <span class="outline-view-head-text">${t('outline', '大纲')}</span>
      <span class="outline-view-head-toggle">
        <svg class="icon-hide" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg t="1741913503898" class="icon-fix" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2604" width="16" height="16">
          <path d="M911.15102 323.918367L689.632653 102.4c-18.808163-18.808163-50.155102-20.897959-71.053061-2.089796l-267.493878 229.877551-96.130612 14.628572c-6.269388 0-12.538776 4.179592-16.718367 8.359183l-58.514286 58.514286c-20.897959 20.897959-20.897959 54.334694 0 73.142857l152.555102 152.555102L125.387755 844.277551c-12.538776 12.538776-12.538776 31.346939 0 43.885714 6.269388 6.269388 14.628571 10.44898 20.897959 10.44898s16.718367-2.089796 22.987755-8.359184l204.8-204.8 152.555102 152.555102c10.44898 10.44898 22.987755 14.628571 37.616327 14.628572s27.167347-6.269388 37.616326-14.628572l58.514286-58.514285c4.179592-4.179592 8.359184-10.44898 8.359184-16.718368l14.628571-96.130612 227.787755-267.493878c18.808163-25.077551 18.808163-56.42449 0-75.232653zM631.118367 629.028571c-4.179592 4.179592-6.269388 10.44898-6.269387 14.628572l-14.628572 94.040816-45.97551 45.97551-334.367347-334.367347 43.885714-43.885714 94.040817-14.628571c6.269388 0 10.44898-4.179592 14.628571-6.269388l269.583674-229.877551 206.889795 206.889796-227.787755 267.493877z" fill="#666666" p-id="2605"></path>
        </svg>
      </span>
    </div>

    <div class="outline-list">
    </div>
  </div>

</div>  
`.trim();
  return template;
}