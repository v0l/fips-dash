import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

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

interface TreeData {
  root?: string | null
  is_root: boolean
  depth?: number | null
  peer_tree_count: number
  peers: TreePeer[]
  stats: TreeStats
}

const LEVEL_Y_SPACING = 120
const NODE_X_SPACING = 180
const SELF_NODE_ID = '__self__'

function buildNodesAndEdges(tree: TreeData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Group peers by depth
  const peersByDepth = new Map<number, TreePeer[]>()
  for (const peer of tree.peers) {
    const d = peer.depth ?? 0
    if (!peersByDepth.has(d)) peersByDepth.set(d, [])
    peersByDepth.get(d)!.push(peer)
  }

  // Self node sits at the top (y = 0), depth = -1 conceptually
  const selfY = 0
  nodes.push({
    id: SELF_NODE_ID,
    type: 'default',
    position: { x: 0, y: selfY },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: {
      label: tree.is_root ? 'Self (Root)' : 'Self',
    },
    style: {
      background: tree.is_root ? '#854d0e' : '#1e3a5f',
      color: '#f9fafb',
      border: tree.is_root ? '2px solid #d97706' : '2px solid #3b82f6',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 700,
      padding: '6px 12px',
    },
  })

  // Sort depth levels and lay out peer nodes
  const sortedDepths = Array.from(peersByDepth.keys()).sort((a, b) => a - b)

  for (const depth of sortedDepths) {
    const peersAtDepth = peersByDepth.get(depth)!
    const totalWidth = (peersAtDepth.length - 1) * NODE_X_SPACING
    const startX = -totalWidth / 2
    const y = (depth + 1) * LEVEL_Y_SPACING

    for (let i = 0; i < peersAtDepth.length; i++) {
      const peer = peersAtDepth[i]
      const id = peer.npub || peer.display_name || `peer-d${depth}-${i}`
      const x = startX + i * NODE_X_SPACING

      const label = peer.display_name || `d${depth} peer`
      const sublabel = peer.npub
        ? `${peer.npub.slice(0, 12)}…`
        : `depth ${depth}`

      nodes.push({
        id,
        type: 'default',
        position: { x, y },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: `${label}\n${sublabel}` },
        style: {
          background: '#1f2937',
          color: '#e5e7eb',
          border: '1.5px solid #4b5563',
          borderRadius: 8,
          fontSize: 11,
          padding: '4px 10px',
          whiteSpace: 'pre-line' as const,
          textAlign: 'center' as const,
        },
      })

      // Connect to parent: if there are peers at depth-1 connect to them,
      // otherwise connect directly to Self (handles sparse depth levels)
      const parentPeers = peersByDepth.get(depth - 1) ?? []
      if (parentPeers.length > 0) {
        const parentIndex = Math.min(i, parentPeers.length - 1)
        const parentPeer = parentPeers[parentIndex]
        const parentId =
          parentPeer.npub ||
          parentPeer.display_name ||
          `peer-d${depth - 1}-${parentIndex}`
        edges.push({
          id: `e-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          style: { stroke: '#6b7280', strokeWidth: 2 },
          animated: false,
        })
      } else {
        // No peers at depth-1: connect directly to Self
        edges.push({
          id: `e-${SELF_NODE_ID}-${id}`,
          source: SELF_NODE_ID,
          target: id,
          type: 'smoothstep',
          style: { stroke: '#6b7280', strokeWidth: 2 },
          animated: false,
        })
      }
    }
  }

  return { nodes, edges }
}

export function TreeGraph({ tree }: { tree: TreeData }) {
  const { nodes, edges } = useMemo(() => buildNodesAndEdges(tree), [tree])

  // Derive a reasonable height based on depth levels present
  const maxDepth = tree.peers.reduce((m, p) => Math.max(m, p.depth ?? 0), 0)
  const graphHeight = (maxDepth + 2) * LEVEL_Y_SPACING + 80

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

      <div
        className="rounded-md border border-neutral-800 w-full relative"
        style={{ height: graphHeight }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          colorMode="dark"
        >
          <Background color="#333" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="mt-3 text-xs text-neutral-500 flex items-center gap-3">
        <span>Nodes represent peers in the spanning tree. Lines show parent-child relationships.</span>
        <span>Total: {tree.peers.length + 1}</span>
      </div>
    </div>
  )
}
