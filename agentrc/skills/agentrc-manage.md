# agentrc Manage (:agentrc-manage)

Create roles, project context docs, and skills for the agentrc system. Runs via sub-agent.

## When to use

- `/agentrc-manage role <name> <description>` — Create a new agent role
- `/agentrc-manage context <project> <domain>` — Audit a project and generate a context doc
- `/agentrc-manage skill <name> <description>` — Create a new skill

## IMPORTANT: Run in Sub-Agent

This skill MUST be executed via the Agent tool (subagent) to keep the main context clean.

## Mode 1: Create Role

```
/agentrc-manage role <name> <one-line description>
```

**Examples:**
- `/agentrc-manage role domain backend "API, service, and data engineering"`
- `/agentrc-manage role stack python "Python language conventions and tooling"`
- `/agentrc-manage role meta infra-ops "Infrastructure and DevOps tooling"`

**Procedure:** Launch a sub-agent with:

```
You are building a new agent role definition for the agentrc system.

## Role to create
- Name: {NAME}
- Type: {TYPE} (domain, stack, or meta)
- Description: {DESCRIPTION}

## Steps

1. Read existing roles for reference:
   - Domain example: ~/.agentrc/roles/domain/backend.md (domain thinking, no tech stack)
   - Stack example: ~/.agentrc/roles/stack/go.md (language conventions and tooling)
   - Domain example: ~/.agentrc/roles/domain/code-review.md (non-coding domain role)

2. Read the guide: ~/.agentrc/docs/agent-setup-guide.md — section "Creating a New Role"

3. Write the role file to: ~/.agentrc/roles/{TYPE}/{NAME}.md

   For **domain** roles (what kind of work):
   ```markdown
   # Role: {Title}

   ## Identity
   One sentence: what kind of work you focus on.

   ## Thinking
   Bullet list of how you approach problems in this domain.
   No tech stack specifics — those come from stack roles.

   ## When assigned to a project
   What to read first, what to check before making assumptions.

   ## Handoff
   What to report when work is complete or blocked.
   ```

   For **stack** roles (what tech):
   ```markdown
   # Role: {Title} Stack

   ## Identity
   One sentence: what language/framework conventions you follow.
   Note: this role is combined with a domain role.

   ## Stack
   Bullet list of technologies, frameworks, tools.

   ## Rules
   Numbered list of opinionated, specific rules.

   ## When assigned to a project
   What project files to read first.
   ```

4. Key principles:
   - Domain roles define *thinking* — how to approach the problem space
   - Stack roles define *conventions* — language idioms and tooling
   - Agents compose both: `roles: [backend, go]`
   - Don't duplicate what agent-boot.md already covers

5. Also register the role in ~/.agentrc/config.yaml under the `roles:` section.

6. Return ONLY: ✓ Created role: ~/.agentrc/roles/{TYPE}/{NAME}.md — {one-line summary}
```

## Mode 2: Create Project Context

```
/agentrc-manage context <project> <domain>
```

**domain** is one of: `frontend`, `backend`, `infra`, `data`, or a custom domain name.

**Examples:**
- `/agentrc-manage context hadron frontend` — Audit Hadron's frontend and generate style guide
- `/agentrc-manage context cortex backend` — Audit Cortex's Go backend and generate conventions doc
- `/agentrc-manage context cerberus infra` — Audit Cerberus's infrastructure setup

**Procedure:** Launch a sub-agent with:

```
You are auditing a project's codebase to generate a project-level context doc for the agentrc system.

## Target
- Project: {PROJECT}
- Domain: {DOMAIN}
- Project root: {resolve from ~/.agentrc/config.yaml projects section, or check `~/Projects-apps/{PROJECT}/` as default. Ask user if not found.}

## Steps

1. Read the relevant template:
   - For frontend: ~/.agentrc/templates/frontend-project.md
   - For backend: ~/.agentrc/templates/backend-project.md
   - For other domains: use the closest template as structural reference, adapt sections

2. Read the setup guide: ~/.agentrc/docs/agent-setup-guide.md — section "Creating Project-Level Context"

3. Explore the project codebase thoroughly:
   - Find the directory structure
   - Read package.json / go.mod / equivalent for stack details
   - Read config files (tsconfig, tailwind.config, vite.config, etc.)
   - Identify all significant source files
   - Read representative files to understand patterns

4. Document what you find:
   - **Stack** — exact versions and libraries
   - **Project structure** — actual directory layout with file purposes
   - **Component/module inventory** — what exists, where, what it does
   - **Patterns in use** — how data flows, how state is managed, how errors are handled
   - **Anti-patterns found** — with file:line references. Look for:
     - God components/files (>200 lines with mixed concerns)
     - Code duplication (same function in multiple files)
     - Prop tunneling / tight coupling
     - Missing abstractions (same pattern reimplemented repeatedly)
     - Inconsistent patterns (some files do X, others do Y)
     - Hardcoded values that should be constants
     - Missing types, excessive `any` usage
   - **Reference implementations** — 2-3 well-structured files that exemplify good patterns
   - **Recommendations** — prioritized list of improvements

5. Create the .agentrc/agents directory if needed:
   mkdir -p {PROJECT_ROOT}/.agentrc/agents

6. Write the context doc to: {PROJECT_ROOT}/.agentrc/agents/{DOMAIN}.md

7. Return ONLY:
   ✓ Created context: {PROJECT_ROOT}/.agentrc/agents/{DOMAIN}.md
   — {total files audited}, {number of anti-patterns found}, {number of recommendations}
```

## Mode 3: Create Skill

```
/agentrc-manage skill <name> <description>
```

**Examples:**
- `/agentrc-manage skill deploy-pipeline "Run hadron deployment pipeline with validation"`
- `/agentrc-manage skill db-migrate "Generate and run database migrations for Go projects"`
- `/agentrc-manage skill test-runner "Run project tests with coverage and report results"`

**Procedure:** Launch a sub-agent with:

```
You are building a new skill for the agentrc system.

## Skill to create
- Name: {NAME}
- Description: {DESCRIPTION}

## Steps

1. Read existing skills for reference on format and conventions:
   - ~/.agentrc/skills/doc-note.md (good example: sub-agent pattern, input parsing, typed output)
   - ~/.agentrc/skills/adr.md (good example: concise, single-purpose)
   - ~/.agentrc/skills/escalate.md (good example: minimal, focused)

2. Read the setup guide: ~/.agentrc/docs/agent-setup-guide.md — section "Skill Tiers"

3. Determine the skill tier:
   - Universal (useful everywhere) → write to ~/.agentrc/skills/{NAME}.md
   - Project-specific (one project only) → ask user which project, write to {PROJECT}/.agentrc/skills/{NAME}.md

4. Write the skill file following this structure:
   ```markdown
   # {Title} (:{name})

   {One-line description}. Runs via sub-agent.

   ## When to use
   - Trigger conditions and example invocations

   ## IMPORTANT: Run in Sub-Agent
   (if the skill does significant work — skip for simple inline skills)

   ## Input Format
   /{name} [arguments]

   ## Procedure
   Step-by-step instructions for execution.

   ## Output
   What format to return results in.

   ## Invariants
   - Hard rules that must never be broken
   ```

5. Key principles:
   - Single purpose. One skill does one thing.
   - Clear input/output contract. The caller knows exactly what to provide and what to expect.
   - Sub-agent for anything that reads multiple files or does significant work.
   - Invariants are hard rules, not suggestions. "ALWAYS write with status: draft" not "consider writing as draft."

6. If the skill is universal, also create the command stub:
   Write to ~/.agentrc/commands/{NAME}.md:
   ```markdown
   Invoke the {name} skill.
   ```

7. Return ONLY: ✓ Created skill: {path} — {one-line summary}
```

## Invariants

- ALWAYS run via sub-agent for all three modes.
- ALWAYS read existing examples before generating. Match the conventions.
- If the project is not found in ~/.agentrc/config.yaml projects section (for context mode), ask the user for the path. Do not guess.
- Generated files must be complete and usable — no TODO placeholders, no "fill this in later."
- For context mode: the audit must actually read the codebase. Do not generate generic content.
