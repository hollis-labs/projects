# Setting Up Project-Level Agent Configurations

How to combine roles with project-specific context to create agents that know both the technology and your project's conventions.

## The Pattern: Role + Project Context

The agentrc system layers context in three tiers:

```
~/.agentrc/roles/frontend.md        # "I know React/Next.js/shadcn"
<project>/.agentrc/frontend.md      # "I know THIS project's components, patterns, anti-patterns"
<project>/CLAUDE.md                 # LLM-specific project rules
```

When an agent boots in a project directory, it loads the global role definition plus the project-local context docs. The role provides deep technology knowledge. The project context provides specific conventions, component inventories, reference files, and anti-patterns unique to that codebase.

This is the same pattern that makes the Vercel/Next.js plugin effective — it works because it injects deep framework knowledge (how App Router works, what server components can and cannot do, correct data fetching patterns) rather than generic instructions. The difference is that you control both layers and can make the project context as specific as your codebase requires.

**Context beats instructions.** "Use `Panel` for card containers — see `components/ui/panel.tsx`" is more useful than "use appropriate components." The agent can read the reference file and match the pattern exactly.

## Creating a New Role

Roles live in `~/.agentrc/roles/` and are technology-focused, not project-specific. They travel with you across all projects.

### Steps

1. Create a file in `~/.agentrc/roles/`:

```bash
touch ~/.agentrc/roles/backend.md
```

2. Follow this structure:

```markdown
# Role: Backend Agent

## Identity
You are a backend specialist building APIs with Go and PostgreSQL.

## Stack
- **Language:** Go 1.22+
- **Framework:** Chi router
- **Database:** PostgreSQL via pgx
- **Auth:** JWT middleware

## Rules
1. Rule about preferred patterns
2. Rule about error handling conventions
3. Rule about testing expectations

## When assigned to a project
- What to read first (go.mod, migrations/, etc.)
- What to check for before making assumptions

## Handoff
What to report when work is complete.
```

3. Key principles:
   - **Technology, not project.** The role says "use Chi router." The project context says "routes go in `internal/api/routes.go`."
   - **Opinionated defaults.** State your stack preferences clearly. "Server components by default" not "consider using server components."
   - **Practical rules.** Each rule should prevent a specific mistake. If you can't point to a time the rule would have helped, cut it.

### Existing roles to reference

| Role | File | Purpose |
|------|------|---------|
| Frontend | `~/.agentrc/roles/frontend.md` | React/Next.js/shadcn specialist |
| Code Review | `~/.agentrc/roles/code-review.md` | Review with BLOCK/WARN/NOTE severity |
| Project Docs | `~/.agentrc/roles/project-docs.md` | Documentation maintenance |
| Strategic Planner | `~/.agentrc/roles/strategic-planner.md` | Planning and roadmap |

## Creating Project-Level Context

Project context docs live in `<project>/.agentrc/` and give the role project-specific knowledge.

### Steps

1. Create the directory:

```bash
mkdir -p <project>/.agentrc
```

2. Create context docs for each domain the project touches:

```bash
# For a full-stack project:
touch <project>/.agentrc/frontend.md
touch <project>/.agentrc/backend.md
touch <project>/.agentrc/data.md
```

3. Fill in the context doc. Use the template at `~/.agentrc/templates/frontend-project.md` as a starting point for frontend projects. The key sections:

   - **Stack** — Exact versions and libraries this project uses
   - **Project structure** — Directory layout with explanations
   - **Component/module inventory** — What exists, where it lives, when to use it
   - **Patterns to follow** — With file references to canonical examples
   - **Anti-patterns to avoid** — With file references to past mistakes
   - **Reference implementations** — Point at the best examples in the codebase

4. Create a `config.yaml` to declare which roles apply to this project:

```yaml
# <project>/.agentrc/config.yaml
roles:
  frontend:
    file: frontend.md
  backend:
    file: backend.md
default_role: frontend
```

   The `file` field points to the context doc in the same `.agentrc/` directory. Available roles are defined globally in `~/.agentrc/config.yaml` — the project config maps them to local context files.

5. Commit `.agentrc/` to the project repo. It is part of the project, not personal config.

### What makes a good context doc

**Be specific.** Every statement should reference a real file, component, or pattern in the codebase.

| Weak | Strong |
|------|--------|
| "Use appropriate components" | "Use `Panel` for card containers — see `components/ui/panel.tsx`" |
| "Follow existing patterns" | "Data tables use the `DataTable` component with column definitions — see `components/tasks/task-table.tsx`" |
| "Handle errors properly" | "All API routes use `handleApiError()` from `lib/errors.ts` — never return raw error objects" |

**Include reference files.** Point at 2-3 canonical implementations that show the right way to do things. The agent will read them and match the pattern.

**Document anti-patterns with evidence.** "Don't pass props through 3+ layers — see the refactor in `components/dashboard/` where this caused a maintenance problem."

**Don't repeat what the role covers.** The role already says "use shadcn first." The project doc says "we have a custom `StatusBadge` that wraps shadcn Badge — use it instead of raw Badge for status displays."

## Activating a Role

Say "Boot <role>" at the start of a session:

```
Boot frontend
```

This triggers the loading chain (defined in `~/.claude/CLAUDE.md`):
1. Read `~/.agentrc/roles/frontend.md` (global role definition)
2. Check `.agentrc/config.yaml` in current directory for a context file mapping
3. If found, read `.agentrc/frontend.md` (project-specific context)

Without "Boot <role>", the session runs general-purpose with universal skills only.

After context compaction in long sessions, the role and context files are automatically re-read (they're small — ~500-800 tokens).

## Bootstrapping a New Project

The fastest way to create accurate project context is to have an agent audit the codebase and draft it. Use the `agentrc-manage` skill:

```
/agentrc-manage context hadron frontend
```

Or manually:

2. **Review the generated doc.** The agent will get 80-90% right. You need to:
   - Correct any misidentified patterns
   - Add anti-patterns you know about from experience (the agent can't see git history)
   - Verify the reference implementations are actually good examples
   - Remove anything generic that the role already covers

3. **Commit the result:**

```bash
git add .agentrc/
git commit -m "Add agent project context"
```

4. **Maintain it.** When patterns change, update the context doc. The Project Docs agent (`~/.agentrc/roles/project-docs.md`) can help keep it current — run it periodically to check if the docs still match the code.

## Skill Tiers

Skills are markdown files that give agents specific capabilities. They are organized in three tiers:

### Universal skills

Location: `~/.agentrc/skills/`

Available to every agent in every project. These are general-purpose operations that aren't tied to any specific technology or codebase.

Examples: `adr` (decision capture), `doc-note` (documentation), `boot-prompt` (session handoff), `qstatus` (status checks).

### Role skills (future)

Location: `~/.agentrc/roles/<role>/skills/`

Loaded only when a specific role is active. A frontend role might include skills for component scaffolding; a backend role might include skills for migration generation. Not yet implemented — currently all role-specific knowledge lives in the role definition itself.

### Project skills

Location: `<project>/.agentrc/skills/`

For operations unique to a specific project. Use these sparingly — if a skill could apply to other projects using the same stack, it probably belongs at the role or universal level.

Examples: a skill that runs a project-specific deployment pipeline, a skill that generates boilerplate matching the project's exact patterns, a skill that queries a project-specific internal API.

### When to create a project skill

Create a project skill when:
- The operation is unique to this project (not generalizable)
- It involves project-specific file paths, services, or conventions
- You find yourself repeatedly explaining the same multi-step procedure to agents

Don't create a project skill when:
- The role definition or project context doc can cover it
- It's a one-off operation
- It duplicates a universal skill with minor variations
