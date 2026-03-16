import { useEffect, useMemo, useRef } from 'react'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'

interface TreePeer {
  display_name?: string | null
  npub?: string | null
  depth?: number | null
  distance_to_us?: number | null
  coords?: string[]
}

export interface DirectPeer {
  display_name?: string | null
  npub?: string | null
  relationship: 'parent' | 'child' | 'peer'
  tree_depth?: number | null
  srtt_ms?: number | null
  lqi?: number | null
  loss_rate?: number | null
  goodput_bps?: number | null
}

interface TreeStats {
  accepted: number
  parent_switches: number
  parent_losses: number
  loop_detected: number
  flap_dampened: number
  ancestry_changed: number
  addr_mismatch: number
  decode_error: number
  rate_limited: number
  received: number
  sent: number
  send_failed: number
  sig_failed: number
  stale: number
  unknown_peer: number
}

export interface TreeData {
  root?: string | null
  is_root: boolean
  depth?: number | null
  peer_tree_count: number
  my_coords?: string[]
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
  coords: string[]
  absDepth: number  // absolute depth in the global tree
  isSelf: boolean
  isPhantom: boolean
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
  srtt_ms?: number | null
  lqi?: number | null
  loss_rate?: number | null
  goodput_bps?: number | null
}

const NODE_RADIUS_SELF = 28
const NODE_RADIUS = 20
const NODE_RADIUS_PHANTOM = 14
const DEPTH_STEP_Y = 100   // vertical pixels per tree depth level
const SIBLING_STEP_X = 120 // horizontal pixels between siblings at same depth

// Truncate a hex coord to a short display form
function shortCoord(coord: string): string {
  return coord.slice(0, 8) + '...'
}

function buildLayout(tree: TreeData, directPeers: DirectPeer[]): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const selfDepth = tree.depth ?? 0
  // Coords from fipsctl are ordered [self, parent, grandparent, ..., root].
  // Reverse them so they go [root, ..., grandparent, parent, self] for tree layout.
  const selfCoords = tree.my_coords ? [...tree.my_coords].reverse() : []

  // Build a map from npub/display_name to DirectPeer for relationship + metrics lookup
  const directByKey = new Map<string, DirectPeer>()
  for (const p of directPeers) {
    if (p.npub) directByKey.set(p.npub, p)
    if (p.display_name) directByKey.set(p.display_name, p)
  }

  // Helper: look up direct peer metrics for a node id
  function getDirectPeerMetrics(nodeId: string): DirectPeer | undefined {
    return directByKey.get(nodeId)
  }

  interface RawNode {
    id: string
    label: string
    npub?: string | null
    absDepth: number
    isSelf: boolean
    isPhantom: boolean
    relationship?: DirectPeer['relationship']
    coords: string[]
  }

  // Map from coords key → RawNode for deduplication
  const coordsKeyToNode = new Map<string, RawNode>()

  // Register a known node (Self or peer)
  function registerNode(node: RawNode) {
    if (node.coords.length > 0) {
      const key = node.coords.join('/')
      const existing = coordsKeyToNode.get(key)
      // Real nodes replace phantoms
      if (!existing || existing.isPhantom) {
        coordsKeyToNode.set(key, node)
      }
    }
    return node
  }

  // Self
  registerNode({
    id: SELF_NODE_ID,
    label: tree.is_root ? 'Self (Root)' : 'Self',
    npub: null,
    absDepth: selfDepth,
    isSelf: true,
    isPhantom: false,
    relationship: undefined,
    coords: selfCoords,
  })

  // Peers from tree
  tree.peers.forEach((peer, i) => {
    const id = peer.npub || peer.display_name || `peer-${i}`
    const dp = directByKey.get(peer.npub ?? '') ?? directByKey.get(peer.display_name ?? '')
    // Reverse peer coords from [self..root] to [root..self]
    const peerCoords = peer.coords ? [...peer.coords].reverse() : []
    registerNode({
      id,
      label: peer.display_name || id.slice(0, 8),
      npub: peer.npub,
      absDepth: peer.depth ?? selfDepth,
      isSelf: false,
      isPhantom: false,
      relationship: dp?.relationship,
      coords: peerCoords,
    })
  })

  // Reconstruct the full tree: for every known coords array, create phantom
  // nodes for every intermediate prefix that doesn't already have a real node.
  // Collect all (already reversed) coords arrays from registered nodes.
  const allCoords: string[][] = []
  for (const n of coordsKeyToNode.values()) {
    if (n.coords.length > 0) allCoords.push(n.coords)
  }

  for (const coords of allCoords) {
    // Create phantom for every prefix (depth 1 through coords.length - 1)
    for (let len = 1; len < coords.length; len++) {
      const prefix = coords.slice(0, len)
      const key = prefix.join('/')
      if (!coordsKeyToNode.has(key)) {
        const addr = prefix[prefix.length - 1]
        coordsKeyToNode.set(key, {
          id: `phantom-${key}`,
          label: shortCoord(addr),
          npub: null,
          absDepth: len - 1, // depth = coords length - 1 (root is depth 0 with 1 coord)
          isSelf: false,
          isPhantom: true,
          relationship: undefined,
          coords: prefix,
        })
      }
    }
  }

  const rawNodes = Array.from(coordsKeyToNode.values())

  // Also add any peers without coords as unconnected nodes
  tree.peers.forEach((peer, i) => {
    const peerCoords = peer.coords ?? []
    if (peerCoords.length === 0) {
      // No coords at all — add as disconnected node
      const id = peer.npub || peer.display_name || `peer-${i}`
      const dp = directByKey.get(peer.npub ?? '') ?? directByKey.get(peer.display_name ?? '')
      // Only add if not already present
      if (!rawNodes.find(n => n.id === id)) {
        rawNodes.push({
          id,
          label: peer.display_name || id.slice(0, 8),
          npub: peer.npub,
          absDepth: peer.depth ?? selfDepth,
          isSelf: false,
          isPhantom: false,
          relationship: dp?.relationship,
          coords: [],
        })
      }
    }
  })

  // Build coordsKey → id map for edge resolution
  const coordsToId = new Map<string, string>()
  for (const n of rawNodes) {
    if (n.coords.length > 0) {
      coordsToId.set(n.coords.join('/'), n.id)
    }
  }

  // Group nodes by absolute depth
  const byDepth = new Map<number, RawNode[]>()
  for (const n of rawNodes) {
    if (!byDepth.has(n.absDepth)) byDepth.set(n.absDepth, [])
    byDepth.get(n.absDepth)!.push(n)
  }

  const depthLevels = Array.from(byDepth.keys()).sort((a, b) => a - b)
  const minDepth = depthLevels[0]

  // Assign x positions
  const positionedMap = new Map<string, LayoutNode>()

  for (const d of depthLevels) {
    const siblings = byDepth.get(d)!
    const count = siblings.length
    siblings.forEach((n, i) => {
      const xOffset = (i - (count - 1) / 2) * SIBLING_STEP_X
      const yOffset = (d - minDepth) * DEPTH_STEP_Y
      const lastCoord = n.coords.length > 0 ? n.coords[n.coords.length - 1] : null
      positionedMap.set(n.id, {
        ...n,
        sublabel: lastCoord ? shortCoord(lastCoord) : `depth ${d}`,
        x: xOffset,
        y: yOffset,
      })
    })
  }

  const nodes = Array.from(positionedMap.values())

  // Build edges using coords
  const edges: LayoutEdge[] = []
  const edgeSet = new Set<string>()

  for (const n of rawNodes) {
    if (n.coords.length > 1) {
      const parentCoordsKey = n.coords.slice(0, -1).join('/')
      const parentId = coordsToId.get(parentCoordsKey)
      if (parentId) {
        const childPos = positionedMap.get(n.id)
        const parentPos = positionedMap.get(parentId)
        if (childPos && parentPos) {
          const key = `${parentId}→${n.id}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            // Annotate edges touching Self with direct peer metrics
            const dp = (n.isSelf ? getDirectPeerMetrics(parentId) : undefined)
              ?? (parentId === SELF_NODE_ID ? getDirectPeerMetrics(n.id) : undefined)
            edges.push({
              key, x1: parentPos.x, y1: parentPos.y, x2: childPos.x, y2: childPos.y,
              srtt_ms: dp?.srtt_ms, lqi: dp?.lqi, loss_rate: dp?.loss_rate, goodput_bps: dp?.goodput_bps,
            })
          }
        }
      }
    }
  }

  // Fallback for nodes without coords
  const connectedNodes = new Set<string>()
  for (const e of edges) {
    const [, childId] = e.key.split('→')
    connectedNodes.add(childId)
  }

  for (const d of depthLevels) {
    const currentLevel = byDepth.get(d)!
    const parentLevel = byDepth.get(d - 1)
    if (!parentLevel || parentLevel.length === 0) continue

    for (let i = 0; i < currentLevel.length; i++) {
      const child = currentLevel[i]
      if (connectedNodes.has(child.id)) continue

      const parentNode = parentLevel[Math.min(i, parentLevel.length - 1)]

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
      <div className="grid grid-cols-3 gap-2 mb-2 md:grid-cols-5 lg:grid-cols-8">
        {([
          ['Received', tree.stats.received],
          ['Sent', tree.stats.sent],
          ['Accepted', tree.stats.accepted],
          ['Parent Switches', tree.stats.parent_switches],
          ['Parent Losses', tree.stats.parent_losses],
          ['Loops', tree.stats.loop_detected],
          ['Flap Dampened', tree.stats.flap_dampened],
          ['Ancestry Changed', tree.stats.ancestry_changed],
          ['Addr Mismatch', tree.stats.addr_mismatch],
          ['Decode Error', tree.stats.decode_error],
          ['Rate Limited', tree.stats.rate_limited],
          ['Send Failed', tree.stats.send_failed],
          ['Sig Failed', tree.stats.sig_failed],
          ['Stale', tree.stats.stale],
          ['Unknown Peer', tree.stats.unknown_peer],
        ] as [string, number][]).map(([label, value]) => (
          <div key={label} className="rounded bg-neutral-950 px-2 py-1.5">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className="text-lg font-semibold text-white">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full bg-neutral-950 rounded-md border border-neutral-900 cursor-grab active:cursor-grabbing"
        style={{ height: '500px' }}
      >
        <g ref={gRef}>
          {/* edges */}
          {edges.map(e => {
            const mx = (e.x1 + e.x2) / 2
            const my = (e.y1 + e.y2) / 2
            const hasMetrics = e.srtt_ms != null || e.loss_rate != null
            const label = hasMetrics
              ? [
                  e.srtt_ms != null ? `${Math.round(e.srtt_ms)}ms` : null,
                  e.loss_rate != null ? `${(e.loss_rate * 100).toFixed(1)}% loss` : null,
                ].filter(Boolean).join(' · ')
              : null
            return (
              <g key={e.key}>
                <line
                  x1={e.x1} y1={e.y1}
                  x2={e.x2} y2={e.y2}
                  stroke={hasMetrics ? '#6b7280' : '#4b5563'}
                  strokeWidth={hasMetrics ? 2 : 1.5}
                />
                {label && (
                  <>
                    <rect
                      x={mx - 40} y={my - 8}
                      width={80} height={16}
                      rx={3}
                      fill="#0a0a0a"
                      fillOpacity={0.85}
                    />
                    <text
                      x={mx} y={my + 3}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#9ca3af"
                    >
                      {label}
                    </text>
                  </>
                )}
              </g>
            )
          })}

          {/* nodes */}
          {nodes.map(n => {
            const r = n.isSelf ? NODE_RADIUS_SELF : n.isPhantom ? NODE_RADIUS_PHANTOM : NODE_RADIUS

            let fill: string
            let stroke: string
            if (n.isSelf) {
              fill = tree.is_root ? '#92400e' : '#164e63'
              stroke = tree.is_root ? '#d97706' : '#06b6d4'
            } else if (n.isPhantom) {
              fill = '#111827'
              stroke = '#374151'
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
                <title>{[n.npub ?? n.id, n.coords.length > 0 ? `coords: ${n.coords.join(' → ')}` : ''].filter(Boolean).join('\n')}</title>
                <circle r={r} fill={fill} stroke={stroke} strokeWidth={n.isSelf ? 2 : 1.5} strokeDasharray={n.isPhantom ? '3 2' : undefined} />
                <text
                  textAnchor="middle"
                  dy="-4"
                  fontSize={n.isSelf ? 10 : n.isPhantom ? 7 : 9}
                  fontWeight={n.isSelf ? 700 : 400}
                  fill={n.isPhantom ? '#6b7280' : '#e5e7eb'}
                >
                  {n.label}
                </text>
                <text
                  textAnchor="middle"
                  dy="8"
                  fontSize={n.isPhantom ? 6 : 8}
                  fill={n.isPhantom ? '#4b5563' : '#9ca3af'}
                >
                  {n.sublabel}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span>Total nodes: {nodes.length}</span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#164e63', border: '2px solid #06b6d4' }} />
          Self
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#1a3a2a', border: '1.5px solid #22c55e' }} />
          Parent
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2a1a3a', border: '1.5px solid #a855f7' }} />
          Child
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#111827', border: '1.5px dashed #374151' }} />
          Inferred
        </span>
        <span>Scroll to zoom · drag to pan</span>
      </div>
    </div>
  )
}
