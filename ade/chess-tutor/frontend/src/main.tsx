import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@hollis-labs/ade-react/styles.css"
import "./app.css"
import { App } from "./app"

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
