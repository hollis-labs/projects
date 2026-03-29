# shadcn Frontend Setup (:shadcn-install)

Add shadcn MCP server and shadcn-ui skill to a project's frontend agent. The shadcn-ui skill and MCP server provide component search, install, docs, and coding conventions.

## When to use

- `/shadcn-install` — Add shadcn tooling to the current project's frontend agent

## Prerequisites

- Project must have agentrc installed (`.agentrc/config.yaml` exists)
- Project must have a frontend UI directory with `components.json` (shadcn initialized)
- A frontend agent must be defined in `.agentrc/config.yaml`
- The vendor skill must exist at `~/.agentrc/vendor/shadcn-ui/`

## Procedure

1. **Locate the UI directory.** Find `components.json` in the project. Common locations: `ui/`, `frontend/`, project root. Record the relative path from project root (e.g., `ui`).

2. **Create `.mcp.json` at project root** (or merge into existing):

   ```json
   {
     "mcpServers": {
       "shadcn": {
         "command": "npx",
         "args": ["shadcn@<pinned-version>", "mcp", "--cwd", "<ui-dir>"]
       }
     }
   }
   ```

   - Pin the shadcn version. Check current with `npm view shadcn version`.
   - If `components.json` is at project root, omit the `--cwd` argument.
   - If `.mcp.json` already exists, merge the `shadcn` entry into `mcpServers`.

3. **Convert `.claude/skills/` to support vendor skills.**

   Check if `.claude/skills` is a directory symlink (to `.agentrc/skills` or `~/.agentrc/skills`):

   - If **directory symlink**: convert to a real directory with individual symlinks:
     ```bash
     # Record target, remove symlink, create directory
     TARGET=$(readlink .claude/skills)
     rm .claude/skills
     mkdir .claude/skills

     # Symlink each shared skill individually
     for f in "$TARGET"/*.md "$TARGET"/nanite; do
       [ -e "$f" ] && ln -s "$f" .claude/skills/$(basename "$f")
     done
     ```
     Note: glob the actual contents — don't hardcode filenames. Include directory-based skills (like `nanite`).

   - If **already a real directory**: no conversion needed, proceed to step 4.

4. **Add the shadcn-ui vendor skill symlink:**

   ```bash
   ln -s ~/.agentrc/vendor/shadcn-ui .claude/skills/shadcn-ui
   ```

   Verify the symlink resolves: `ls .claude/skills/shadcn-ui/SKILL.md`

5. **Update the frontend agent config** in `.agentrc/config.yaml`:

   Add `shadcn-ui` to the frontend agent's `skills:` list. Find the agent with `roles:` containing `frontend` and `react`.

   Before:
   ```yaml
   skills: [frontend-design]
   ```

   After:
   ```yaml
   skills: [frontend-design, shadcn-ui]
   ```

6. **Verify setup:**

   - `.mcp.json` exists and contains `shadcn` server entry
   - `.claude/skills/shadcn-ui` symlink resolves to `~/.agentrc/vendor/shadcn-ui/`
   - `.claude/skills/shadcn-ui/SKILL.md` is readable
   - Frontend agent in `.agentrc/config.yaml` lists `shadcn-ui` in skills

## Output

Report exactly:
```
shadcn setup complete:
  MCP: .mcp.json → shadcn@<version> (cwd: <ui-dir>)
  Skill: .claude/skills/shadcn-ui → ~/.agentrc/vendor/shadcn-ui/
  Agent: <agent-slug> skills updated
```

## Notes

- The shadcn-ui vendor skill is stored at `~/.agentrc/vendor/shadcn-ui/` (not in `~/.agentrc/skills/`) to prevent auto-loading in all projects.
- Converting `.claude/skills/` from a directory symlink to per-file symlinks is a one-way operation for that project. The `agentrc-install` skill should not revert this — it should detect per-file symlinks with vendor additions and leave them intact.
- The MCP server version should be pinned. Update by editing `.mcp.json` when upgrading.
- To upgrade the vendor skill: re-run `pnpm dlx skills add shadcn/ui` in a temp directory, copy output to `~/.agentrc/vendor/shadcn-ui/`, and symlinks propagate automatically.
