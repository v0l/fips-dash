import { useEffect, useState } from 'react'

interface StatusData {
  version?: string
  npub?: string | null
  state?: string
  peer_count?: number
  session_count?: number
  link_count?: number
  transport_count?: number
  tun_state?: string
  effective_ipv6_mtu?: number
  uptime_secs?: number
  estimated_mesh_size?: number
  forwarding?: {
    decode_error_packets: number
    delivered_packets: number
    forwarded_packets: number
    drop_no_route_packets: number
    drop_mtu_exceeded_packets: number
  }
}

interface Peer {
  display_name?: string | null
  npub?: string | null
  connectivity?: string | null
  authenticated_at_ms?: number | null
  last_seen_ms?: number | null
  relationship: 'parent' | 'child' | 'peer'
  direction?: string
  transport_type?: string | null
  tree_depth?: number | null
  srtt_ms?: number | null
  loss_rate?: number | null
  goodput_bps?: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

interface Link {
  link_id?: number | null
  transport_id?: number | null
  direction?: string | null
  state?: string | null
  created_at_ms?: number | null
  last_recv_ms?: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

interface TreeData {
  root?: string | null
  is_root: boolean
  depth?: number | null
  declaration_sequence?: number | null
  declaration_signed: boolean
  peer_tree_count: number
  peers: Array<{
    display_name?: string | null
    depth?: number | null
    distance_to_us?: number | null
  }>
  stats: {
    accepted: number
    parent_switches: number
    parent_losses: number
    loop_detected: number
    flap_dampened: number
  }
}

interface Session {
  display_name?: string | null
  npub?: string | null
  state?: string | null
  is_initiator: boolean
  last_activity_ms?: number | null
  srtt_ms?: number | null
  loss_rate?: number | null
  goodput_bps?: number | null
  path_mtu?: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

interface Transport {
  transport_id?: number | null
  type?: string | null
  state?: string | null
  mtu?: number | null
  name?: string | null
  local_port?: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
  accepted: number
  accept_errors: number
  connects_started: number
  connects_established: number
  connects_failed: number
  inbound_closed: number
  outbound_closed: number
  rx_dropped_unknown_src: number
  rx_no_peer: number
  discovery_sent: number
  discovery_recv: number
  discovery_ignored_self: number
}

interface InfoResponse {
  status: StatusData
  peers: Peer[]
  links: Link[]
  tree: TreeData
  sessions: Session[]
  transports: Transport[]
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = -1

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatUptime(seconds?: number | null): string {
  if (!seconds) return 'N/A'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

function formatRelativeTime(timestampMs?: number | null): string {
  if (!timestampMs) return 'N/A'

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
  const days = Math.floor(diffSeconds / 86400)
  const hours = Math.floor((diffSeconds % 86400) / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${diffSeconds}s ago`
}

function App() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [tree, setTree] = useState<TreeData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [transports, setTransports] = useState<Transport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/info')
      .then((res) => res.json() as Promise<InfoResponse>)
      .then((info) => {
        setStatus(info.status)
        setPeers(Array.isArray(info.peers) ? info.peers : [])
        setLinks(Array.isArray(info.links) ? info.links : [])
        setTree(info.tree)
        setSessions(Array.isArray(info.sessions) ? info.sessions : [])
        setTransports(Array.isArray(info.transports) ? info.transports : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-center py-8 text-neutral-400">Loading...</div>

  const treePeers = tree?.peers || []
  const publicHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const staticPeerAddresses = transports
    .filter((transport) => transport.type && transport.local_port)
    .map((transport) => [
      '      - transport: ' + transport.type,
      '        addr: "' + publicHost + ':' + transport.local_port + '"',
    ].join('\n'))
    .join('\n')

  const staticPeerExample = [
    'peers:',
    `  - npub: "${status?.npub || 'npub1yourpeerpublickeyhere'}"`,
    `    alias: "${publicHost}"`,
    '    addresses:',
    staticPeerAddresses || `      - transport: udp\n        addr: "${publicHost}:2121"`,
    '    connect_policy: auto_connect',
  ].join('\n')

  return (
    <div className="min-h-screen bg-black pb-12">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-3xl font-bold text-white">FIPS Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1 font-mono">
          {status?.version || 'Unknown'}
        </p>
        {status?.npub && (
          <p className="mt-2 break-all font-mono text-xs text-neutral-400">
            {status.npub}
          </p>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h3 className="text-sm text-neutral-500 mb-1">Uptime</h3>
          <p className="text-2xl font-semibold text-white">
            {formatUptime(status?.uptime_secs)}
          </p>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h3 className="text-sm text-neutral-500 mb-1">Authenticated Peers</h3>
          <p className="text-2xl font-semibold text-white">{status?.peer_count ?? peers.length}</p>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h3 className="text-sm text-neutral-500 mb-1">Active Links</h3>
          <p className="text-2xl font-semibold text-white">{status?.link_count ?? links.length}</p>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h3 className="text-sm text-neutral-500 mb-1">Sessions</h3>
          <p className="text-2xl font-semibold text-white">{status?.session_count ?? sessions.length}</p>
        </div>
      </div>

      {status?.forwarding && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Forwarding</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Delivered</div>
              <div className="text-lg font-semibold text-white">{formatCount(status.forwarding.delivered_packets)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Forwarded</div>
              <div className="text-lg font-semibold text-white">{formatCount(status.forwarding.forwarded_packets)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">No Route</div>
              <div className="text-lg font-semibold text-white">{formatCount(status.forwarding.drop_no_route_packets)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">MTU Exceeded</div>
              <div className="text-lg font-semibold text-white">{formatCount(status.forwarding.drop_mtu_exceeded_packets)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Decode Errors</div>
              <div className="text-lg font-semibold text-white">{formatCount(status.forwarding.decode_error_packets)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tree State */}
      {tree && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Spanning Tree</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><span className="text-neutral-500">Root:</span> {tree.root || 'Unknown'}</div>
            <div><span className="text-neutral-500">Depth:</span> {tree.depth ?? 'N/A'}</div>
            <div><span className="text-neutral-500">Peer Tree Count:</span> {tree.peer_tree_count}</div>
            <div><span className="text-neutral-500">Peers In Tree ({treePeers.length}):</span></div>
            {treePeers.map((peer, i) => (
              <div key={i} className="ml-4 text-neutral-200">{peer.display_name || 'Unnamed peer'}</div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Accepted</div>
              <div className="text-lg font-semibold text-white">{formatCount(tree.stats.accepted)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Parent Switches</div>
              <div className="text-lg font-semibold text-white">{formatCount(tree.stats.parent_switches)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Parent Losses</div>
              <div className="text-lg font-semibold text-white">{formatCount(tree.stats.parent_losses)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Loops</div>
              <div className="text-lg font-semibold text-white">{formatCount(tree.stats.loop_detected)}</div>
            </div>
            <div className="rounded-lg bg-black p-3">
              <div className="text-xs text-neutral-500">Flap Dampened</div>
              <div className="text-lg font-semibold text-white">{formatCount(tree.stats.flap_dampened)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Peers Table */}
      {peers.length > 0 && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Peers</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-2 px-2">Alias</th>
                <th className="py-2 px-2 truncate max-w-xs">NPUB</th>
                <th className="py-2 px-2 text-right">RTT (ms)</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-800/50">
                  <td className="py-2 px-2">{peer.display_name || 'N/A'}</td>
                  <td className="py-2 px-2 truncate max-w-xs font-mono text-neutral-300" title={peer.npub || undefined}>{peer.npub || 'Hidden'}</td>
                  <td className="py-2 px-2 text-right">{peer.srtt_ms ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Links Table */}
      {links.length > 0 && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Links</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-2 px-2">ID</th>
                <th className="py-2 px-2">Direction</th>
                <th className="py-2 px-2">State</th>
                <th className="py-2 px-2 text-right">Last Seen</th>
                <th className="py-2 px-2 text-right">Rx Packets</th>
                <th className="py-2 px-2 text-right">Tx Packets</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-800/50">
                  <td className="py-2 px-2 font-mono text-neutral-400">{link.link_id ?? 'N/A'}</td>
                  <td className="py-2 px-2">{link.direction || 'N/A'}</td>
                  <td className="py-2 px-2">{link.state || 'N/A'}</td>
                  <td className="py-2 px-2 text-right">{formatRelativeTime(link.last_recv_ms)}</td>
                  <td className="py-2 px-2 text-right">{formatCount(link.packets_recv)}</td>
                  <td className="py-2 px-2 text-right">{formatCount(link.packets_sent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sessions Table */}
      {sessions.length > 0 && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Sessions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-2 px-2">ID</th>
                <th className="py-2 px-2 truncate max-w-xs">Peer</th>
                <th className="py-2 px-2">State</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-800/50">
                  <td className="py-2 px-2 font-mono text-neutral-400">{session.display_name || 'Unnamed'}</td>
                  <td className="py-2 px-2 truncate max-w-xs font-mono text-neutral-300" title={session.npub || undefined}>{session.npub || 'Hidden'}</td>
                  <td className="py-2 px-2">{session.state || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transports.length > 0 && (
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Transports</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-2 px-2">ID</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">State</th>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2 text-right">MTU</th>
                <th className="py-2 px-2 text-right">Tx Packets</th>
                <th className="py-2 px-2 text-right">Rx Packets</th>
                <th className="py-2 px-2 text-right">Tx Bytes</th>
                <th className="py-2 px-2 text-right">Rx Bytes</th>
              </tr>
            </thead>
            <tbody>
              {transports.map((transport, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-800/50">
                  <td className="py-2 px-2 font-mono text-neutral-400">{transport.transport_id ?? 'N/A'}</td>
                  <td className="py-2 px-2">{transport.type || 'N/A'}</td>
                  <td className="py-2 px-2">{transport.state || 'N/A'}</td>
                  <td className="py-2 px-2">{transport.name || 'N/A'}</td>
                  <td className="py-2 px-2 text-right">{transport.mtu ?? 'N/A'}</td>
                  <td className="py-2 px-2 text-right">{formatCount(transport.packets_sent)}</td>
                  <td className="py-2 px-2 text-right">{formatCount(transport.packets_recv)}</td>
                  <td className="py-2 px-2 text-right">{formatBytes(transport.bytes_sent)}</td>
                  <td className="py-2 px-2 text-right">{formatBytes(transport.bytes_recv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-neutral-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Static Peer YAML</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Example config for adding this node as a static peer using the current hostname.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-black p-4 text-sm text-neutral-200">
          <code>{staticPeerExample}</code>
        </pre>
      </div>

      {peers.length === 0 && links.length === 0 && sessions.length === 0 && transports.length === 0 && !tree && (
        <p className="text-neutral-500 text-center py-8">No FIPS data available</p>
      )}
      </div>
    </div>
  )
}

export default App
