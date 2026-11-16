import { at } from "@hollis-labs/ade-core"
import { useAttention, useHub, useSurface } from "@hollis-labs/ade-react"
import type { Square } from "chess.js"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { FILES, type Game } from "./game"
import { chessSurface, SURFACE } from "./surface"

const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }

/**
 * The board. A click selects a square (and shows where its piece can go); a click on one
 * of those moves there. Shift-click picks squares without moving, to point several out.
 * What is selected is the person's attention: the agent sees exactly these squares.
 */
export function Board({ game }: { game: Game }) {
  const hub = useHub()
  const grid = useRef<HTMLDivElement>(null)
  const version = useRef(0)
  useSyncExternalStore(
    (fn) =>
      game.subscribe(() => {
        version.current++
        fn()
      }),
    () => version.current,
  )
  const rect = useCallback(
    (sq: string) =>
      grid.current?.querySelector<HTMLElement>(`[data-square="${sq}"]`)?.getBoundingClientRect() ??
      null,
    [],
  )
  const surface = useSurface(() =>
    chessSurface(game, rect, () => grid.current?.getBoundingClientRect() ?? null),
  )
  // The game changes by itself too (a demonstration playing out): tell the hub each time.
  useEffect(
    () => game.subscribe((why) => (why === "view" ? surface.moved() : surface.changed())),
    [game, surface],
  )
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const watch = new ResizeObserver(() => surface.moved())
    watch.observe(el)
    return () => watch.disconnect()
  }, [surface])

  const [picked, setPicked] = useState<Square[]>([])
  const attention = useAttention()
  // Somebody else cleared the person's selection (a new game): follow.
  useEffect(() => {
    if (!attention.some((a) => a.actor === "user") && picked.length) setPicked([])
  }, [attention, picked.length])
  const pick = (list: Square[]) => {
    setPicked(list)
    hub.attend({
      actor: "user",
      style: "select",
      anchors: list.map((sq) => at(SURFACE, "square", sq, game.describe(sq))),
    })
  }

  const one = picked.length === 1 ? (picked[0] as Square) : null
  const goes = one && !game.demonstrating ? game.legal(one) : []
  const last = game.lastMove()

  const click = (sq: Square, shift: boolean) => {
    if (shift) return pick(picked.includes(sq) ? picked.filter((s) => s !== sq) : [...picked, sq])
    const move = goes.find((m) => m.to === sq)
    if (one && move) {
      pick([])
      void hub.act({
        actor: "user",
        surface: SURFACE,
        action: "move",
        input: { from: one, to: sq },
      })
      return
    }
    pick(one === sq ? [] : [sq])
  }

  const ranks = game.flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]
  const files = game.flipped ? [...FILES].reverse() : FILES
  return (
    <div className="board-wrap" data-demo={game.demonstrating ? "true" : undefined}>
      {/* biome-ignore lint/a11y/useSemanticElements: a chess board is a grid of buttons, not a table of data */}
      <div className="board" ref={grid} role="grid" aria-label="Chess board">
        {ranks.map((rank) =>
          files.map((file, fi) => {
            const sq = `${file}${rank}` as Square
            const p = game.piece(sq)
            const dark = (FILES.indexOf(file) + rank) % 2 === 1
            return (
              <button
                key={sq}
                type="button"
                className="sq"
                data-square={sq}
                data-dark={dark ? "true" : undefined}
                data-picked={picked.includes(sq) ? "true" : undefined}
                data-last={last && (last.from === sq || last.to === sq) ? "true" : undefined}
                data-goes={goes.some((m) => m.to === sq) ? "true" : undefined}
                aria-label={game.describe(sq)}
                aria-pressed={picked.includes(sq)}
                onClick={(e) => click(sq, e.shiftKey)}
              >
                {p && (
                  <span className="piece" data-color={p.color}>
                    {GLYPH[p.type]}
                  </span>
                )}
                {fi === 0 && <i className="coord rank">{rank}</i>}
                {rank === ranks[7] && <i className="coord file">{file}</i>}
              </button>
            )
          }),
        )}
      </div>
      {game.demonstrating && (
        <div className="demo-bar">
          <span>Demonstration{game.note ? `: ${game.note}` : ""}. Your game is untouched.</span>
          <button
            type="button"
            onClick={() =>
              void hub.act({ actor: "user", surface: SURFACE, action: "back_to_game", input: {} })
            }
          >
            Back to the game
          </button>
        </div>
      )}
    </div>
  )
}
