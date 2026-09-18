# Knowledge Graph & Architecture Navigation Guide (graphify)

> Comprehensive developer guide, operational workflows, and lifecycle management for the MSP Client Portal knowledge graph.

The MSP Client Portal repository integrates an offline **GraphRAG Knowledge Graph** powered by `graphify`. It maps all 1,000+ source code files, database schemas, ADRs, security policies, and master business logic rules (`BL-101` to `BL-802`) into a unified NetworkX topological graph (6,800+ nodes and 17,500+ edges across 320+ communities).

---

## 1. Do I Need to Reconstruct the Graph Every Time I Write Code?

**No, definitely not.** You do not need to rebuild or reconstruct the graph every time you write code, add a function, or make a commit.

### Developer Lifecycle Matrix

| Situation | Action Required | What Happens Under the Hood |
| :--- | :--- | :--- |
| **Normal Day-to-Day Coding**<br>*(Bug fixes, UI components, adding endpoints, adjusting tests)* | **None.** Just write, test, and commit normally. | The existing graph remains 98%+ accurate for querying module boundaries, architectural dependencies, and entity structures. |
| **Major Milestone / New Module**<br>*(Added an entire bounded context in `server/src/modules/` or new client feature)* | Run an **incremental update**:<br>`/graphify --update` | Runs in ~5–10s. Compares `git diff` against `manifest.json`, re-extracts AST only on modified files, and merges differential nodes. |
| **Missing Files / Fresh Clone**<br>*(New workstation, or `graphify-out/` was accidentally deleted)* | Run the npm recovery command:<br>`npm run graph:reconstruct` | Detects missing artifacts (`graph.json`, `GRAPH_REPORT.md`, `graph.html`) and reconstructs them automatically. |
| **Optional Continuous Sync**<br>*(Background auto-sync on commit)* | Install the git post-commit hook:<br>`& (Get-Content graphify-out\.graphify_python) -m graphify hook install` | Executes silently on `git commit`, only re-indexing changed files via `git diff HEAD~1`. |

---

## 2. npm Commands Reference

The root `package.json` provides first-class scripts for graph management, automated recovery, and semantic querying:

### `npm run graph:build`
Verifies that all graph artifacts exist and are healthy. If any file (`graph.json`, `GRAPH_REPORT.md`, or `graph.html`) is missing or corrupted, it automatically rebuilds them. If everything is intact, it reports node and edge counts and exits in `<1s`.

```bash
npm run graph:build
```

### `npm run graph:reconstruct`
Restores any missing or incomplete graph artifacts. If `graph.json` was deleted but `.graphify_extract.json` exists, it executes a fast restore in ~5 seconds. If all files are missing (cold start), it runs AST extraction and re-clustering.

```bash
# Standard auto-healing reconstruction
npm run graph:reconstruct

# Force a clean re-scan and full re-clustering from scratch
npm run graph:reconstruct -- --force

# Index code only via AST (skips semantic LLM extraction; zero API keys required)
npm run graph:reconstruct -- --code-only
```

### `npm run graph:query`
Queries the knowledge graph directly from your terminal. If the graph is missing, it **automatically reconstructs the graph first** before answering.

```bash
npm run graph:query -- "How does technician commission calculation work?"
npm run graph:query -- "Where are invoices defined in Drizzle ORM?"
npm run graph:query -- "What modules connect to the API Gateway?"
```

---

## 3. Artifacts Managed in `graphify-out/`

All knowledge graph files live in `graphify-out/` relative to the workspace root:

| Artifact | File Path | Purpose |
| :--- | :--- | :--- |
| **Knowledge Graph** | `graphify-out/graph.json` | The core NetworkX graph data containing all extracted nodes, directed/undirected edges, hyperedges, and community IDs. |
| **Architecture Report** | `graphify-out/GRAPH_REPORT.md` | Human-readable markdown report with god node analysis, community breakdown, cohesion scores, and cross-cutting connections. |
| **Interactive Visualization** | `graphify-out/graph.html` | Standalone interactive D3/WebGL visualization. Automatically aggregates graphs $>5,000$ nodes into a clean community meta-graph. |
| **Python Pointer** | `graphify-out/.graphify_python` | Stores the absolute path to the Python interpreter where `graphifyy` is installed (Windows PowerShell & POSIX safe). |
| **Root Pointer** | `graphify-out/.graphify_root` | Canonical workspace root path used for portable node key resolution. |
| **Manifest & Cache** | `graphify-out/manifest.json`<br>`graphify-out/cache/` | Differential file hashes and AST/semantic cache enabling sub-second cache hits on incremental updates. |

---

## 4. Querying & Navigation Techniques

### Traversal Modes
- **BFS (Breadth-First Search - Default):** Best for *"What is X connected to?"* and discovering immediate architectural neighbors and dependencies.
- **DFS (Depth-First Search):** Best for *"How does X reach Y?"* and tracing execution chains or multi-hop call paths across boundaries.

```powershell
# Using the resolved interpreter directly
& (Get-Content graphify-out\.graphify_python) -m graphify query "Zanzibar PDP" --budget 4000

# Tracing paths between components
& (Get-Content graphify-out\.graphify_python) -m graphify path "TicketController" "SequenceSentinelService"

# Inspecting a single node in depth
& (Get-Content graphify-out\.graphify_python) -m graphify explain "TechnicianBountyChecker"
```

---

## 5. Antigravity (`agy`) Integration

In Google Antigravity (`agy`), autonomous agents consult the graph before embarking on large refactors or investigative searches.

### Rules Configured in `AGENTS.md`
1. **Orientation Before Search:** Agents check if `graphify-out/graph.json` exists before running open-ended directory sweeps.
2. **Deterministic Tooling:** Agents invoke `npm run graph:query` or use the `graphify` skill.
3. **Subagent Extraction:** During semantic extraction passes, agents dispatch chunks in parallel via `invoke_subagent` using `TypeName: "research"` (read-only with `Model: "flash"`) or `TypeName: "self"`.
4. **Zero API Key Friction:** AST extraction on code files is 100% free and local. Semantic doc extraction uses the agent's host context or cached results with zero external vendor dependencies.
