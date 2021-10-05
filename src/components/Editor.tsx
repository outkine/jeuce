import * as React from "react"
import { useEffect, useRef } from "react"
import { render } from "react-dom"

import { basicSetup, EditorState } from "@codemirror/basic-setup"
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view"
import { javascript } from "@codemirror/lang-javascript"
import { syntaxTree } from "@codemirror/language"
import { Tooltip, showTooltip } from "@codemirror/tooltip"
import { StateField } from "@codemirror/state"
import Menu from "./Menu"

class NumWidget extends WidgetType {
  constructor(readonly num: number, readonly from: number) {
    super()
  }

  eq(other: NumWidget) {
    return this.from === other.from
  }

  toDOM() {
    const wrap = document.createElement("div")
    wrap.dataset.from = this.from.toString()
    wrap.className = "cm-num-widget"
    const incBtn = document.createElement("button")
    incBtn.innerText = "+"
    incBtn.className = "cm-inc-widget"
    wrap.appendChild(incBtn)
    const decBtn = document.createElement("button")
    decBtn.innerText = "−"
    decBtn.className = "cm-dec-widget"
    wrap.appendChild(decBtn)
    return wrap
  }

  ignoreEvent() {
    return false
  }
}

class ColorWidget extends WidgetType {
  constructor(readonly color: string, readonly from: number) {
    super()
  }

  eq(other: ColorWidget) {
    return this.from === other.from
  }

  toDOM() {
    const wrap = document.createElement("input")
    wrap.dataset.from = this.from.toString()
    wrap.type = "color"
    wrap.className = "cm-color-widget"
    wrap.style.background = this.color
    return wrap
  }

  ignoreEvent() {
    return false
  }
}

function findWidgets(view: EditorView) {
  const widgets = []
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (type, from, to) => {
        if (type.name === "Number") {
          const num = parseFloat(view.state.doc.sliceString(from, to))
          const deco = Decoration.widget({
            widget: new NumWidget(num, from),
            side: 1,
          })
          widgets.push(deco.range(to))
        } else if (type.name === "String") {
          // + 1 and - 1 to avoid the quotation marks
          const val = view.state.doc.sliceString(from + 1, to - 1)
          if (val.match(/^#\w{6}$/)) {
            const deco = Decoration.widget({
              widget: new ColorWidget(val, from),
              side: 1,
            })
            widgets.push(deco.range(to))
          }
        }
      },
    })
  }
  return Decoration.set(widgets)
}

const widgetsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = findWidgets(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged)
        this.decorations = findWidgets(update.view)
    }
  },
  {
    decorations: (v) => v.decorations,

    eventHandlers: {
      mousedown: (e, view) => {
        const target = e.target as HTMLElement
        if (
          target.classList.contains("cm-inc-widget") ||
          target.classList.contains("cm-dec-widget")
        )
          return changeNum(
            view,
            view.posAtDOM(target),
            target.classList.contains("cm-inc-widget"),
            parseInt(target.parentElement!.dataset.from),
          )
      },
      input: (e, view) => {
        const target = e.target as HTMLInputElement
        if (target.classList.contains("cm-color-widget"))
          return changeColor(
            view,
            view.posAtDOM(target),
            target.value,
            parseInt(target.dataset.from),
          )
      },
    },
  },
)

function changeNum(
  view: EditorView,
  pos: number,
  isInc: boolean,
  from: number,
) {
  const num = parseFloat(view.state.doc.sliceString(from, pos))
  view.dispatch({
    changes: {
      from,
      to: pos,
      insert: (isInc ? num + 1 : num - 1).toString(),
    },
  })
  return true
}

function changeColor(
  view: EditorView,
  pos: number,
  color: string,
  from: number,
) {
  view.dispatch({
    changes: {
      from,
      to: pos,
      insert: `"${color}"`,
    },
  })
  return true
}

function getTooltips(state: EditorState, props): readonly Tooltip[] {
  return state.selection.ranges
    .filter((range) => !range.empty)
    .map((range) => {
      let line = state.doc.lineAt(range.head)
      let text = line.number + ":" + (range.head - line.from)
      return {
        pos: range.head,
        above: true,
        strictSide: true,
        create: () => {
          let dom = document.createElement("div")
          dom.textContent = text
          render(React.createElement(Menu, props), dom)
          return { dom }
        },
      }
    })
}

type MenuProps = {
  clear: () => void
}

const tooltipField = (props) =>
  StateField.define<readonly Tooltip[]>({
    create: (state) => getTooltips(state, props),

    update(tooltips, tr) {
      if (!tr.docChanged && !tr.selection) return tooltips
      return getTooltips(tr.state, props)
    },

    provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
  })

const tooltipPlugin = ViewPlugin.define({})

type Props = {
  setCode: (string) => null
}

export default function Editor({ setCode }) {
  const cmParent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    new EditorView({
      state: EditorState.create({
        extensions: [
          basicSetup,
          javascript(),
          widgetsPlugin,
          EditorView.updateListener.of((v: ViewUpdate) => {
            if (v.docChanged) {
              setCode(v.state.doc.sliceString(0))
            }
          }),
          tooltipField({
            clear: () => console.log("Clear!"),
            apply: () => console.log("Apply!"),
          }),
        ],
      }),
      parent: cmParent.current,
    })
  }, [])

  return <div ref={cmParent} />
}
