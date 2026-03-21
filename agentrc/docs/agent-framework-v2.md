# Agent Framework v2 — Design Guide

Reference document for building and maintaining the Nexus/agentrc agent framework.

## Core Principles

1. **Task context, not system context.** Agents need to know what they're doing, not the history of the project.
2. **If uncertain, stop and ask.** Guessing signals an incomplete system. "Context Needed" is a valid status.
3. **Focused agents > general agents.** Load context for the task, not the universe.
4. **Skills for knowledge, hooks for enforcement.** Skills load on demand. Hooks run silently unless they block.
5. **Sub-agent output isolation.** Heavy work runs in sub-agents. Main context gets one-line confirmations.
6. **Progressive context disclosure.** Boot gives identity + task. Skills give procedure. Cortex gives memory.

## Boot Contract

Every agent session starts with this and nothing more:

```markdown
# Agent Boot

## Identity
You are [role]. [What you do. What you don't do.]

## Task
[Specific task. Acceptance criteria. Quality bar.]

## Rules
1. If uncertain about correctness, stop and ask.
2. [2-3 task-specific constraints]
3. When all steps complete and conditions met, report done.

## Tools
[MCP servers, permissions]
```

**Budget: under 1K tokens.** If it's longer, you're loading system context.

### What does NOT go in boot:
- Portfolio state, epic counts, session history
- Multiplexor routing rules (framework concern)
- Project identity/goals/non-goals
- Bootstrap.md (eliminated)

### The task section does the heavy lifting
The task's acceptance criteria tells the agent how rigorous to be, what "done" looks like, and implicitly how much to polish. Bad: "Refactor the auth module." Good: "Refactor auth module to extract middleware into /lib/auth.ts. Acceptance: existing tests pass, no new dependencies. Exploratory — working is enough."

## Task Capsule Standard

```markdown
# Task: [ID]

## What
[1-2 sentences: what to build/fix/change]

## Where
[File paths, repo, branch]

## Acceptance
- [ ] Condition 1
- [ ] Condition 2

## Context (optional)
[Links to ADRs, decisions, constraints. NOT project history.]
```

**Required:** What, Where, Acceptance. If an orchestrator can't fill Where or Acceptance concretely, the task isn't ready.

## Skill Design Rules

### Output contracts matter
Every skill must define its output format. "Return ONLY this format" prevents agents from narrating, explaining, and suggesting — all of which pollute the caller's context window.

### Sub-agent pattern for write operations
Skills that create/modify artifacts should run via sub-agent. The sub-agent does the work, main context gets a one-line confirmation. See: adr, blg, doc-note.

### Read operations run inline
Skills that retrieve data (doc-search, qstatus) run in the main context because the caller needs the results.

### Context cost awareness
Everything an agent outputs — summaries, insights, explanations, tables — consumes context window tokens. There is no separate channel. Design skills to produce minimal, structured output. A 500-line status report actively harms the agent's next task.

### Scoping
Skills should only load when relevant. Frontend skills for frontend tasks, planning skills for planning sessions. Don't load everything at boot.

## Hook Design Rules

### Hooks should be silent unless they block
Good: envelope-guard blocks a write and explains why. Bad: audit hook logs every operation to a file and adds confirmation text.

### Hooks for enforcement, not capture
Use hooks to prevent bad actions (writes to protected paths, recursive agent spawning). Don't use hooks for logging, session capture, or context injection — those should be manual skills.

### Beware plugin hooks injecting without consent
External plugins (Vercel, learning-output-style, etc.) inject skills via SessionStart and PreToolUse hooks based on keyword matching. This silently: adds thousands of tokens per turn, activates behavior modes (like "learning mode") you didn't ask for, and forces skill injections via "You must run Skill(X)" directives. Evaluate every plugin for what it injects and when.

## Namespace Convention (Cortex)

```
{project}/
├── docs/          # Project documentation (system/map, decision/adr, etc.)
├── history/       # Session snapshots, summaries
├── plans/         # Active plans, roadmaps
└── context/       # Agent-generated context

_shared/
└── docs/          # Cross-project documentation
```

Namespace topology mirrors how context is consumed. An agent working on `engine` grabs `engine/*` and gets everything scoped to that project in one query.

### Keys
Auto-generated timestamps (YYYYMMDD-HHMMSS-4random). Never human-meaningful. Meaning emerges from namespace, type, tags, and search — not key names.

### Lifecycle
All agent writes start as `draft`. Promotion to `canonical` requires explicit action. Use `note/volatile` (14-day TTL) for rough thoughts.

## Active Skills (v2)

### Keep
| Skill | Purpose |
|-------|---------|
| adr | Decision capture via sub-agent |
| blg | Quick backlog capture via sub-agent |
| doc-note | Store docs in Cortex (NEW) |
| doc-search | Query docs from Cortex (NEW) |
| boot-prompt | Manual session handoff (NEW) |
| health-check | Service health dashboard |
| qstatus | Compact status via sub-agent |
| qhealth | Compact health via sub-agent |
| hadron-run | Blueprint execution + escalation |
| standup | Standup from task activity + git |
| escalate | Convert blockers to repair tasks |
| blueprint-builder | Hadron blueprint generation |
| playwright-bowser | Browser automation |
| build-conduit-plugin | Conduit plugin builder |
| build-envelope-component | Envelope UI builder |
| vault-search | Nanite vault search |

### Deferred (redesign needed)
epic-plan, epic-summary, sprint-review, sprint-retro, task-triage, planning-session, deep-review, code-review, drift-resolve, git-cleanup, memory-audit, session-handoff, workflow-feature-branch, volon-planning, git-status-all, delegate, delegate-prompt

### Dropped
check-inbox, send-message, init-lead, agent-list, agent-status, workflow-portfolio-boot, workflow-session-end-capture, workflow-sprint-lifecycle, workflow-drift-detection, pcc-refresh-all, pcc-sync, project-onboard, cross-impact, commit-all, reorient, worktree-cleanup, discover-tools, sigil-ui, phase-sync

## Active Hooks (v2)

| Hook | Action | Notes |
|------|--------|-------|
| envelope-guard | KEEP | Blocks writes to protected paths |
| prevent-recursive-agents | KEEP (relaxed) | Depth limit, not role-based |
| session-inject | REDESIGN | Minimal boot only, not full bootstrap |
| audit | DROP | Nobody reads the logs |
| worktree-check | DROP | Warning only, low value |
| session-end | DROP | Legacy cleanup |
