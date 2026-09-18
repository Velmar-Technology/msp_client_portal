# graphify reference: commit hook and native AGENTS.md / CLAUDE.md integration

Load this when the user asked to install the post-commit hook or wire graphify into a project's AGENTS.md or CLAUDE.md.

## For git commit hook

Install a post-commit hook that auto-rebuilds the graph after every commit. No background process needed - triggers once per commit, works with any editor.

```powershell
& (Get-Content graphify-out\.graphify_python) -m graphify hook install    # install
& (Get-Content graphify-out\.graphify_python) -m graphify hook uninstall  # remove
& (Get-Content graphify-out\.graphify_python) -m graphify hook status     # check
```

After every `git commit`, the hook detects which code files changed (via `git diff HEAD~1`), re-runs AST extraction on those files, and rebuilds `graph.json` and `GRAPH_REPORT.md`. Doc/image changes are ignored by the hook - run `/graphify --update` manually for those.

If a post-commit hook already exists, graphify appends to it rather than replacing it.

---

## For native Antigravity (AGY) / AGENTS.md integration

In Google Antigravity (`agy`), agent rules and orchestrations are governed by `AGENTS.md` (and `GEMINI.md`). To make graphify always active across agent turns, add this section to your workspace `AGENTS.md`:

```markdown
## Knowledge Graph & Architectural Navigation (graphify)
- **Check Graph First:** When investigating codebase architecture, cross-module dependencies, god nodes, or refactoring blast radius, check if `graphify-out/graph.json` exists.
- **Query via agy:** If present, execute queries using PowerShell:
  `& (Get-Content graphify-out\.graphify_python) -m graphify query "<question>"`
  or activate the `graphify` skill, or run `npm run graph:query -- "<question>"`.
- **Reconstruct if missing:** If graph files are missing, run `npm run graph:reconstruct` (or `npm run graph:build`) to automatically restore the graph, report, and HTML visualization.
- **Update after mutations:** Following major domain structural additions, run `/graphify --update` to refresh graph nodes and community reports.
```

---

## For native CLAUDE.md integration

Run once per project to make graphify always-on in Claude Code sessions:

```bash
graphify claude install
```

This writes a `## graphify` section to the local `CLAUDE.md` that instructs Claude to check the graph before answering codebase questions and rebuild it after code changes. No manual `/graphify` needed in future sessions.

```bash
graphify claude uninstall  # remove the section
```

