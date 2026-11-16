/**
 * The chess tutor: a board, a guide and an agent over the same game. The application
 * supplies the game (game.ts) and says how it is a surface (surface.ts); pointing, the
 * guide and the conversation come from the ADE packages.
 */
import { createAgentSession } from "@hollis-labs/ade-agent"
import { adeTools, createHub, type GuideState, type HubEvent } from "@hollis-labs/ade-core"
import { AdeProvider, AgentPanel, AttentionLayer, GuideBar } from "@hollis-labs/ade-react"
import { useEffect, useSyncExternalStore } from "react"
import { Board } from "./board"
import { Game, type Saved } from "./game"
import { SURFACE } from "./surface"

const GAME_KEY = "chess-tutor.game"
const GUIDE_KEY = "chess-tutor.guide"

const read = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
const write = (key: string, value: unknown) => {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not kept this time.
  }
}

const hub = createHub()
const game = new Game()
const kept = read<Saved>(GAME_KEY)
if (kept) game.load(kept)
if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) game.pace = 0
game.subscribe(() => write(GAME_KEY, game.save()))

/** What the model is shown with each message: the board as it is, and what is selected. */
function context() {
  if (!hub.has(SURFACE)) return undefined
  const { actions: _a, checks: _c, id: _i, ...seen } = hub.observe(SURFACE)
  const guide = hub.guideState()
  return {
    board: seen,
    ...(guide && guide.status !== "stopped"
      ? {
          guide: {
            title: guide.guide.title,
            status: guide.status,
            step: guide.index + 1,
            of: guide.guide.steps.length,
          },
        }
      : {}),
  }
}

const session = createAgentSession({ tools: () => adeTools(hub), context })

// In development the pieces are on window, to drive the page from a test or the console.
if (import.meta.env.DEV)
  Object.assign(window, { __ade: { hub, game, session, tools: () => adeTools(hub) } })

// The guide is kept as it goes, and the agent is told when it ends: the person should not
// have to say "I finished" for the tutor to carry on.
hub.subscribe((e: HubEvent) => {
  if (e.type !== "guide") return
  write(
    GUIDE_KEY,
    e.state && (e.state.status === "running" || e.state.status === "paused") ? e.state : null,
  )
  if (e.what !== "done" || !e.state) return
  const s = e.state
  const how = s.history.map((h) => `${h.step} ${h.how}`).join(", ")
  void session.send(
    `<guide-event>\nThe guide "${s.guide.title}" has finished. The application wrote this; the person did not type it. How each step ended: ${how}. The board is in the context. Say one or two sentences on how it went (be specific to what they did), then offer the natural next thing or ask what they want. Do not start another guide unless it clearly follows.\n</guide-event>`,
    { auto: `Guide finished: ${s.guide.title}` },
  )
})

let gameVersion = 0
game.subscribe(() => {
  gameVersion++
})
/** Re-render when the game changes. */
const useGame = () => useSyncExternalStore(game.subscribe.bind(game), () => gameVersion)

function Moves() {
  useGame()
  const moves = game.history()
  const rows: string[] = []
  for (let i = 0; i < moves.length; i += 2)
    rows.push(`${i / 2 + 1}. ${moves[i]}${moves[i + 1] ? ` ${moves[i + 1]}` : ""}`)
  const s = game.status()
  return (
    <div className="moves">
      <div className="moves-line">
        {game.demonstrating ? <em>demonstration </em> : null}
        {rows.length ? rows.join("  ") : "No moves yet."}
      </div>
      <div className="moves-state">
        {s.checkmate
          ? "Checkmate."
          : s.stalemate
            ? "Stalemate."
            : s.draw
              ? "Draw."
              : `${game.turn() === "white" ? "White" : "Black"} to move${s.check ? " · check" : ""}`}
      </div>
    </div>
  )
}

function Controls() {
  const act = (action: string, input: Record<string, unknown> = {}) =>
    void hub.act({ actor: "user", surface: SURFACE, action, input })
  return (
    <div className="controls">
      <button type="button" onClick={() => act("undo")}>
        Take back
      </button>
      <button type="button" onClick={() => game.flip()}>
        Flip board
      </button>
      <button type="button" onClick={() => act("set_position")}>
        New game
      </button>
      <span>
        Click a piece, then where it goes. Shift-click squares to point them out to the tutor.
      </span>
    </div>
  )
}

export function App() {
  // Take up a guide kept from before, once the board is there to guide on.
  useEffect(() => {
    const saved = read<GuideState>(GUIDE_KEY)
    if (saved && !hub.guideState()) hub.restoreGuide(saved)
  }, [])
  return (
    <AdeProvider hub={hub}>
      <main className="app">
        <section className="left">
          <Board game={game} />
          <Moves />
          <Controls />
        </section>
        <section className="right">
          <GuideBar
            onAsk={(step) =>
              void session.send(
                `I have a question about this step of the guide: “${step.say}” Explain it another way, pointing at the board.`,
              )
            }
          />
          <AgentPanel
            session={session}
            title="Tutor"
            placeholder="Ask about the position, or ask to be taught something…"
          />
        </section>
      </main>
      <AttentionLayer agentLabel="Tutor" />
    </AdeProvider>
  )
}
