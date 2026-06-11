/**
 * Benchmark LOD pipeline without the browser.
 * Usage: npm run loadtest -- 2000 50
 *   arg1 = synthetic node count (default 2000)
 *   arg2 = iterations (default 30)
 */
import { generateLoadtestNodes } from '../src/lib/loadtestNodes'
import { compactFromListing } from '../src/lib/compactNode'
import { runLodEngine } from '../src/lib/lodCore'

const count = Number(process.argv[2] ?? 2000)
const iterations = Number(process.argv[3] ?? 30)

const nodes = generateLoadtestNodes(count).map((n) => compactFromListing(n)!)
const bbox: [number, number, number, number] = [5.07, 52.07, 5.14, 52.11]
const zoom = 14.5

let total = 0
let tier = 'sparse'
let dom = 0

for (let i = 0; i < iterations; i++) {
  const result = runLodEngine({
    compactNodes: nodes,
    bbox,
    zoom,
    prevZoom: zoom - 0.2,
    mapCenter: [5.1214, 52.0907],
    hoveredId: i % 17 === 0 ? nodes[i % nodes.length]?.id ?? null : null,
    selectedId: null,
    drawerHighlightId: null,
    activeCluster: null,
  })
  total += result.elapsedMs
  tier = result.tier
  dom = result.domMarkerIds.length
}

const avg = total / iterations
console.log(`nodes=${count} iterations=${iterations}`)
console.log(`avg=${avg.toFixed(2)}ms tier=${tier} domMarkers=${dom}`)
console.log(`worker threshold=${process.env.VITE_LOD_WORKER_MIN_NODES ?? 500} (browser only)`)
