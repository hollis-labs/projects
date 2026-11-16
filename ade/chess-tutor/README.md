# Chess tutor

A small second consumer of the ADE packages: a board, a guide and a tutor over the same
game. It is an example of the interaction, not a chess product.

- `frontend/src/game.ts` is the game. chess.js decides what is legal; nothing else does.
- `frontend/src/surface.ts` is everything the application tells ADE about chess: what the
  board shows, what can be done on it, what can be asked of it, where each square is.
- Pointing, the guide and the conversation come from `@hollis-labs/ade-core`,
  `@hollis-labs/ade-react` and `@hollis-labs/ade-agent`; the server side of the conversation
  is `go/agenthost`.

What to try: click a piece and ask "what can this do?"; shift-click a few squares and ask
about "these"; ask to be taught an opening step by step and play the moves the guide waits
for (play a different one to see it notice); reload mid-lesson.

## Run

From the repository root, once: `npm install && npm run build`.

    cd examples/chess-tutor
    (cd frontend && npm run build)
    go build -o bin/chess-tutor ./cmd/chess-tutor
    CHESS_TUTOR_GATEWAY=<an Anthropic-compatible base URL> \
    CHESS_TUTOR_MODEL=<model or alias> \
    CHESS_TUTOR_KEY_FILE=<file holding the key> \
    bin/chess-tutor

Then open http://127.0.0.1:8791. Without the three settings the board and the guide still
work by hand and the panel says no model is connected. It listens on this machine only:
there are no accounts.

For work on the page, `npm run dev` in `frontend` serves it on :5199 and sends `/api` to the
server above.
