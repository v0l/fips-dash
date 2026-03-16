import { useEffect, useState } from 'react'

import { TreeGraph } from './TreeGraph'

interface StatusData {
  version?: string
  npub?: string | null
  state?: string
  peer_count?: number
  session_count?: number
  link_count?: number
  transport_count?: number
  connection_count?: number
  tun_state?: string
  tun_name?: string
  effective_ipv6_mtu?: number
  ipv6_addr?: string | null
  node_addr?: string | null
  is_leaf_only?: boolean
  uptime_secs?: number
  estimated_mesh_size?: number
  forwarding?: {
    delivered_packets: number
    delivered_bytes: number
    forwarded_packets: number
    forwarded_bytes: number
    originated_packets: number
    originated_bytes: number
    received_packets: number
    received_bytes: number
    drop_no_route_packets: number
    drop_no_route_bytes: number
    drop_mtu_exceeded_packets: number
    drop_mtu_exceeded_bytes: number
    drop_send_error_packets: number
    drop_send_error_bytes: number
    decode_error_packets: number
    decode_error_bytes: number
    ttl_exhausted_packets: number
    ttl_exhausted_bytes: number
  }
}

interface Peer {
  display_name?: string | null
  npub?: string | null
  connectivity?: string | null
  authenticated_at_ms?: number | null
  last_seen_ms?: number | null
  relationship: 'parent' | 'child' | 'peer'
  direction?: string | null
  transport_type?: string | null
  ipv6_addr?: string | null
  node_addr?: string | null
  link_id?: number | null
  tree_depth?: number | null
  filter_sequence?: number | null
  has_bloom_filter?: boolean
  has_tree_position?: boolean
  srtt_ms?: number | null
  loss_rate?: number | null
  goodput_bps?: number | null
  etx?: number | null
  smoothed_etx?: number | null
  smoothed_loss?: number | null
  lqi?: number | null
  delivery_ratio_forward?: number | null
  delivery_ratio_reverse?: number | null
  mmp_mode?: string | null
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
  my_coords?: string[]
  parent?: string | null
  parent_display_name?: string | null
  peers: Array<{
    display_name?: string | null
    npub?: string | null
    depth?: number | null
    distance_to_us?: number | null
    coords?: string[]
  }>
  stats: {
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
  etx?: number | null
  smoothed_etx?: number | null
  smoothed_loss?: number | null
  sqi?: number | null
  delivery_ratio_forward?: number | null
  delivery_ratio_reverse?: number | null
  mmp_mode?: string | null
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
  send_errors: number
  recv_errors: number
  mtu_exceeded: number
  kernel_drops: number
  connect_refused: number
  connect_timeouts: number
  connections_accepted: number
  connections_established: number
  connections_rejected: number
  beacons_sent: number
  beacons_recv: number
  frames_sent: number
  frames_recv: number
  frames_too_long: number
  frames_too_short: number
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

function formatBps(value: number): string {
  if (value < 1000) return `${value.toFixed(0)} bps`
  if (value < 1000000) return `${(value / 1000).toFixed(1)} Kbps`
  return `${(value / 1000000).toFixed(1)} Mbps`
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

function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}

function formatFloat(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A'
  return value.toFixed(decimals)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  if (!navigator.clipboard) return null
  function handleClick() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleClick}
      title="Copy npub"
      className="ml-1 rounded px-1 py-0.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-neutral-950 px-2 py-1.5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  )
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      {/* Header */}
      <div className="border-b border-neutral-900 pb-2">
        <h1 className="text-3xl font-bold text-white">FIPS Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1 font-mono">
          {status?.version || 'Unknown'}
        </p>
        {status?.npub && (
          <p className="mt-2 flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span className="break-all">{status.npub}</span>
            <CopyButton text={status.npub} />
          </p>
        )}
        {status?.ipv6_addr && (
          <p className="mt-1 flex items-center gap-2 font-mono text-xs text-neutral-500">
            <span>{status.ipv6_addr}</span>
            <CopyButton text={status.ipv6_addr} />
          </p>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Uptime</h3>
          <p className="text-2xl font-semibold text-white">
            {formatUptime(status?.uptime_secs)}
          </p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Authenticated Peers</h3>
          <p className="text-2xl font-semibold text-white">{status?.peer_count ?? peers.length}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Active Links</h3>
          <p className="text-2xl font-semibold text-white">{status?.link_count ?? links.length}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Sessions</h3>
          <p className="text-2xl font-semibold text-white">{status?.session_count ?? sessions.length}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Est. Mesh Size</h3>
          <p className="text-2xl font-semibold text-white">{status?.estimated_mesh_size != null ? formatCount(status.estimated_mesh_size) : 'N/A'}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">TUN State</h3>
          <p className="text-2xl font-semibold text-white">{status?.tun_state || 'N/A'}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">IPv6 MTU</h3>
          <p className="text-2xl font-semibold text-white">{status?.effective_ipv6_mtu != null ? `${status.effective_ipv6_mtu}` : 'N/A'}</p>
        </div>
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h3 className="text-sm text-neutral-500 mb-1">Tree Depth</h3>
          <p className="text-2xl font-semibold text-white">{tree?.depth != null ? tree.depth : 'N/A'}</p>
        </div>
      </div>

      {/* Forwarding Stats */}
      {status?.forwarding && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Forwarding</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatChip label="Originated" value={`${formatCount(status.forwarding.originated_packets)} / ${formatBytes(status.forwarding.originated_bytes)}`} />
            <StatChip label="Received" value={`${formatCount(status.forwarding.received_packets)} / ${formatBytes(status.forwarding.received_bytes)}`} />
            <StatChip label="Delivered" value={`${formatCount(status.forwarding.delivered_packets)} / ${formatBytes(status.forwarding.delivered_bytes)}`} />
            <StatChip label="Forwarded" value={`${formatCount(status.forwarding.forwarded_packets)} / ${formatBytes(status.forwarding.forwarded_bytes)}`} />
            <StatChip label="No Route" value={`${formatCount(status.forwarding.drop_no_route_packets)} / ${formatBytes(status.forwarding.drop_no_route_bytes)}`} />
            <StatChip label="MTU Exceeded" value={`${formatCount(status.forwarding.drop_mtu_exceeded_packets)} / ${formatBytes(status.forwarding.drop_mtu_exceeded_bytes)}`} />
            <StatChip label="Send Errors" value={`${formatCount(status.forwarding.drop_send_error_packets)} / ${formatBytes(status.forwarding.drop_send_error_bytes)}`} />
            <StatChip label="TTL Exhausted" value={`${formatCount(status.forwarding.ttl_exhausted_packets)} / ${formatBytes(status.forwarding.ttl_exhausted_bytes)}`} />
            <StatChip label="Decode Errors" value={`${formatCount(status.forwarding.decode_error_packets)} / ${formatBytes(status.forwarding.decode_error_bytes)}`} />
          </div>
        </div>
      )}

      {/* Tree Graph */}
      {tree && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Spanning Tree</h2>
          {tree.parent_display_name && (
            <p className="text-sm text-neutral-400 mb-4">
              Parent: <span className="text-neutral-200">{tree.parent_display_name}</span>
              {tree.is_root && <span className="ml-2 text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">Root</span>}
            </p>
          )}
          <TreeGraph tree={tree} peers={peers} />
        </div>
      )}

      {/* Peers Table */}
      {peers.length > 0 && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Peers</h2>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-1 px-1.5">Alias</th>
                <th className="py-1 px-1.5 truncate max-w-xs">NPUB</th>
                <th className="py-1 px-1.5">Role</th>
                <th className="py-1 px-1.5 text-right">RTT (ms)</th>
                <th className="py-1 px-1.5 text-right">Loss</th>
                <th className="py-1 px-1.5 text-right">ETX</th>
                <th className="py-1 px-1.5 text-right">LQI</th>
                <th className="py-1 px-1.5 text-right">Goodput</th>
                <th className="py-1 px-1.5 text-right">Tx</th>
                <th className="py-1 px-1.5 text-right">Rx</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-900/50">
                  <td className="py-1 px-1.5">
                    <div>{peer.display_name || 'N/A'}</div>
                    <div className="text-xs text-neutral-400 font-mono">{peer.connectivity ?? 'unknown'}</div>
                  </td>
                  <td className="py-1 px-1.5 max-w-xs font-mono text-neutral-300">
                    <div className="flex items-center gap-1">
                      <span className="truncate" title={peer.npub || undefined}>{peer.npub || 'Hidden'}</span>
                      {peer.npub && <CopyButton text={peer.npub} />}
                    </div>
                    {peer.ipv6_addr && <div className="text-xs text-neutral-500 truncate" title={peer.ipv6_addr}>{peer.ipv6_addr}</div>}
                  </td>
                  <td className="py-1 px-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      peer.relationship === 'parent' ? 'bg-green-900/50 text-green-400' :
                      peer.relationship === 'child' ? 'bg-purple-900/50 text-purple-400' :
                      'bg-neutral-700 text-neutral-400'
                    }`}>
                      {peer.relationship}
                    </span>
                  </td>
                  <td className="py-1 px-1.5 text-right">{peer.srtt_ms != null ? Math.round(peer.srtt_ms) : 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">{formatPercent(peer.loss_rate)}</td>
                  <td className="py-1 px-1.5 text-right">{formatFloat(peer.etx)}</td>
                  <td className="py-1 px-1.5 text-right">{formatFloat(peer.lqi)}</td>
                  <td className="py-1 px-1.5 text-right">{peer.goodput_bps != null ? formatBps(peer.goodput_bps) : 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">
                    <div>{formatCount(peer.packets_sent)} pkts</div>
                    <div className="text-xs text-neutral-500">{formatBytes(peer.bytes_sent)}</div>
                  </td>
                  <td className="py-1 px-1.5 text-right">
                    <div>{formatCount(peer.packets_recv)} pkts</div>
                    <div className="text-xs text-neutral-500">{formatBytes(peer.bytes_recv)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Links Table */}
      {links.length > 0 && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Links</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-1 px-1.5">ID</th>
                <th className="py-1 px-1.5">Direction</th>
                <th className="py-1 px-1.5">State</th>
                <th className="py-1 px-1.5 text-right">Last Seen</th>
                <th className="py-1 px-1.5 text-right">Rx Packets</th>
                <th className="py-1 px-1.5 text-right">Tx Packets</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-900/50">
                  <td className="py-1 px-1.5 font-mono text-neutral-400">{link.link_id ?? 'N/A'}</td>
                  <td className="py-1 px-1.5">{link.direction || 'N/A'}</td>
                  <td className="py-1 px-1.5">{link.state || 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">{formatRelativeTime(link.last_recv_ms)}</td>
                  <td className="py-1 px-1.5 text-right">{formatCount(link.packets_recv)}</td>
                  <td className="py-1 px-1.5 text-right">{formatCount(link.packets_sent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sessions Table */}
      {sessions.length > 0 && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Sessions</h2>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-500">
                <th className="py-1 px-1.5">Name</th>
                <th className="py-1 px-1.5 truncate max-w-xs">Peer</th>
                <th className="py-1 px-1.5">State</th>
                <th className="py-1 px-1.5 text-right">RTT (ms)</th>
                <th className="py-1 px-1.5 text-right">Loss</th>
                <th className="py-1 px-1.5 text-right">Path MTU</th>
                <th className="py-1 px-1.5 text-right">Goodput</th>
                <th className="py-1 px-1.5 text-right">Tx</th>
                <th className="py-1 px-1.5 text-right">Rx</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => (
                <tr key={i} className="border-b border-neutral-700 hover:bg-neutral-900/50">
                  <td className="py-1 px-1.5 font-mono text-neutral-400">
                    <div>{session.display_name || 'Unnamed'}</div>
                    {session.is_initiator && <div className="text-xs text-neutral-500">initiator</div>}
                  </td>
                  <td className="py-1 px-1.5 max-w-xs font-mono text-neutral-300">
                    <div className="flex items-center gap-1">
                      <span className="truncate" title={session.npub || undefined}>{session.npub || 'Hidden'}</span>
                      {session.npub && <CopyButton text={session.npub} />}
                    </div>
                  </td>
                  <td className="py-1 px-1.5">{session.state || 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">{session.srtt_ms != null ? Math.round(session.srtt_ms) : 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">{formatPercent(session.loss_rate)}</td>
                  <td className="py-1 px-1.5 text-right">{session.path_mtu ?? 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">{session.goodput_bps != null ? formatBps(session.goodput_bps) : 'N/A'}</td>
                  <td className="py-1 px-1.5 text-right">
                    <div>{formatCount(session.packets_sent)} pkts</div>
                    <div className="text-xs text-neutral-500">{formatBytes(session.bytes_sent)}</div>
                  </td>
                  <td className="py-1 px-1.5 text-right">
                    <div>{formatCount(session.packets_recv)} pkts</div>
                    <div className="text-xs text-neutral-500">{formatBytes(session.bytes_recv)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Transports */}
      {transports.length > 0 && (
        <div className="bg-neutral-900 px-3 py-2 rounded">
          <h2 className="text-xl font-bold mb-2 text-white">Transports</h2>
          <div className="space-y-2">
            {transports.map((transport, i) => (
              <div key={i} className="rounded bg-neutral-950 px-3 py-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-white">{transport.type?.toUpperCase() || 'Unknown'}</span>
                  <span className="text-xs font-mono text-neutral-400">ID: {transport.transport_id ?? 'N/A'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    transport.state === 'up' ? 'bg-green-900/50 text-green-400' : 'bg-neutral-700 text-neutral-400'
                  }`}>{transport.state || 'N/A'}</span>
                  <span className="text-xs text-neutral-500">MTU: {transport.mtu ?? 'N/A'}</span>
                  {transport.name && <span className="text-xs text-neutral-500">{transport.name}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <StatChip label="Tx" value={`${formatCount(transport.packets_sent)} pkts / ${formatBytes(transport.bytes_sent)}`} />
                  <StatChip label="Rx" value={`${formatCount(transport.packets_recv)} pkts / ${formatBytes(transport.bytes_recv)}`} />
                  {(transport.send_errors > 0 || transport.recv_errors > 0) && (
                    <StatChip label="Errors" value={`${formatCount(transport.send_errors)} tx / ${formatCount(transport.recv_errors)} rx`} />
                  )}
                  {transport.mtu_exceeded > 0 && (
                    <StatChip label="MTU Exceeded" value={formatCount(transport.mtu_exceeded)} />
                  )}
                  {/* UDP-specific */}
                  {transport.type === 'udp' && transport.kernel_drops > 0 && (
                    <StatChip label="Kernel Drops" value={formatCount(transport.kernel_drops)} />
                  )}
                  {/* TCP-specific */}
                  {transport.type === 'tcp' && (transport.connections_accepted > 0 || transport.connections_established > 0) && (
                    <StatChip label="Connections" value={`${formatCount(transport.connections_accepted)} in / ${formatCount(transport.connections_established)} out`} />
                  )}
                  {transport.type === 'tcp' && (transport.connect_refused > 0 || transport.connect_timeouts > 0) && (
                    <StatChip label="Connect Failures" value={`${formatCount(transport.connect_refused)} refused / ${formatCount(transport.connect_timeouts)} timeout`} />
                  )}
                  {transport.type === 'tcp' && transport.connections_rejected > 0 && (
                    <StatChip label="Rejected" value={formatCount(transport.connections_rejected)} />
                  )}
                  {/* Ethernet-specific */}
                  {transport.type === 'ethernet' && (
                    <StatChip label="Beacons" value={`${formatCount(transport.beacons_sent)} tx / ${formatCount(transport.beacons_recv)} rx`} />
                  )}
                  {transport.type === 'ethernet' && (transport.frames_sent > 0 || transport.frames_recv > 0) && (
                    <StatChip label="Frames" value={`${formatCount(transport.frames_sent)} tx / ${formatCount(transport.frames_recv)} rx`} />
                  )}
                  {transport.type === 'ethernet' && (transport.frames_too_long > 0 || transport.frames_too_short > 0) && (
                    <StatChip label="Frame Errors" value={`${formatCount(transport.frames_too_long)} long / ${formatCount(transport.frames_too_short)} short`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-neutral-900 px-3 py-2 rounded">
        <h2 className="text-xl font-bold mb-2 text-white">Static Peer YAML</h2>
        <p className="mb-2 text-sm text-neutral-400">
          Example config for adding this node as a static peer using the current hostname.
        </p>
        <pre className="overflow-x-auto rounded bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
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
