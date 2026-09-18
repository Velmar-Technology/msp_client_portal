#!/usr/bin/env node
/**
 * Graphify Knowledge Graph Reconstruction & Maintenance Engine
 *
 * Automatically detects, verifies, and reconstructs the codebase knowledge graph
 * (graphify-out/graph.json, GRAPH_REPORT.md, graph.html) whenever files are missing,
 * corrupted, or when a clean rebuild is requested.
 *
 * Usage:
 *   npm run graph:build                 # Checks graph integrity; rebuilds missing artifacts
 *   npm run graph:reconstruct           # Reconstructs missing files or restores graph
 *   npm run graph:reconstruct -- --force # Forces clean extraction and re-clustering
 *   npm run graph:query -- "<question>" # Queries the knowledge graph (builds if missing)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const GRAPHIFY_OUT = path.join(PROJECT_ROOT, 'graphify-out');
const GRAPH_JSON = path.join(GRAPHIFY_OUT, 'graph.json');
const GRAPH_REPORT = path.join(GRAPHIFY_OUT, 'GRAPH_REPORT.md');
const GRAPH_HTML = path.join(GRAPHIFY_OUT, 'graph.html');
const PYTHON_PTR = path.join(GRAPHIFY_OUT, '.graphify_python');
const ROOT_PTR = path.join(GRAPHIFY_OUT, '.graphify_root');
const EXTRACT_JSON = path.join(GRAPHIFY_OUT, '.graphify_extract.json');

// Parse CLI Arguments
const rawArgs = process.argv.slice(2);
const isForce = rawArgs.includes('--force') || rawArgs.includes('-f');
const isCodeOnly = rawArgs.includes('--code-only');
const isHelp = rawArgs.includes('--help') || rawArgs.includes('-h');
const isGraphifyHelp = rawArgs.includes('--graphify-help');
const modeIdx = rawArgs.indexOf('--mode');
const mode = modeIdx !== -1 && rawArgs[modeIdx + 1] ? rawArgs[modeIdx + 1] : (rawArgs.includes('--deep') ? 'deep' : null);

// Extract query argument if supplied
let queryQuestion = null;
const queryIdx = rawArgs.findIndex(a => a === '--query' || a === '-q');
if (queryIdx !== -1 && rawArgs[queryIdx + 1]) {
  queryQuestion = rawArgs.slice(queryIdx + 1).filter(a => !a.startsWith('-')).join(' ');
} else if (rawArgs[0] && !rawArgs[0].startsWith('-') && !rawArgs.includes('--force') && !rawArgs.includes('--deep') && modeIdx === -1) {
  queryQuestion = rawArgs.join(' ');
}

if (isHelp) {
  console.log(`
Graphify Knowledge Graph Reconstruction Engine

Commands:
  npm run graph:build                   Ensure graph artifacts exist (rebuilds if missing)
  npm run graph:reconstruct             Reconstruct missing files (graph.json, report, html)
  npm run graph:reconstruct -- --force  Force re-scan and full re-clustering from scratch
  npm run graph:reconstruct -- --force --mode deep  Force full extraction with deep inferred relationships
  npm run graph:reconstruct -- --code-only Skip semantic LLM extraction and index code only
  npm run graph:query -- "<question>"   Query the knowledge graph (reconstructs first if missing)

Artifacts Managed:
  - graphify-out/graph.json             Full NetworkX knowledge graph
  - graphify-out/GRAPH_REPORT.md        High-level community breakdown and architecture report
  - graphify-out/graph.html             Interactive web visualization
  - graphify-out/.graphify_python       Resolved Python interpreter pointer
`);
  process.exit(0);
}

if (isGraphifyHelp) {
  const py = resolvePython();
  runPythonModule(py, ['graphify', '--help']);
  runPythonModule(py, ['graphify', 'extract', '--help']);
  process.exit(0);
}

/**
 * Tests if a given Python executable has graphify installed.
 * @param {string} pyPath
 * @returns {boolean}
 */
function testPython(pyPath) {
  if (!pyPath) return false;
  try {
    const res = spawnSync(pyPath, ['-c', 'import graphify'], {
      stdio: 'pipe',
      timeout: 10000,
      windowsHide: true,
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Resolves the absolute path of a Python executable.
 * @param {string} pyPath
 * @returns {string|null}
 */
function getPythonExecutable(pyPath) {
  try {
    const res = spawnSync(pyPath, ['-c', 'import sys; print(sys.executable)'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
      windowsHide: true,
    });
    if (res.status === 0 && res.stdout) {
      return res.stdout.trim();
    }
  } catch {
    // ignored
  }
  return null;
}

/**
 * Locates or configures the Python interpreter with graphify installed.
 * @returns {string}
 */
function resolvePython() {
  // 1. Check existing .graphify_python pointer
  if (fs.existsSync(PYTHON_PTR)) {
    try {
      const saved = fs.readFileSync(PYTHON_PTR, 'utf8').trim();
      if (saved && testPython(saved)) {
        return saved;
      }
    } catch {
      // invalid pointer, continue detection
    }
  }

  console.log('🔍 Locating Python environment with graphify...');

  const candidates = [];
  if (process.env.GRAPHIFY_PYTHON) {
    candidates.push(process.env.GRAPHIFY_PYTHON);
  }

  // Common platform candidate commands
  candidates.push('python');
  if (process.platform === 'win32') {
    candidates.push('py');
  }
  candidates.push('python3');

  // Check uv tool directory if available
  try {
    const uvRes = spawnSync('uv', ['tool', 'dir'], { encoding: 'utf8', stdio: 'pipe' });
    if (uvRes.status === 0 && uvRes.stdout.trim()) {
      const uvDir = uvRes.stdout.trim();
      const uvPy = process.platform === 'win32'
        ? path.join(uvDir, 'graphifyy', 'Scripts', 'python.exe')
        : path.join(uvDir, 'graphifyy', 'bin', 'python');
      candidates.push(uvPy);
    }
  } catch {
    // uv not available
  }

  // Check pipx directory if available
  try {
    const pipxRes = spawnSync('pipx', ['environment', '--value', 'PIPX_LOCAL_VENVS'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (pipxRes.status === 0 && pipxRes.stdout.trim()) {
      const pipxDir = pipxRes.stdout.trim();
      const pipxPy = process.platform === 'win32'
        ? path.join(pipxDir, 'graphifyy', 'Scripts', 'python.exe')
        : path.join(pipxDir, 'graphifyy', 'bin', 'python');
      candidates.push(pipxPy);
    }
  } catch {
    // pipx not available
  }

  for (const cand of candidates) {
    if (testPython(cand)) {
      const resolved = getPythonExecutable(cand);
      if (resolved) {
        console.log(`✅ Found active graphify in: ${resolved}`);
        persistPythonPointers(resolved);
        return resolved;
      }
    }
  }

  // 3. Graphify not found in any candidate — attempt automatic installation
  console.log('⚠️ graphifyy package not detected. Attempting automatic installation...');
  let installCandidate = 'python';
  try {
    const pyCheck = spawnSync('python', ['--version'], { stdio: 'pipe' });
    if (pyCheck.status !== 0 && process.platform === 'win32') {
      installCandidate = 'py';
    }
  } catch {
    installCandidate = process.platform === 'win32' ? 'py' : 'python3';
  }

  // Check if uv is available for faster isolated installation
  let installedWithUv = false;
  try {
    const uvCheck = spawnSync('uv', ['--version'], { stdio: 'pipe' });
    if (uvCheck.status === 0) {
      console.log('📦 Installing graphifyy via uv tool...');
      const uvInstall = spawnSync('uv', ['tool', 'install', '--upgrade', 'graphifyy'], { stdio: 'inherit' });
      if (uvInstall.status === 0) {
        installedWithUv = true;
      }
    }
  } catch {
    // uv not installed
  }

  if (!installedWithUv) {
    console.log(`📦 Installing graphifyy via pip (${installCandidate})...`);
    const pipInstall = spawnSync(installCandidate, ['-m', 'pip', 'install', '--upgrade', 'graphifyy'], { stdio: 'inherit' });
    if (pipInstall.status !== 0) {
      console.error('❌ Failed to install graphifyy automatically. Please run: pip install graphifyy');
      process.exit(1);
    }
  }

  // Re-detect after install
  for (const cand of candidates.concat([installCandidate])) {
    if (testPython(cand)) {
      const resolved = getPythonExecutable(cand);
      if (resolved) {
        console.log(`✅ Successfully initialized graphify in: ${resolved}`);
        persistPythonPointers(resolved);
        return resolved;
      }
    }
  }

  console.error('❌ Could not initialize Python environment with graphify. Please ensure Python 3.10+ and graphifyy are installed.');
  process.exit(1);
}

/**
 * Writes .graphify_python and .graphify_root pointers without BOM.
 * @param {string} pyExe
 */
function persistPythonPointers(pyExe) {
  if (!fs.existsSync(GRAPHIFY_OUT)) {
    fs.mkdirSync(GRAPHIFY_OUT, { recursive: true });
  }
  fs.writeFileSync(PYTHON_PTR, pyExe, { encoding: 'utf8' });
  fs.writeFileSync(ROOT_PTR, PROJECT_ROOT, { encoding: 'utf8' });
}

/**
 * Executes a Python module command using the resolved interpreter.
 * @param {string} pyExe
 * @param {string[]} moduleArgs
 * @returns {number} Exit code
 */
function runPythonModule(pyExe, moduleArgs) {
  const res = spawnSync(pyExe, ['-m', ...moduleArgs], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
    },
  });
  return res.status ?? 1;
}

/**
 * Reconstructs graph.json from .graphify_extract.json using Python AST & build primitives.
 * @param {string} pyExe
 * @returns {boolean}
 */
function rebuildFromExtraction(pyExe) {
  console.log('⚡ Rebuilding graph.json directly from .graphify_extract.json cache...');
  const script = `
import json, sys
from pathlib import Path
from graphify.build import build_from_json
from graphify.export import to_json

extract_p = Path(r"${EXTRACT_JSON.replace(/\\/g, '\\\\')}")
graph_p = Path(r"${GRAPH_JSON.replace(/\\/g, '\\\\')}")
if not extract_p.exists():
    sys.exit(1)

data = json.loads(extract_p.read_text(encoding="utf-8"))
G = build_from_json(data, root=r"${PROJECT_ROOT.replace(/\\/g, '\\\\')}")
to_json(G, {}, str(graph_p))
print(f"Rebuilt graph.json: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
`;
  const res = spawnSync(pyExe, ['-c', script], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  return res.status === 0;
}

/**
 * Main reconstruction coordinator.
 */
async function main() {
  const missingGraph = !fs.existsSync(GRAPH_JSON);
  const missingReport = !fs.existsSync(GRAPH_REPORT);
  const missingHtml = !fs.existsSync(GRAPH_HTML);
  const anyMissing = missingGraph || missingReport || missingHtml;

  // If query requested and graph exists, run query immediately
  if (queryQuestion && !missingGraph && !isForce) {
    const py = resolvePython();
    console.log(`🔎 Querying Knowledge Graph: "${queryQuestion}"\n`);
    const code = runPythonModule(py, ['graphify', 'query', queryQuestion]);
    process.exit(code);
  }

  // If nothing is missing, not forced, and no custom extraction mode requested, report healthy status
  if (!anyMissing && !isForce && !mode) {
    try {
      const graphData = JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf8'));
      const nodeCount = graphData.nodes ? graphData.nodes.length : 0;
      const edgeCount = graphData.links ? graphData.links.length : (graphData.edges ? graphData.edges.length : 0);
      console.log('✨ Knowledge graph is fully intact:');
      console.log(`   - Graph:         graphify-out/graph.json (${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges)`);
      console.log(`   - Report:        graphify-out/GRAPH_REPORT.md (${(fs.statSync(GRAPH_REPORT).size / 1024).toFixed(1)} KB)`);
      console.log(`   - Visualization: graphify-out/graph.html (${(fs.statSync(GRAPH_HTML).size / 1024).toFixed(1)} KB)`);
      console.log('\n💡 Tip: To force a clean re-extraction, run: npm run graph:reconstruct -- --force');
      if (queryQuestion) {
        const py = resolvePython();
        console.log(`\n🔎 Querying Knowledge Graph: "${queryQuestion}"\n`);
        const code = runPythonModule(py, ['graphify', 'query', queryQuestion]);
        process.exit(code);
      }
      process.exit(0);
    } catch {
      console.warn('⚠️ graph.json is corrupted or unreadable. Initiating reconstruction...');
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        🛠️  GRAPHIFY KNOWLEDGE GRAPH RECONSTRUCTION           ');
  console.log('═══════════════════════════════════════════════════════════════');

  const py = resolvePython();

  // Missing files report
  if (isForce) {
    console.log('🔄 Rebuild forced via --force flag.');
  } else {
    console.log('⚠️ Graph state check:');
    console.log(`   - graph.json:         ${fs.existsSync(GRAPH_JSON) ? '✅ Present' : '❌ Missing'}`);
    console.log(`   - GRAPH_REPORT.md:    ${fs.existsSync(GRAPH_REPORT) ? '✅ Present' : '❌ Missing'}`);
    console.log(`   - graph.html:         ${fs.existsSync(GRAPH_HTML) ? '✅ Present' : '❌ Missing'}`);
  }

  // Step 1: Reconstruct graph.json if missing, forced, or custom extraction mode requested
  const isDeepMode = mode === 'deep';
  if (missingGraph || isForce || isDeepMode) {
    let fastRestored = false;
    if (!isForce && !isDeepMode && fs.existsSync(EXTRACT_JSON)) {
      fastRestored = rebuildFromExtraction(py);
    }

    if (!fastRestored) {
      const hasLlmKey = Boolean(
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.DEEPSEEK_API_KEY ||
        process.env.MOONSHOT_API_KEY
      );

      const extractArgs = ['graphify', 'extract', '.'];
      if (mode) {
        console.log(`🧠 Extraction mode set to: ${mode}`);
        extractArgs.push('--mode', mode);
      }

      if (!hasLlmKey || isCodeOnly) {
        console.log('⚙️ Running code AST extraction (--code-only)...');
        extractArgs.push('--code-only');
      } else {
        console.log('🤖 Running full extraction (AST + Semantic LLM)...');
      }

      if (isForce || isDeepMode) {
        extractArgs.push('--force');
      }

      const extractCode = runPythonModule(py, extractArgs);
      if (extractCode !== 0) {
        console.error('❌ Extraction failed. Please inspect errors above.');
        process.exit(extractCode);
      }
    }
  }

  // Step 2: Re-cluster and generate GRAPH_REPORT.md & updated graph.json
  if (!fs.existsSync(GRAPH_REPORT) || isForce || isDeepMode || missingGraph) {
    console.log('\n📊 Re-clustering graph and generating GRAPH_REPORT.md...');
    const clusterCode = runPythonModule(py, ['graphify', 'cluster-only', '.']);
    if (clusterCode !== 0) {
      console.warn('⚠️ Clustering returned non-zero code; checking if report exists...');
    }
  }

  // Step 3: Ensure graph.html exists
  if (!fs.existsSync(GRAPH_HTML) || isForce || isDeepMode) {
    console.log('\n🌐 Exporting interactive visualization (graph.html)...');
    runPythonModule(py, ['graphify', 'export', 'html']);
  }

  // Final validation
  if (!fs.existsSync(GRAPH_JSON)) {
    console.error('❌ Reconstruction finished but graphify-out/graph.json is still missing.');
    process.exit(1);
  }

  const finalData = JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf8'));
  const nodes = finalData.nodes ? finalData.nodes.length : 0;
  const edges = finalData.links ? finalData.links.length : (finalData.edges ? finalData.edges.length : 0);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 RECONSTRUCTION COMPLETE');
  console.log(`   - Graph:         graphify-out/graph.json (${nodes.toLocaleString()} nodes, ${edges.toLocaleString()} edges)`);
  if (fs.existsSync(GRAPH_REPORT)) {
    console.log(`   - Report:        graphify-out/GRAPH_REPORT.md (${(fs.statSync(GRAPH_REPORT).size / 1024).toFixed(1)} KB)`);
  }
  if (fs.existsSync(GRAPH_HTML)) {
    console.log(`   - Visualization: graphify-out/graph.html (${(fs.statSync(GRAPH_HTML).size / 1024).toFixed(1)} KB)`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  // If query was requested, execute it now
  if (queryQuestion) {
    console.log(`🔎 Querying Knowledge Graph: "${queryQuestion}"\n`);
    const code = runPythonModule(py, ['graphify', 'query', queryQuestion]);
    process.exit(code);
  }
}

main().catch(err => {
  console.error('❌ Unexpected error during graph reconstruction:', err);
  process.exit(1);
});
