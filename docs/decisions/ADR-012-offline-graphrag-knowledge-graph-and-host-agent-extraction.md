# ADR-012: Offline GraphRAG Knowledge Graph, Host-Agent Semantic Extraction, and Antigravity CLI Integration

## Status
Accepted

## Date
2026-09-17

## Context
As the Velmar Technology MSP Client Portal codebase expanded into a multi-workspace monorepo (1,099 total files, over 720,000 words across TypeScript, Rust, SQL, Docker, and Markdown specifications), engineers and autonomous AI agents required an authoritative, persistent representation of the system's structural and semantic relationships.

Navigating this architecture presented three significant technical hurdles:

1. **Semantic Blind Spots of Lexical Search:**
   Conventional regex and ripgrep tools (`grep_search`, `find_by_name`) locate symbols but cannot trace non-obvious cross-layer dependencies—such as the runtime linkage between the Tauri desktop IPC payload (`packages/msp-tray`), the 18 Master Business Logic invariants (`BL-101` through `BL-802`), and the Zanzibar Zero Standing Privilege (`ZSP`) authorization PDP (`server/src/shared/authz`).

2. **External LLM Key Dependency & Operational Cost:**
   Standard GraphRAG tools (such as the default `graphify .` CLI workflow) require an external LLM API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) to parse non-code artifacts (architecture specs, ADRs, agent instructions, runbooks). Without a configured API key, execution halts with `error: no LLM API key found`. Requiring third-party API keys creates friction, introduces credential sprawl, and leaks architectural IP to unmanaged endpoints.

3. **Windows PowerShell 5.1 & Python 3.14 Runtime Incompatibilities:**
   In the Windows developer environment, Python 3.14's interactive `_pyrepl` console encounters `WinError 123` during unbuffered subshell execution. The pipeline required a deterministic, non-interactive execution pattern compatible with automated orchestrators.

---

## Decision

We implement the **Offline GraphRAG Knowledge Graph Architecture**, replacing third-party API dependencies with a **Host-Agent Semantic Extraction Pipeline** orchestrated through the **Antigravity CLI (`agy`)**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          CODEBASE CORPUS (1,099 FILES, ~720K WORDS)                    │
│                          1,001 Code Files · 77 Documentation Files · 21 Images         │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│        STRUCTURAL AST PASS (FREE)     │ │        SEMANTIC EXTRACTION PASS              │
│       (Tree-Sitter / Deterministic)   │ │       (Antigravity Host LLM Agent)           │
│                                       │ │                                              │
│ - Types, interfaces, classes, funcs   │ │ - 7 Chunks (20-25 docs each)                 │
│ - Calls, imports, type references     │ │ - Strict JSON contract (extraction-spec.md)  │
│ - 6,148 AST nodes, 17,686 AST edges   │ │ - Extracted/Inferred relations & rationale   │
│ - graphify-out/.graphify_ast.json     │ │ - 517 semantic nodes, 770 semantic edges     │
└───────────────────┬───────────────────┘ └──────────────────────┬───────────────────────┘
                    │                                            │
                    │                                            ▼
                    │                     ┌──────────────────────────────────────────────┐
                    │                     │    FILTER & CANONICALIZATION (gfy_filter.py) │
                    │                     │ - Drops out-of-corpus references             │
                    │                     │ - Resolves verbatim absolute source paths    │
                    │                     │ - Saves cache to graphify-out/cache/         │
                    │                     └──────────────────────┬───────────────────────┘
                    │                                            │
                    ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MERGED EXTRACTION (.graphify_extract.json)                      │
│                               6,665 nodes · 18,456 raw edges                           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     GRAPH BUILD, CLUSTERING & ANALYSIS PIPELINE                        │
│                                                                                        │
│  [graphify.build.build_from_json] ── NetworkX multi-layer graph construction           │
│  [graphify.cluster.cluster]       ── Leiden community detection (321 communities)      │
│  [graphify.analyze]               ── God node identification & surprising cross-links  │
│  [Curated Domain Labeling]        ── 2-5 word plain-language architectural taxonomy    │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌──────────────────────────────┐
│  graphify-out/        │    │  graphify-out/        │    │  graphify-out/               │
│  graph.json           │    │  GRAPH_REPORT.md      │    │  graph.html                  │
│                       │    │                       │    │                              │
│  6,845 total nodes    │    │  Architecture health, │    │  Aggregated interactive view │
│  17,516 total edges   │    │  god nodes, community │    │  (321 community meta-nodes,  │
│  GraphRAG queryable   │    │  hubs & navigation    │    │  999 cross-community edges)  │
└───────────────────────┘    └───────────────────────┘    └──────────────────────────────┘
            ▲
            │ Query & Traverse (BFS / DFS)
┌───────────┴────────────────────────────────────────────────────────────────────────────┐
│                             ANTIGRAVITY WORKFLOW (`agy`)                               │
│  - python -m graphify query "<question>" [--budget 10000]                              │
│  - python -m graphify explain "<entity>"                                               │
│  - python -m graphify path "<nodeA>" "<nodeB>"                                         │
│  - agy: "Run incremental graph update on latest commits" (Zero API Key Overhead)      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Zero-Key Host-Agent Semantic Extraction
- **The Running Agent IS the LLM:** When `GEMINI_API_KEY` is not present in the runtime environment, semantic document extraction is dispatched directly to Antigravity's host agent and read-only subagents.
- **Strict Extraction Contract:** Subagents read document contents in full using filesystem tools and return pure JSON objects conforming to `extraction-spec.md`:
  - **Deterministic IDs:** Stems represent normalized relative file paths with all directory levels retained (`{stem}_{entity}`), eliminating cross-chunk collisions and orphan ghost nodes.
  - **Confidence Rubric:** Explicit discrete confidence scores (`EXTRACTED` = 1.0; `INFERRED` $\in \{0.95, 0.85, 0.75, 0.65, 0.55\}$; `AMBIGUOUS` $\in [0.1, 0.3]$; $0.5$ strictly forbidden).
  - **Single Responsibility Attributes:** Rationales and architectural trade-offs are stored as attributes on concept nodes rather than polluting the graph with orphan text fragment nodes.

### 2. Deterministic Filtering and Semantic Cache
- A dedicated pipeline filter script (`gfy_filter.py`) validates generated chunk JSON files against `graphify-out/.graphify_uncached.txt`.
- Any entity or edge referencing non-existent, obsolete, or deleted paths is discarded before graph assembly.
- Extractions are cached to disk via `graphify.cache.save_semantic_cache` keyed by prompt hash, enabling instant cache hits on future runs.

### 3. Windows 3.14 Execution Stability
- All Python tool invocations enforce headless execution through:
  ```powershell
  cmd /c "set PYTHON_BASIC_REPL=1& C:\Users\PC\AppData\Local\Programs\Python\Python314\python.exe -X utf8 <script> <args> < NUL"
  ```
- Bypasses the broken Windows `_pyrepl` console initialization and ensures reliable UTF-8 input/output streams.

### 4. Scalable Community Aggregation (>5,000 Nodes)
- Visualizing graphs with over 5,000 nodes in browser WebGL canvases leads to browser crashes and illegible hairball diagrams.
- The exporter evaluates `node_limit=5000` and automatically aggregates the graph into a **Community Meta-Graph**:
  - Compresses 6,845 raw nodes into **321 community meta-nodes**.
  - Groups 17,516 fine-grained edges into **999 weighted cross-community bridges**.
  - Embeds curated 2-5 word architectural labels (e.g. *Ticket Workflow & SLA Rules*, *Desktop Tray IPC*, *Hybrid Authorization Engine PDP*).

### 5. Antigravity CLI Integration
- Developers and autonomous agents query the graph directly from the terminal or chat interface:
  ```powershell
  python -m graphify query "<architectural question>" --budget 10000
  ```
- PreToolUse hooks enforce that agents query `graphify-out/graph.json` for orientation before performing raw regex searches on large subsystems.

---

## Consequences

### Positive
- **Complete Offline Independence:** Knowledge graphs can be built, updated, and queried in air-gapped or restricted environments with zero API key dependencies.
- **Unified Code + Spec Topology:** Links concrete TypeScript and Rust implementations directly to business requirements (`BL-101` to `BL-802`) and ADR rationale.
- **Predictable Token Costs:** Zero external API fees. Semantic extraction cost is absorbed entirely by standard conversational context tokens.
- **Fast Differential Updates:** Subsequent runs leverage `.graphify_manifest.json` to only re-extract files that have changed in git.

### Negative / Trade-offs
- **Batch Processing Time:** Running host-agent semantic extraction across 77 document files requires sequential or batched subagent execution (~2 to 3 minutes for full initial cold build).
- **Visualization Resolution Trade-off:** The interactive HTML view renders the community meta-graph rather than individual variable nodes; individual node inspection requires the JSON export or `graphify query / explain` CLI commands.

---

## Verification & Health Metrics

The knowledge graph build completed with the following validated benchmarks:
- **Total Corpus:** 1,099 files (1,001 code, 77 document, 21 images, ~720,258 words).
- **Document Coverage:** 77 / 77 files (100% complete, 0 missing files).
- **Graph Assembly:** 6,845 nodes, 17,516 edges, 19 hyperedges across 321 clustered communities.
- **Integrity Gate (Step 4.5):** 0 missing endpoints; dangling edges confined to external language runtime primitives (`rs_string`, Node built-ins).
- **Query Verification:** Verified via BFS and DFS queries with `--budget 10000`.
