/**
 * The board as an ADE surface: what it shows, what can be done on it, what can be asked of
 * it, and where each square is on screen. This file is the whole of what the application
 * tells ADE about chess.
 */
import type { ActOutcome, Anchor, SurfaceAdapter } from "@hollis-labs/ade-core"
import { type Game, isSquare } from "./game"

export const SURFACE = "board"

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
})
const str = (description: string) => ({ type: "string", description })

/** `rect` says where a square is on screen now (the board component knows). */
export function chessSurface(
  game: Game,
  rect: (square: string) => DOMRect | null,
  whole: () => DOMRect | null,
): SurfaceAdapter {
  return {
    info: { id: SURFACE, app: "chess", title: "Chess board" },
    observe: () => {
      const s = game.status()
      const history = game.history()
      const pieces = game.pieces()
      const last = game.lastMove()
      const state = s.checkmate
        ? "Checkmate."
        : s.stalemate
          ? "Stalemate."
          : s.draw
            ? "Drawn."
            : `${game.turn() === "white" ? "White" : "Black"} to move${s.check ? ", in check" : ""}.`
      return {
        resource: { ref: `chess://game/${game.id}`, rev: game.rev() },
        summary: [
          game.demonstrating
            ? `A DEMONSTRATION is on the board${game.note ? ` (${game.note})` : ""}; the game itself is untouched and returns with back_to_game.`
            : "The game is on the board.",
          state,
          `White: ${pieces.white.join(" ")}. Black: ${pieces.black.join(" ")}.`,
          history.length ? `Moves so far: ${history.join(" ")}.` : "No moves yet.",
          `The parts are the 64 squares: kind "square", id a1 to h8.`,
        ].join(" "),
        state: {
          mode: game.demonstrating ? "demonstration" : "game",
          fen: game.fen(),
          turn: game.turn(),
          ...s,
          last_move: last?.san ?? null,
          legal_moves: game.demonstrating ? [] : game.legal().map((m) => m.san),
          orientation: game.flipped ? "black at the bottom" : "white at the bottom",
        },
        actions: [
          {
            name: "move",
            level: "act",
            description:
              "Make a move in the game for the side to move: give san (Nf3, exd5, O-O) or from and to squares. It is refused if it is not legal, with the legal moves. Only move when the person asked you to play a side or to make a move; do not play their moves for them.",
            input_schema: obj({
              san: str("The move in algebraic notation."),
              from: str("The square moved from, e.g. g1."),
              to: str("The square moved to, e.g. f3."),
              promotion: { type: "string", enum: ["q", "r", "b", "n"] },
            }),
          },
          {
            name: "legal_moves",
            level: "read",
            description: "The legal moves now: all of them, or those of the piece on one square.",
            input_schema: obj({ square: str("A square, to list only that piece's moves.") }),
          },
          {
            name: "show_line",
            level: "act",
            description:
              "Demonstrate a line on the board without touching the game: from the game's position the moves are played out one after another for the person to watch. Use it to show what would happen (a threat, a trap, a plan). Every move is checked: if one is not legal nothing is shown and you are told which. End it with back_to_game before the game goes on.",
            input_schema: obj(
              {
                moves: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 16,
                  description:
                    "The moves in algebraic notation, in order, starting with the side to move.",
                },
                note: str("A few words on what this line shows."),
              },
              ["moves"],
            ),
          },
          {
            name: "back_to_game",
            level: "act",
            description: "End the demonstration: the game is on the board again exactly as it was.",
            input_schema: obj({}),
          },
          {
            name: "undo",
            level: "act",
            description: "Take back the last move of the game.",
            input_schema: obj({}),
          },
          {
            name: "set_position",
            level: "act",
            description:
              "Put a position on the board to teach from: a FEN, or leave fen out for the starting position. It becomes the game. The game that was there is kept and comes back with restore_game.",
            input_schema: obj({
              fen: str("The position in FEN. Left out: the starting position."),
            }),
          },
          {
            name: "restore_game",
            level: "act",
            description: "Go back to the game that was on the board before the last set_position.",
            input_schema: obj({}),
          },
        ],
        checks: [
          {
            name: "piece_on",
            description: "A piece stands on a square.",
            args_schema: obj(
              {
                square: str("e.g. f3"),
                piece: str("Colour and letter: wN, bQ, wP. Left out: any piece."),
              },
              ["square"],
            ),
          },
          {
            name: "last_move",
            description: "The last move of the game was this one.",
            args_schema: obj({ san: str("e.g. Nf3") }, ["san"]),
          },
          {
            name: "moves_played",
            description: "At least this many moves (plies) have been played in the game.",
            args_schema: obj({ count: { type: "number" } }, ["count"]),
          },
          {
            name: "turn",
            description: "It is this side's move.",
            args_schema: obj({ color: { type: "string", enum: ["white", "black"] } }, ["color"]),
          },
          { name: "in_check", description: "The side to move is in check." },
          { name: "game_over", description: "The game has ended." },
          {
            name: "in_game",
            description: "No demonstration is showing: the game is on the board.",
          },
        ],
      }
    },
    act: (action, input): ActOutcome => {
      switch (action) {
        case "move": {
          const r = game.move(
            input as { san?: string; from?: string; to?: string; promotion?: string },
          )
          if (!r.ok) return { outcome: "rejected", code: "invalid", reason: r.reason }
          const s = game.status()
          return {
            outcome: "applied",
            data: { played: r.san, ...(s.over ? s : {}), ...(s.check ? { check: true } : {}) },
          }
        }
        case "legal_moves": {
          const sq = input.square
          if (sq !== undefined && !isSquare(sq))
            return {
              outcome: "rejected",
              code: "invalid",
              reason: `"${String(sq)}" is not a square.`,
            }
          return {
            outcome: "applied",
            data: game.legal(isSquare(sq) ? sq : undefined).map((m) => m.san),
          }
        }
        case "show_line": {
          const moves = Array.isArray(input.moves) ? input.moves.map(String) : []
          const r = game.showLine(
            moves,
            typeof input.note === "string" ? input.note.slice(0, 120) : "",
          )
          return r.ok
            ? {
                outcome: "applied",
                data: {
                  showing: r.shown,
                  note: "The game is untouched. Call back_to_game when you are done showing it.",
                },
              }
            : { outcome: "rejected", code: "invalid", reason: r.reason }
        }
        case "back_to_game":
          return game.endDemo()
            ? { outcome: "applied" }
            : { outcome: "rejected", code: "invalid", reason: "No demonstration is showing." }
        case "undo": {
          const r = game.undo()
          return r.ok
            ? { outcome: "applied", data: { took_back: r.san } }
            : {
                outcome: "rejected",
                code: "invalid",
                reason: game.demonstrating
                  ? "A demonstration is showing."
                  : "There is no move to take back.",
              }
        }
        case "set_position": {
          const r = game.newGame(
            typeof input.fen === "string" && input.fen.trim() ? input.fen.trim() : undefined,
          )
          return r.ok
            ? { outcome: "applied" }
            : { outcome: "rejected", code: "invalid", reason: r.reason }
        }
        case "restore_game":
          return game.restore()
            ? { outcome: "applied" }
            : {
                outcome: "rejected",
                code: "invalid",
                reason: "There is no earlier game to go back to.",
              }
      }
      return { outcome: "rejected", code: "invalid", reason: `The board does not do "${action}".` }
    },
    check: (name, args) => {
      switch (name) {
        case "piece_on": {
          if (!isSquare(args.square)) return false
          const p = game.piece(args.square)
          if (!p) return false
          return typeof args.piece === "string" && args.piece
            ? `${p.color}${p.type.toUpperCase()}` === normalPiece(args.piece)
            : true
        }
        case "last_move":
          return !game.demonstrating && clean(game.lastMove()?.san) === clean(args.san)
        case "moves_played":
          return !game.demonstrating && game.history().length >= Number(args.count ?? 0)
        case "turn":
          return game.turn() === args.color
        case "in_check":
          return game.status().check
        case "game_over":
          return game.status().over
        case "in_game":
          return !game.demonstrating
      }
      return false
    },
    has: (t) => t.kind === "square" && isSquare(t.id),
    bounds: () => {
      const r = whole()
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    },
    resolve: (anchor: Anchor) => {
      if (anchor.target?.kind !== "square") return null
      const r = rect(anchor.target.id)
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    },
    describe: (anchor) =>
      anchor.target && isSquare(anchor.target.id) ? game.describe(anchor.target.id) : "",
  }
}

/** "wN", "N", "white knight" all mean the same piece. */
function normalPiece(s: string): string {
  const t = s.trim()
  if (/^[wb][pnbrqk]$/i.test(t)) return `${t[0]?.toLowerCase()}${t[1]?.toUpperCase()}`
  const color = /black/i.test(t) || /^[pnbrqk]$/.test(t) ? "b" : "w"
  const names: Record<string, string> = {
    pawn: "P",
    knight: "N",
    bishop: "B",
    rook: "R",
    queen: "Q",
    king: "K",
  }
  const word = Object.keys(names).find((n) => t.toLowerCase().includes(n))
  return `${color}${word ? names[word] : t.slice(-1).toUpperCase()}`
}

/** A move without its decorations, so "Nf3+" and "Nf3" compare equal. */
const clean = (san: unknown) => String(san ?? "").replace(/[+#!?]/g, "")
