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
To set up a new workspace or project, symlink skills and commands and copy the workspace CLAUDE.md template:

```bash
# From your target directory:
mkdir -p .claude/{skills,commands,hooks}
ln -sf ~/Projects-apps/agentrc/skills/* .claude/skills/
ln -sf ~/Projects-apps/agentrc/commands/* .claude/commands/
cp ~/Projects-apps/agentrc/templates/CLAUDE.md ./CLAUDE.md
```

A proper install command is planned but not yet built.
