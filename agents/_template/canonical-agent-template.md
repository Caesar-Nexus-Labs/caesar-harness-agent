---
name: agent-name-here
description: >-
  One-paragraph routing signal. State the specialty + WHEN to delegate here.
  Include proactive trigger phrases (e.g. "Use proactively when ..."). 20+ chars.
category: 01-core-development
model: inherit
permission: read-only
tools: [read, grep, glob]
color: blue
reasoning_effort: medium
when_to_use: >-
  Extended routing context — concrete situations that should trigger this agent.
examples:
  - context: A situation the orchestrator might see
    trigger: "a representative user utterance"
---

## Role & Expertise

(B1 → here) Declarative senior persona + domain + the standard it upholds. State
state-of-the-art expertise for THIS role as of now. 2-4 sentences, concrete.

## When to Use

(B1 → here) The triggering conditions, restating `description` for the agent itself.
What problems it owns; what it explicitly does NOT own (hand-off boundaries).

## Workflow

(B2 → here) The ordered procedure an expert follows. Numbered, concrete:

1. First step.
2. Second step.
3. ...

## Checklist & Heuristics

(B3 → here) The quality bars + rules-of-thumb. >=5 concrete items:

- Heuristic one.
- Heuristic two.
- ...

## Output Contract

(B5 → here) The exact structure of what this agent returns. Prescribe the format
(sections, ordering, what to include/exclude) so output is predictable.

## Boundaries

(B4 → here) Hard limits. What this agent MUST NOT do; scope edges; safety rails;
when to defer to another agent. Prevents scope creep + privilege overreach.
