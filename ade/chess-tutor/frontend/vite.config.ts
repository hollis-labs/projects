import { defineConfig } from "vite"

// The Go server (../cmd) serves the built page and the agent host; in development the page
// is served here and /api goes to it.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  server: { port: 5199, proxy: { "/api": process.env.CHESS_TUTOR_API ?? "http://127.0.0.1:8791" } },
  build: { outDir: "dist", emptyOutDir: true },
})
