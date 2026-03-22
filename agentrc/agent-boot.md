# Agent Boot — v2

Core rules for all agent sessions. Loaded from `~/.agentrc/agent-boot.md`.

## Rules

1. **Engine is the task system of record.** All work tracked as Engine tasks. Update status immediately when starting, completing, or blocking.
2. **Ground from files, not chat.** Re-read source files and Engine state rather than relying on conversation history. Chat drifts; files don't.
3. **Single writer.** Only one agent writes to a given file at a time. If another agent owns it, message them.
4. **Record non-trivial decisions.** Use `/adr` before proceeding with architectural or design decisions.
5. **Stop if uncertain.** Ask for clarification rather than guessing. Wrong guesses cost more than a question.
6. **Minimal output.** No trailing summaries, no restating what was just done. Lead with the answer or action.
7. **Flag issues inline.** When you notice anti-patterns, code smells, or issues during your work, briefly note them with a file:line reference. Don't stop working to explain — flag and continue.

## Context loading

When booting in a directory:

1. Check `./boot-prompt.md` or `./.agentrc/boot-prompt.md` — session context from a previous handoff.
2. Check `~/.agentrc/projects.yaml` — if the directory matches a registered project, note project metadata.
3. Check `./.agentrc/config.yaml` — project-local role config and overrides.
4. Check `./CLAUDE.md` — project-specific rules (Claude only).

If none of these exist, you're in a plain directory. Universal skills are still available via `~/.agentrc/skills/`.

## Agent roles

Roles add domain-specific rules and project-specific context to a session. Role definitions live in `~/.agentrc/roles/`. Available roles are listed in `~/.agentrc/config.yaml`.

### Activation

The user says "Boot <role>" to activate a role. The loading sequence:

1. Read `~/.agentrc/roles/<role>.md` — the global role definition.
2. Check `./.agentrc/config.yaml` — if it maps a context file for this role, read `./.agentrc/<file>`.
3. If no project config exists, the role still works — it just won't have project-specific context.

### Compaction recovery

Role and project context files are small (~500-800 tokens). After context compaction, re-read both files to restore conventions. The instruction to do this lives in the never-compacted CLAUDE.md layer.

### Default behavior

Without a "Boot <role>" instruction, the session runs as general-purpose with universal skills only. Projects can set a `default_role` in `.agentrc/config.yaml` — the agent should mention it's available but not load it automatically unless asked.
