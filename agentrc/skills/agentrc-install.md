# agentrc Install / Uninstall (:agentrc-install)

Install or uninstall the agentrc framework in a project directory. Creates the `.agentrc/` layer (LLM-agnostic) and adapter wiring for specific LLM CLIs.

## When to use

- `/agentrc install` — Install agentrc into the current directory
- `/agentrc install --adapter claude` — Install with Claude adapter only (default)
- `/agentrc uninstall` — Remove agentrc and all adapters from the current directory

## Procedure: Install

1. **Create `.agentrc/` structure in the target directory:**

   ```
   <project>/.agentrc/
   ├── skills/       → symlink to ~/.agentrc/skills/
   ├── commands/     → symlink to ~/.agentrc/commands/
   ├── roles/        → symlink to ~/.agentrc/roles/
   ├── agents/       → project-specific agent context files
   └── config.yaml   → project-local config (created from template if missing)
   ```

   - `skills/`, `commands/`, `roles/` are **directory symlinks** pointing to `~/.agentrc/` equivalents.
   - Read the global version from `~/.agentrc/config.yaml` (`version` field).
   - If `.agentrc/config.yaml` already exists:
     - Update the `agentrc_version` field to match the global version.
     - Leave all other content untouched.
   - If `.agentrc/config.yaml` does not exist, create one:

   ```yaml
   # Project agentrc config
   agentrc_version: <version from ~/.agentrc/config.yaml>

   # Define named agents that compose roles, skills, and project context.
   # See ~/.agentrc/config.yaml for available roles and skills.

   # agents:
   #   my-backend:
   #     name: My Backend Engineer
   #     description: Backend development for this project
   #     roles: [backend, go]
   #     skills: [go-build, go-lint, go-test]
   #     context: backend.md
   ```

2. **Install LLM adapter(s).** Default adapter is `claude`. Each adapter wires the LLM CLI to read from `.agentrc/`.

   ### Claude adapter

   Create `.claude/` directory structure:

   ```
   <project>/.claude/
   ├── skills/    → symlink to <project>/.agentrc/skills/
   └── commands/  → symlink to <project>/.agentrc/commands/
   ```

   Create or update `CLAUDE.md` in the project root with the agentrc loader block:

   ```markdown
   # Project

   ## agentrc
   - If `.agentrc/boot-prompt.md` exists, read it first for session context.
   - If the user says "Boot <agent>", look up the agent in `.agentrc/config.yaml` under `agents:`. Load each role file from `~/.agentrc/roles/` (using the `file:` path from `~/.agentrc/config.yaml` role definitions), load the listed skills, and read the project context file from `.agentrc/` if specified.
   - If the user says "Boot <role>" and no agent matches, fall back to loading that single role from `~/.agentrc/roles/` by type directory (domain/, stack/, meta/).
   - After context compaction, re-read the active role and project context files.
   - Do not guess when uncertain. Stop and ask.
   - Prefer focused, minimal output. No trailing summaries.
   - Sub-agent output stays in the sub-agent. Main context gets one-line confirmations.
   ```

   If `CLAUDE.md` already exists, append the agentrc block only if it doesn't already contain `## agentrc`.

3. **Version check (on existing install):**

   If `.agentrc/config.yaml` exists and has an `agentrc_version` field:
   - Compare it to the global `version` in `~/.agentrc/config.yaml`.
   - If they match, report: "agentrc is up to date (vX.Y.Z)."
   - If the project version is behind, report: "Updating agentrc from vX.Y.Z to vA.B.C." Update the `agentrc_version` field and continue with migration checks below.

4. **Archive v1/legacy content:**

   Before modifying `.agentrc/`, check for legacy (pre-v2) artifacts. If ANY of the following exist, archive them to `.agentrc-legacy/`:

   **Files to archive (move, not delete):**
   - `.agentrc/agent-boot.md` — old boot doc
   - `.agentrc/bootstrap.md` — old iteration state cache
   - `<project-root>/agentrc.yaml` — old Volon-era config (lives in project root, not `.agentrc/`)

   **Directories to archive (move, not delete):**
   - `.agentrc/boot/` — old role profiles
   - `.agentrc/pcc/` — old project context cache (may contain useful knowledge for auditor)
   - `.agentrc/tasks/` — old task files
   - `.agentrc/logs/` — old log files
   - `.agentrc/state/` — old state files
   - `.agentrc/backlog/` — old backlog files
   - `.agentrc/templates/` — old template files

   **Procedure:**
   - Create `.agentrc-legacy/` if it doesn't already exist
   - Move each found item into `.agentrc-legacy/`, preserving directory structure
   - Report each archived item: "Archived: agent-boot.md → .agentrc-legacy/"
   - If `.agentrc-legacy/` already exists, merge into it (don't overwrite existing archives)

   **Do NOT archive:** `config.yaml`, `boot-prompt.md`, `agents/`, or any `*.md` context docs at `.agentrc/` root — these are handled in step 4b.

4b. **Migrate context docs to `agents/` directory:**

   Check for `*.md` files directly in `.agentrc/` (not in subdirs) that are NOT `config.yaml` or `boot-prompt.md`. These are likely v1 context docs (e.g., `frontend.md`, `backend.md`) that belong in `agents/`.

   - Create `agents/` directory if it doesn't exist
   - Move each context doc: `.agentrc/frontend.md` → `.agentrc/agents/frontend.md`
   - If `agents/<name>.md` already exists, keep the existing one (don't overwrite)
   - Check `config.yaml` agents section — if an agent references `context: agents/<name>.md` and that file was just moved, report: "Migrated context doc: <name>.md → agents/<name>.md"
   - If a context doc exists but no agent in `config.yaml` references it, warn: "Found context doc <name>.md with no matching agent definition — add an agent entry to config.yaml"

4c. **Handle existing install (update/migrate):**

   If `.agentrc/` already exists:
   - If `skills/`, `commands/`, or `roles/` are directory symlinks, verify they point to `~/.agentrc/` equivalents. Re-create if stale.
   - If `skills/` or `commands/` is a **directory of individual file symlinks** (old model), remove the directory and replace with a single directory symlink to `~/.agentrc/`. Report: "Migrated from per-file symlinks to directory symlink."
   - Leave `config.yaml`, context docs, and `boot-prompt.md` untouched.

   If `.claude/` already exists:
   - If `skills/` and `commands/` are directory symlinks pointing to `.agentrc/`, leave them.
   - If they are directory symlinks pointing directly to `~/.agentrc/` (bypassing `.agentrc/`), re-point them to `../.agentrc/skills` and `../.agentrc/commands`. Report: "Fixed adapter to route through .agentrc/."
   - If they contain individual file symlinks (old model), remove and replace with directory symlinks to `.agentrc/`. Report: "Migrated Claude adapter from per-file to directory symlinks."
   - Leave any other `.claude/` content (hooks, memory, settings) untouched.

   If `CLAUDE.md` exists, only append the `## agentrc` block if not already present.

5. **Verify install:**
   - Confirm all symlinks resolve (follow the chain and `ls` the target)
   - Confirm `.agentrc/config.yaml` exists
   - Confirm adapter wiring exists and routes through `.agentrc/`

6. **Output:**

   ```
   ✓ agentrc vX.Y.Z installed in <directory>
     .agentrc/skills   → ~/.agentrc/skills (N skills)
     .agentrc/commands → ~/.agentrc/commands (N commands)
     .agentrc/roles    → ~/.agentrc/roles (N roles)
     .agentrc/config.yaml — created | updated | up to date
     Adapter: claude (.claude/ + CLAUDE.md)
   ```

## Procedure: Uninstall

1. **Remove adapter wiring:**
   - Claude: remove `.claude/skills/` and `.claude/commands/` symlinks. If `.claude/` is now empty, remove it. Remove the `## agentrc` block from `CLAUDE.md`. If `CLAUDE.md` is now empty, remove it.

2. **Remove `.agentrc/` managed content:**
   - Remove `skills/`, `commands/`, `roles/` symlinks
   - Do NOT remove `config.yaml` or any project context docs (e.g., `frontend.md`, `backend.md`) — these are user content
   - Do NOT remove `boot-prompt.md` — this is session state

3. **Output:**

   ```
   ✓ agentrc uninstalled from <directory>
     Removed: .agentrc/skills, .agentrc/commands, .agentrc/roles
     Removed: claude adapter (.claude/skills, .claude/commands)
     Kept: .agentrc/config.yaml, project context docs
   ```

## Invariants

- NEVER delete user-created content (config.yaml, context docs, boot-prompt.md)
- Directory symlinks, not file symlinks — `.agentrc/skills/` points to `~/.agentrc/skills/` as a whole
- `.agentrc/` is the canonical layer. Adapters point to `.agentrc/`, never directly to `~/.agentrc/`
- If `~/.agentrc/` doesn't exist, abort with: "Global agentrc not found at ~/.agentrc/. Install it first."
- Idempotent — running install twice should not break anything or create duplicates
