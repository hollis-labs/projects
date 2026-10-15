# agentrc

This is the agent framework distributable. It contains skills, commands, hooks, templates, and documentation that get installed into workspaces and projects.

**This is not a workspace.** Do not run agent sessions from here. Use `agent-workspaces/` or install into your target project.

## Structure
- `skills/` — Skill definitions (the procedures agents follow)
- `commands/` — Command entry points (slash commands that invoke skills)
- `hooks/` — Hook scripts (enforcement, not capture)
- `templates/` — Installable templates (CLAUDE.md, workspace structure)
- `docs/` — Framework documentation and design guides

## Install

Use the `agentrc-install` skill from any project directory:

```
/agentrc-install install
```

This creates the `.agentrc/` layer (skills, commands, roles as directory symlinks to `~/.agentrc/`) and a Claude adapter (`.claude/` pointing to `.agentrc/`, plus a `CLAUDE.md` loader block).

To remove:

```
/agentrc-install uninstall
```

See `skills/agentrc-install.md` for the full procedure and adapter model.
