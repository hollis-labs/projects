/**
 * The game: the one place that knows the rules. chess.js decides what is legal; nothing
 * else in this application does, least of all the model.
 *
 * There is the game being played, and at times a demonstration beside it: a line shown on
 * the board without touching the game, which is left exactly as it was when it ends.
 */
import { Chess, type Square } from "chess.js"

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const
export const isSquare = (s: unknown): s is Square => typeof s === "string" && /^[a-h][1-8]$/.test(s)

const NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
}

export interface Piece {
  color: "w" | "b"
  type: string
}

export interface Saved {
  id: string
  start: string
  moves: string[]
  resets: number
  flipped: boolean
  /** The game before the last new position, so setting one up can be taken back. */
  before?: { start: string; moves: string[] }
}

export class Game {
  id = `g${Date.now().toString(36)}`
  private main = new Chess()
  private start = this.main.fen()
  private demo: Chess | null = null
  private demoNote = ""
  private demoQueue: string[] = []
  private demoTimer: ReturnType<typeof setTimeout> | null = null
  private resets = 0
  private before: { start: string; moves: string[] } | null = null
  private listeners = new Set<(why: "content" | "view") => void>()
  flipped = false
  /** How long a demonstrated move stays before the next, in ms. 0 shows them all at once. */
  pace = 700

  subscribe(fn: (why: "content" | "view") => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  private tell(why: "content" | "view" = "content") {
    for (const fn of [...this.listeners]) fn(why)
  }

  /** The board in front of the person: the demonstration while one is shown, else the game. */
  private now(): Chess {
    return this.demo ?? this.main
  }
  get demonstrating() {
    return this.demo !== null
  }
  get note() {
    return this.demoNote
  }
  /** A revision that changes with every change to what is on the board. */
  rev(): string {
    const base = `${this.resets}.${this.main.history().length}`
    return this.demo ? `${base}.d${this.demo.history().length}` : base
  }
  fen() {
    return this.now().fen()
  }
  turn(): "white" | "black" {
    return this.now().turn() === "w" ? "white" : "black"
  }
  piece(sq: Square): Piece | null {
    return this.now().get(sq) ?? null
  }
  history(): string[] {
    return this.now().history()
  }
  lastMove(): { from: Square; to: Square; san: string } | null {
    const h = this.now().history({ verbose: true })
    const m = h[h.length - 1]
    return m ? { from: m.from, to: m.to, san: m.san } : null
  }
  legal(from?: Square): { from: Square; to: Square; san: string }[] {
    return this.now()
      .moves({ verbose: true, ...(from ? { square: from } : {}) })
      .map((m) => ({ from: m.from, to: m.to, san: m.san }))
  }
  status() {
    const c = this.now()
    return {
      check: c.inCheck(),
      checkmate: c.isCheckmate(),
      stalemate: c.isStalemate(),
      draw: c.isDraw(),
      over: c.isGameOver(),
    }
  }

  /** A square in words: "the white knight on f3", "the empty square e4". */
  describe(sq: Square): string {
    const p = this.piece(sq)
    return p
      ? `the ${p.color === "w" ? "white" : "black"} ${NAMES[p.type]} on ${sq}`
      : `the empty square ${sq}`
  }

  /** Where everything is, in words a model cannot misread. */
  pieces(): { white: string[]; black: string[] } {
    const out = { white: [] as string[], black: [] as string[] }
    for (const row of this.now().board())
      for (const p of row)
        if (p)
          out[p.color === "w" ? "white" : "black"].push(
            `${p.type === "p" ? "" : p.type.toUpperCase()}${p.square}`,
          )
    return out
  }

  /** Make a move in the game. Refused during a demonstration, and when it is not legal. */
  move(m: {
    from?: string
    to?: string
    promotion?: string
    san?: string
  }): { ok: true; san: string } | { ok: false; reason: string } {
    if (this.demo)
      return {
        ok: false,
        reason: "A demonstration is on the board. End it (back_to_game) before moving in the game.",
      }
    try {
      const made = m.san
        ? this.main.move(m.san)
        : this.main.move({ from: String(m.from), to: String(m.to), promotion: m.promotion ?? "q" })
      this.tell()
      return { ok: true, san: made.san }
    } catch {
      const legal = this.legal(isSquare(m.from) ? m.from : undefined).map((x) => x.san)
      const what = m.san ?? `${m.from}-${m.to}`
      return {
        ok: false,
        reason: `${what} is not a legal move here. ${
          isSquare(m.from) && legal.length
            ? `From ${m.from} the legal moves are: ${legal.join(", ")}.`
            : `Legal moves: ${
                this.legal()
                  .map((x) => x.san)
                  .join(", ") || "none"
              }.`
        }`,
      }
    }
  }

  undo(): { ok: boolean; san?: string } {
    if (this.demo) return { ok: false }
    const m = this.main.undo()
    if (m) this.tell()
    return { ok: !!m, san: m?.san }
  }

  /** Start again: the usual position, or one given. The game before is kept to go back to. */
  newGame(fen?: string): { ok: true } | { ok: false; reason: string } {
    let next: Chess
    try {
      next = fen ? new Chess(fen) : new Chess()
    } catch (e) {
      return {
        ok: false,
        reason: `That position is not valid: ${e instanceof Error ? e.message : "bad FEN"}`,
      }
    }
    this.endDemo(false)
    this.before = { start: this.start, moves: this.main.history() }
    this.main = next
    this.start = next.fen()
    this.resets++
    this.tell()
    return { ok: true }
  }

  /** Go back to the game that was on the board before the last new position. */
  restore(): boolean {
    if (!this.before) return false
    const b = this.before
    this.endDemo(false)
    const c = new Chess(b.start)
    for (const san of b.moves) c.move(san)
    this.before = { start: this.start, moves: this.main.history() }
    this.main = c
    this.start = b.start
    this.resets++
    this.tell()
    return true
  }

  /**
   * Show a line on the board without touching the game: from the game's position, the
   * moves are played one after another. Every move is checked first; if one is not legal
   * nothing is shown and the answer says which, and what was legal there.
   */
  showLine(
    moves: string[],
    note = "",
  ): { ok: true; shown: string[] } | { ok: false; reason: string } {
    const probe = new Chess(this.main.fen())
    const shown: string[] = []
    for (const [i, san] of moves.entries()) {
      try {
        shown.push(probe.move(san).san)
      } catch {
        return {
          ok: false,
          reason: `Move ${i + 1} of the line (${san}) is not legal after ${shown.join(" ") || "the current position"}. Legal there: ${probe.moves().join(", ") || "none"}.`,
        }
      }
    }
    this.endDemo(false)
    this.demo = new Chess(this.main.fen())
    this.demoNote = note
    this.demoQueue = [...shown]
    this.tell()
    this.step()
    return { ok: true, shown }
  }

  private step() {
    if (!this.demo) return
    const play = () => {
      const san = this.demoQueue.shift()
      if (!this.demo || !san) return
      this.demo.move(san)
      this.tell()
      if (this.demoQueue.length) this.demoTimer = setTimeout(play, this.pace)
    }
    if (this.pace <= 0) {
      while (this.demoQueue.length) {
        const san = this.demoQueue.shift() as string
        this.demo.move(san)
      }
      this.tell()
    } else this.demoTimer = setTimeout(play, Math.min(this.pace, 350))
  }

  /** End the demonstration: the game is on the board again, as it was. */
  endDemo(tell = true): boolean {
    if (this.demoTimer) clearTimeout(this.demoTimer)
    this.demoTimer = null
    this.demoQueue = []
    if (!this.demo) return false
    this.demo = null
    this.demoNote = ""
    if (tell) this.tell()
    return true
  }

  flip() {
    this.flipped = !this.flipped
    this.tell("view")
  }

  save(): Saved {
    return {
      id: this.id,
      start: this.start,
      moves: this.main.history(),
      resets: this.resets,
      flipped: this.flipped,
      ...(this.before ? { before: this.before } : {}),
    }
  }

  load(s: Saved): boolean {
    try {
      const c = new Chess(s.start)
      for (const san of s.moves) c.move(san)
      this.id = s.id
      this.main = c
      this.start = s.start
      this.resets = s.resets
      this.flipped = s.flipped
      this.before = s.before ?? null
      this.tell()
      return true
    } catch {
      return false
    }
  }
}
