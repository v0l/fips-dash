import { useEffect, useMemo, useRef } from 'react'
import { hierarchy, tree as d3tree } from 'd3-hierarchy'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'

interface TreePeer {
  display_name?: string | null
  npub?: string | null
  depth?: number | null
  distance_to_us?: number | null
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
const RADIUS_STEP = 140

interface HNode {
  id: string
  peer?: TreePeer
  children: HNode[]
}

function buildHierarchy(tree: TreeData): HNode {
  const peersByDistance = new Map<number, TreePeer[]>()
  for (const peer of tree.peers) {
    const d = peer.distance_to_us ?? 1
    if (!peersByDistance.has(d)) peersByDistance.set(d, [])
    peersByDistance.get(d)!.push(peer)
  }

  const sortedDistances = Array.from(peersByDistance.keys()).sort((a, b) => a - b)
  const nodeById = new Map<string, HNode>()
  const root: HNode = { id: SELF_NODE_ID, children: [] }
  nodeById.set(SELF_NODE_ID, root)

  for (const distance of sortedDistances) {
    const peers = peersByDistance.get(distance)!
    const parentPeers = peersByDistance.get(distance - 1) ?? []

    peers.forEach((peer, i) => {
      const id = peer.npub || peer.display_name || `peer-dist${distance}-${i}`
      const node: HNode = { id, peer, children: [] }
      nodeById.set(id, node)

      let parentNode: HNode
      if (parentPeers.length > 0) {
        const pi = Math.min(i, parentPeers.length - 1)
        const pp = parentPeers[pi]
        const parentId = pp.npub || pp.display_name || `peer-dist${distance - 1}-${pi}`
        parentNode = nodeById.get(parentId) ?? root
      } else {
        parentNode = root
      }
      parentNode.children.push(node)
    })
  }

  return root
}

export function TreeGraph({ tree }: { tree: TreeData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)

  const { links, nodes, size } = useMemo(() => {
    const maxDistance = tree.peers.reduce((m, p) => Math.max(m, p.distance_to_us ?? 1), 1)
    const radius = maxDistance * RADIUS_STEP

    const root = hierarchy(buildHierarchy(tree), d => d.children)
    const layout = d3tree<HNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)
    layout(root)

    const polar2cart = (angle: number, r: number) => ({
      x: r * Math.cos(angle - Math.PI / 2),
      y: r * Math.sin(angle - Math.PI / 2),
    })

    type LayoutNode = typeof root & { x: number; y: number }

    const nodes = root.descendants().map(n => {
      const ln = n as LayoutNode
      return { ...polar2cart(ln.x, ln.y), data: ln.data }
    })

    const links = root.links().map(l => {
      const s = l.source as LayoutNode
      const t = l.target as LayoutNode
      const sp = polar2cart(s.x, s.y)
      const tp = polar2cart(t.x, t.y)
      return { sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y, key: `${l.source.data.id}-${l.target.data.id}` }
    })

    return { links, nodes, size: radius }
  }, [tree])

  const pad = 60
  const dim = size + pad

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
    // fit initial view to the content
    const { width, height } = svgRef.current.getBoundingClientRect()
    const scale = Math.min(width, height) / (dim * 2) * 0.85
    svg.call(zoom.transform, zoomIdentity.translate(width / 2, height / 2).scale(scale))
    return () => { svg.on('.zoom', null) }
  }, [dim])

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
        {links.map(l => (
          <line
            key={l.key}
            x1={l.sx} y1={l.sy}
            x2={l.tx} y2={l.ty}
            stroke="#4b5563"
            strokeWidth={1.5}
          />
        ))}

        {/* nodes */}
        {nodes.map(n => {
          const isSelf = n.data.id === SELF_NODE_ID
          const label = isSelf
            ? (tree.is_root ? 'Self (Root)' : 'Self')
            : (n.data.peer?.display_name || 'peer')
          const sublabel = isSelf
            ? `depth ${tree.depth ?? '?'}`
            : `d${n.data.peer?.depth ?? '?'} hop${n.data.peer?.distance_to_us ?? '?'}`

          const r = isSelf ? 28 : 22
          const fill = isSelf
            ? (tree.is_root ? '#92400e' : '#1e3a5f')
            : '#1f2937'
          const stroke = isSelf
            ? (tree.is_root ? '#d97706' : '#3b82f6')
            : '#6b7280'

          return (
            <g key={n.data.id} transform={`translate(${n.x},${n.y})`}>
              <title>{n.data.peer?.npub ?? n.data.id}</title>
              <circle r={r} fill={fill} stroke={stroke} strokeWidth={isSelf ? 2 : 1.5} />
              <text
                textAnchor="middle"
                dy="-4"
                fontSize={isSelf ? 10 : 9}
                fontWeight={isSelf ? 700 : 400}
                fill="#e5e7eb"
              >
                {label}
              </text>
              <text
                textAnchor="middle"
                dy="8"
                fontSize={8}
                fill="#9ca3af"
              >
                {sublabel}
              </text>
            </g>
          )
        })}
        </g>
      </svg>

      <div className="mt-3 text-xs text-neutral-500">
        Nodes represent peers · hover for npub · Total: {tree.peers.length + 1}
      </div>
    </div>
  )
}
