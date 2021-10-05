import * as React from "react"
import { useState } from "react"
import { hot } from "react-hot-loader"

import "./../assets/scss/App.scss"
import Editor from "./Editor"

function App() {
  const defaultCode = `
function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
}
  `
  const [code, setCode] = useState(defaultCode)

  return (
    <div className="app">
      <h1>Jeuce</h1>
      <Editor setCode={setCode} />
    </div>
  )
}

declare let module: Record<string, unknown>

export default hot(module)(App)
