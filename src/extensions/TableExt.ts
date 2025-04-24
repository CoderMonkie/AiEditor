import { Extension } from '@tiptap/core'
import { CellSelection, selectedRect, splitCellWithType, addColumn, addRow, TableRect } from 'prosemirror-tables'
import { TextSelection, EditorState, Transaction } from 'prosemirror-state'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        tableExt: {
            splitCells: () => ReturnType,
            addColumnsBefore: () => ReturnType,
            addColumnsAfter: () => ReturnType,
            addRowsBefore: () => ReturnType,
            addRowsAfter: () => ReturnType
        }
    }
}

export const getSelectedRect = (state: EditorState): {
    rows: { from: number, to: number, span: number },
    cols: { from: number, to: number, span: number },
    rect: TableRect
} => {
    const rect = selectedRect(state);
    return {
        rect,
        rows: { from: rect.top, to: rect.bottom, span: rect.bottom - rect.top },
        cols: { from: rect.left, to: rect.right, span: rect.right - rect.left },
    };
}

export const TableExt = Extension.create({
    name: 'tableExt',

    addCommands() {
        return {
            /**
             * splitCellWithType 函数在内部检查了选区，
             * 如果是多选单元格（ $anchorCell.pos != $headCell.pos ）就会直接返回 false
             * 选择多个单元格时就没有效果
             * 解决办法：在拆分每个单元格之前临时更改选区，确保每次只选中一个单元格
             */
            splitCells: () => ({ state, dispatch }) => {
                const sel = state.selection
                if (!(sel instanceof CellSelection)) return false

                const cellsToSplit: number[] = []
                let shouldSplit = false

                // 遍历选中单元格并收集可拆分的单元格
                sel.forEachCell((cell, pos) => {
                    if (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1) {
                        cellsToSplit.push(pos)
                        shouldSplit = true
                    }
                })

                if (!shouldSplit) return false

                if (dispatch) {
                    let tr = state.tr

                    // 反向处理避免位置偏移
                    cellsToSplit.reverse().forEach(pos => {
                        // 为每个单元格创建一个单独的选区
                        const $pos = tr.doc.resolve(pos)
                        const cellSelection = CellSelection.create(tr.doc, $pos.pos)
                        tr = tr.setSelection(cellSelection)

                        // 获取单元格类型
                        const cell = tr.doc.nodeAt(pos)
                        if (!cell) return;

                        // 创建一个临时状态来应用拆分操作
                        const tempState = EditorState.create({
                            doc: tr.doc,
                            selection: tr.selection,
                            schema: state.schema,
                            plugins: state.plugins
                        })

                        // 使用临时的dispatch函数来捕获splitCellWithType生成的transaction
                        let tempTr: Transaction | null = null
                        const tempDispatch = (t: Transaction) => {
                            tempTr = t
                        }

                        // 不使用 splitCell 是为了保持拆分单元格的一致性
                        splitCellWithType(() => cell.type)(tempState, tempDispatch)

                        // 如果成功生成了transaction，将其应用到我们的tr上
                        if (tempTr) {
                            // 只应用步骤，不应用选区变化
                            //@ts-ignore
                            tempTr.steps.forEach(step => {
                                tr = tr.step(step)
                            })
                        }
                    })

                    // 恢复原始选区
                    const finalSelection = TextSelection.create(tr.doc, sel.from)
                    tr = tr.setSelection(finalSelection)

                    dispatch(tr)
                }

                return true
            },

            /**
             * 在选区前一次性添加多列
             */
            addColumnsBefore: () => ({ state, dispatch }) => {
                const sel = state.selection
                if (!(sel instanceof CellSelection)) return false

                const { cols: { from, to, span }, rect } = getSelectedRect(state)

                if (span < 1) return false

                if (dispatch) {
                    let tr = state.tr

                    // 在一个事务中添加多列
                    for (let i = from; i < to; i++) {
                        tr = addColumn(tr, rect, from)
                    }

                    dispatch(tr)
                }

                return true
            },

            /**
             * 在选区后一次性添加多列
             */
            addColumnsAfter: () => ({ state, dispatch }) => {
                const sel = state.selection
                if (!(sel instanceof CellSelection)) return false

                const { cols: { from, to, span }, rect } = getSelectedRect(state)

                if (span < 1) return false

                if (dispatch) {
                    let tr = state.tr

                    // 在一个事务中添加多列
                    for (let i = from; i < to; i++) {
                        tr = addColumn(tr, rect, to)
                    }

                    dispatch(tr)
                }

                return true
            },

            /**
             * 在选区前一次性添加多行
             */
            addRowsBefore: () => ({ state, dispatch }) => {
                const sel = state.selection
                if (!(sel instanceof CellSelection)) return false

                const { rows: { from, to, span }, rect } = getSelectedRect(state)

                if (span < 1) return false

                if (dispatch) {
                    let tr = state.tr

                    // 在一个事务中添加多行
                    for (let i = from; i < to; i++) {
                        tr = addRow(tr, rect, from)
                    }

                    dispatch(tr)
                }

                return true
            },

            /**
             * 在选区后一次性添加多行
             */
            addRowsAfter: () => ({ state, dispatch }) => {
                const sel = state.selection
                if (!(sel instanceof CellSelection)) return false

                const { rows: { from, to, span }, rect } = getSelectedRect(state)

                if (span < 1) return false

                if (dispatch) {
                    let tr = state.tr

                    // 在一个事务中添加多行
                    for (let i = from; i < to; i++) {
                        tr = addRow(tr, rect, to)
                    }

                    dispatch(tr)
                }

                return true
            }
        }
    },

})