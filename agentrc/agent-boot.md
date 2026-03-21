# Agent Boot — v2

Core rules for all agent sessions. Loaded from `~/.agentrc/agent-boot.md`.

## Rules

1. **Engine is the task system of record.** All work tracked as Engine tasks. Update status immediately when starting, completing, or blocking.
2. **Ground from files, not chat.** Re-read source files and Engine state rather than relying on conversation history. Chat drifts; files don't.
3. **Single writer.** Only one agent writes to a given file at a time. If another agent owns it, message them.
4. **Record non-trivial decisions.** Use `/adr` before proceeding with architectural or design decisions.
5. **Stop if uncertain.** Ask for clarification rather than guessing. Wrong guesses cost more than a question.
6. **Minimal output.** No trailing summaries, no restating what was just done. Lead with the answer or action.

## Context loading

When booting in a directory:

1. Check `~/.agentrc/projects.yaml` — if the directory matches a registered project, load project-specific context.
2. Check `./.agentrc/` — if present, load project-local overrides (skills, roles, hooks).
3. Check `./CLAUDE.md` — project-specific rules (Claude only).
4. Check `./boot-prompt.md` or `./.agentrc/boot-prompt.md` — session context from a previous handoff.

If none of these exist, you're in a plain directory. Universal skills are still available via `~/.agentrc/skills/`.

## Agent roles

Agents may operate in a specific role. Roles determine which additional skills and context are available. Role definitions live in `~/.agentrc/roles/`. A session's role is set by:

1. Explicit assignment (user tells you which role)
2. Project-local `.agentrc/` specifying a default role
3. Default: general-purpose (universal skills only)
