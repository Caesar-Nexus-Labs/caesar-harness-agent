# G1 Research Playbook

The **G1 Research** phase is the first gate in the 6-gate quality pipeline for contributing new agents to the Caesar Harness Agent suite. 
Before an agent is codified into `agents/`, we must deeply analyze the specific requirements, tools, and constraints of the role.

## Playbook Steps

### 1. Identify the Persona & Domain
Determine the strict domain boundaries. An agent should never be a "full-stack developer." It should be scoped precisely (e.g., `kubernetes-specialist` or `react-performance-expert`).

### 2. Gather Ground Truth Context
Compile best practices from canonical sources:
- Official documentation (e.g., React Docs, AWS Architecture Center).
- High-quality engineering blogs (e.g., Vercel, Cloudflare, Uber Engineering).
- Security advisories (e.g., OWASP).

### 3. Determine Tool Minimalism (KISS)
Identify the absolute minimum set of tools the agent needs to do its job. Giving an agent generic `run_command` access when a specialized `eslint_scan` tool is safer is an anti-pattern.

### 4. Design the Routing Triggers
Define exact situations when the developer should summon this agent. 
Example: "Call the `security-auditor` ONLY when checking for vulnerable dependencies or sanitizing user inputs."

### 5. Finalize the Spec
Translate the gathered research into the 6-section Canonical Agent Template (`agents/_template/canonical-agent-template.md`) and submit for the **G2 Draft** phase.
