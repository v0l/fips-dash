import { useEffect, useMemo, useRef } from 'react'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'

interface TreePeer {
  display_name?: string | null
  npub?: string | null
  depth?: number | null
  distance_to_us?: number | null
}

export interface DirectPeer {
  display_name?: string | null
  npub?: string | null
  relationship: 'parent' | 'child' | 'peer'
  tree_depth?: number | null
}

interface TreeStats {
  accepted: number
  parent_switches: number
  parent_losses: number
  loop_detected: number
  flap_dampened: number
}

export interface TreeData {
  root?: string | null
  is_root: boolean
  depth?: number | null
  peer_tree_count: number
  peers: TreePeer[]
  stats: TreeStats
}

const SELF_NODE_ID = '__self__'

// Each positioned node in our flat layout
interface LayoutNode {
  id: string
  label: string
  sublabel: string
  npub?: string | null
  absDepth: number  // absolute depth in the global tree
  isSelf: boolean
  relationship?: 'parent' | 'child' | 'peer' // from direct peers list
  x: number
  y: number
}

interface LayoutEdge {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}

const NODE_RADIUS_SELF = 28
const NODE_RADIUS = 20
const DEPTH_STEP_Y = 100   // vertical pixels per tree depth level
const SIBLING_STEP_X = 120 // horizontal pixels between siblings at same depth

function buildLayout(tree: TreeData, directPeers: DirectPeer[]): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const selfDepth = tree.depth ?? 0

  // Build a map from npub/display_name to DirectPeer for relationship lookup
  const directByKey = new Map<string, DirectPeer>()
  for (const p of directPeers) {
    if (p.npub) directByKey.set(p.npub, p)
    if (p.display_name) directByKey.set(p.display_name, p)
  }

  // Gather all known nodes: Self + tree.peers
  interface RawNode {
    id: string
    label: string
    npub?: string | null
    absDepth: number
    isSelf: boolean
    relationship?: DirectPeer['relationship']
  }

  const rawNodes: RawNode[] = []

  // Self
  rawNodes.push({
    id: SELF_NODE_ID,
    label: tree.is_root ? 'Self (Root)' : 'Self',
    npub: null,
    absDepth: selfDepth,
    isSelf: true,
  })

  // Peers from tree
  tree.peers.forEach((peer, i) => {
    const id = peer.npub || peer.display_name || `peer-${i}`
    const dp = directByKey.get(peer.npub ?? '') ?? directByKey.get(peer.display_name ?? '')
    rawNodes.push({
      id,
      label: peer.display_name || id.slice(0, 8),
      npub: peer.npub,
      absDepth: peer.depth ?? selfDepth,
      isSelf: false,
      relationship: dp?.relationship,
    })
  })

  // Group nodes by absolute depth
  const byDepth = new Map<number, RawNode[]>()
  for (const n of rawNodes) {
    if (!byDepth.has(n.absDepth)) byDepth.set(n.absDepth, [])
    byDepth.get(n.absDepth)!.push(n)
  }

  // Sort depth levels
  const depthLevels = Array.from(byDepth.keys()).sort((a, b) => a - b)
  const minDepth = depthLevels[0]

  // Assign x positions: spread siblings evenly, centered at 0
  const positionedMap = new Map<string, LayoutNode>()

  for (const d of depthLevels) {
    const siblings = byDepth.get(d)!
    const count = siblings.length
    siblings.forEach((n, i) => {
      const xOffset = (i - (count - 1) / 2) * SIBLING_STEP_X
      const yOffset = (d - minDepth) * DEPTH_STEP_Y
      positionedMap.set(n.id, {
        ...n,
        sublabel: n.isSelf ? `depth ${d}` : `depth ${d}`,
        x: xOffset,
        y: yOffset,
      })
    })
  }

  const nodes = Array.from(positionedMap.values())

  // Build edges: connect nodes whose absDepth differs by exactly 1.
  // Strategy: for each node at depth D, connect it to the "closest" node at depth D-1.
  // If Self is at depth D and has a direct parent (relationship="parent"), connect Self→parent.
  // Otherwise pair up by index (closest sibling).
  const edges: LayoutEdge[] = []
  const edgeSet = new Set<string>()

  for (const d of depthLevels) {
    const currentLevel = byDepth.get(d)!
    const parentLevel = byDepth.get(d - 1)
    if (!parentLevel || parentLevel.length === 0) continue

    for (let i = 0; i < currentLevel.length; i++) {
      const child = currentLevel[i]
      let parentNode: RawNode

      if (child.isSelf) {
        // Connect Self to its direct parent if known
        const directParent = directPeers.find(p => p.relationship === 'parent')
        if (directParent) {
          const pid = directParent.npub || directParent.display_name || ''
          const found = parentLevel.find(p => p.id === pid || p.label === directParent.display_name)
          parentNode = found ?? parentLevel[Math.min(i, parentLevel.length - 1)]
        } else {
          parentNode = parentLevel[Math.min(i, parentLevel.length - 1)]
        }
      } else if (child.relationship === 'child') {
        // Self's direct child — connect to Self
        const self = positionedMap.get(SELF_NODE_ID)
        if (self && self.absDepth === d - 1) {
          parentNode = { id: SELF_NODE_ID, label: 'Self', absDepth: selfDepth, isSelf: true }
        } else {
          parentNode = parentLevel[Math.min(i, parentLevel.length - 1)]
        }
      } else {
        // Generic: pair to closest parent by index
        parentNode = parentLevel[Math.min(i, parentLevel.length - 1)]
      }

      const childPos = positionedMap.get(child.id)
      const parentPos = positionedMap.get(parentNode.id)
      if (!childPos || !parentPos) continue

      const key = `${parentNode.id}→${child.id}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({ key, x1: parentPos.x, y1: parentPos.y, x2: childPos.x, y2: childPos.y })
      }
    }
  }

  return { nodes, edges }
}

export function TreeGraph({ tree, peers: directPeers }: { tree: TreeData; peers: DirectPeer[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)

  const { nodes, edges, viewBox } = useMemo(() => {
    const { nodes, edges } = buildLayout(tree, directPeers)

    if (nodes.length === 0) return { nodes, edges, viewBox: '0 0 400 200' }

    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const pad = 80
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad
    const vbWidth = maxX - minX
    const vbHeight = maxY - minY

    // Shift all positions so viewBox starts at (0,0)
    for (const n of nodes) {
      n.x -= minX
      n.y -= minY
    }
    for (const e of edges) {
      e.x1 -= minX; e.y1 -= minY
      e.x2 -= minX; e.y2 -= minY
    }

    return { nodes, edges, viewBox: `0 0 ${vbWidth} ${vbHeight}` }
  }, [tree, directPeers])

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svg = select(svgRef.current)
    const g = select(gRef.current)
    const zoom = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    svg.call(zoom)
    // fit initial view
    const { width, height } = svgRef.current.getBoundingClientRect()
    const [, , vbW, vbH] = viewBox.split(' ').map(Number)
    const scale = Math.min(width / vbW, height / vbH) * 0.9
    const tx = (width - vbW * scale) / 2
    const ty = (height - vbH * scale) / 2
    svg.call(zoom.transform, zoomIdentity.translate(tx, ty).scale(scale))
    return () => { svg.on('.zoom', null) }
  }, [viewBox])

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-5">
        <div className="rounded-lg bg-black p-3">
          <div className="text-xs text-neutral-500">Accepted</div>
          <div className="text-lg font-semibold text-white">{tree.stats.accepted}</div>
        </div>
        <div className="rounded-lg bg-black p-3">
          <div className="text-xs text-neutral-500">Parent Switches</div>
          <div className="text-lg font-semibold text-white">{tree.stats.parent_switches}</div>
        </div>
        <div className="rounded-lg bg-black p-3">
          <div className="text-xs text-neutral-500">Parent Losses</div>
          <div className="text-lg font-semibold text-white">{tree.stats.parent_losses}</div>
        </div>
        <div className="rounded-lg bg-black p-3">
          <div className="text-xs text-neutral-500">Loops</div>
          <div className="text-lg font-semibold text-white">{tree.stats.loop_detected}</div>
        </div>
        <div className="rounded-lg bg-black p-3">
          <div className="text-xs text-neutral-500">Flap Dampened</div>
          <div className="text-lg font-semibold text-white">{tree.stats.flap_dampened}</div>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="w-full bg-neutral-900 rounded-md border border-neutral-800 cursor-grab active:cursor-grabbing"
        style={{ height: '500px' }}
      >
        <g ref={gRef}>
          {/* edges */}
          {edges.map(e => (
            <line
              key={e.key}
              x1={e.x1} y1={e.y1}
              x2={e.x2} y2={e.y2}
              stroke="#4b5563"
              strokeWidth={1.5}
            />
          ))}

          {/* nodes */}
          {nodes.map(n => {
            const r = n.isSelf ? NODE_RADIUS_SELF : NODE_RADIUS

            let fill: string
            let stroke: string
            if (n.isSelf) {
              fill = tree.is_root ? '#92400e' : '#1e3a5f'
              stroke = tree.is_root ? '#d97706' : '#3b82f6'
            } else if (n.relationship === 'parent') {
              fill = '#1a3a2a'
              stroke = '#22c55e'
            } else if (n.relationship === 'child') {
              fill = '#2a1a3a'
              stroke = '#a855f7'
            } else {
              fill = '#1f2937'
              stroke = '#6b7280'
            }

            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <title>{n.npub ?? n.id}</title>
                <circle r={r} fill={fill} stroke={stroke} strokeWidth={n.isSelf ? 2 : 1.5} />
                <text
                  textAnchor="middle"
                  dy="-4"
                  fontSize={n.isSelf ? 10 : 9}
                  fontWeight={n.isSelf ? 700 : 400}
                  fill="#e5e7eb"
                >
                  {n.label}
                </text>
                <text
                  textAnchor="middle"
                  dy="8"
                  fontSize={8}
                  fill="#9ca3af"
                >
                  {n.sublabel}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="mt-3 flex gap-4 text-xs text-neutral-500">
        <span>Total nodes: {tree.peers.length + 1}</span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#1a3a2a', border: '1.5px solid #22c55e' }} />
          Parent
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2a1a3a', border: '1.5px solid #a855f7' }} />
          Child
        </span>
        <span>Scroll to zoom · drag to pan</span>
      </div>
    </div>
  )
}
