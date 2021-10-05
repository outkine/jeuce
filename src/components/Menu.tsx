import * as React from "react"

export default function Menu({ clear, apply }) {
  return (
    <ul>
      <li>
        <button onClick={clear}>Clear</button>
      </li>
      <li>
        <button onClick={apply}>Apply</button>
      </li>
    </ul>
  )
}
