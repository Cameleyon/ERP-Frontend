import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { trackApplicationVisit } from "./utils/visitTracking"
import "./index.css"

trackApplicationVisit()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
