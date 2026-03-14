const CONTROL_SOCKET = process.env.FIPS_CONTROL_SOCKET || '/var/run/fips/control.sock'

type FipsStatusResponse = {
  version?: string
  npub?: string
  state?: string
  uptime_secs?: number
  peer_count?: number
  link_count?: number
  session_count?: number
  transport_count?: number
  estimated_mesh_size?: number
  tun_state?: string
  effective_ipv6_mtu?: number
  forwarding?: {
    delivered_packets?: number
    forwarded_packets?: number
    drop_no_route_packets?: number
    drop_mtu_exceeded_packets?: number
    decode_error_packets?: number
  }
}

type FipsPeerResponse = {
  peers?: Array<{
    display_name?: string
    npub?: string
    connectivity?: string
    authenticated_at_ms?: number
    last_seen_ms?: number
    is_parent?: boolean
    is_child?: boolean
    direction?: string
    transport_type?: string
    tree_depth?: number
    mmp?: {
      srtt_ms?: number
      loss_rate?: number
      goodput_bps?: number
    }
    stats?: {
      packets_sent?: number
      packets_recv?: number
      bytes_sent?: number
      bytes_recv?: number
    }
  }>
}

type FipsLinksResponse = {
  links?: Array<{
    link_id?: number
    transport_id?: number
    direction?: string
    state?: string
    created_at_ms?: number
    stats?: {
      packets_sent?: number
      packets_recv?: number
      bytes_sent?: number
      bytes_recv?: number
      last_recv_ms?: number
    }
  }>
}

type FipsTreeResponse = {
  root?: string
  is_root?: boolean
  depth?: number
  declaration_sequence?: number
  declaration_signed?: boolean
  peer_tree_count?: number
  peers?: Array<{
    display_name?: string
    depth?: number
    distance_to_us?: number
  }>
  stats?: {
    accepted?: number
    parent_switches?: number
    parent_losses?: number
    loop_detected?: number
    flap_dampened?: number
  }
}

type FipsSessionsResponse = {
  sessions?: Array<{
    display_name?: string
    npub?: string
    state?: string
    is_initiator?: boolean
    last_activity_ms?: number
    mmp?: {
      srtt_ms?: number
      loss_rate?: number
      goodput_bps?: number
      path_mtu?: number
    }
    stats?: {
      packets_sent?: number
      packets_recv?: number
      bytes_sent?: number
      bytes_recv?: number
    }
  }>
}

type FipsTransportsResponse = {
  transports?: Array<{
    transport_id?: number
    type?: string
    state?: string
    mtu?: number
    name?: string
    local_addr?: string
    stats?: {
      packets_sent?: number
      packets_recv?: number
      bytes_sent?: number
      bytes_recv?: number
      accepted?: number
      accept_errors?: number
      connects_started?: number
      connects_established?: number
      connects_failed?: number
      inbound_closed?: number
      outbound_closed?: number
      rx_dropped_unknown_src?: number
      rx_no_peer?: number
      discovery_sent?: number
      discovery_recv?: number
      discovery_ignored_self?: number
    }
  }>
}

export type DashboardStatus = {
  version: string | null
  npub: string | null
  state: string | null
  uptime_secs: number | null
  peer_count: number
  link_count: number
  session_count: number
  transport_count: number
  estimated_mesh_size: number | null
  tun_state: string | null
  effective_ipv6_mtu: number | null
  forwarding: {
    delivered_packets: number
    forwarded_packets: number
    drop_no_route_packets: number
    drop_mtu_exceeded_packets: number
    decode_error_packets: number
  }
}

export type DashboardPeer = {
  display_name: string | null
  npub: string | null
  connectivity: string | null
  authenticated_at_ms: number | null
  last_seen_ms: number | null
  relationship: 'parent' | 'child' | 'peer'
  direction: string | null
  transport_type: string | null
  tree_depth: number | null
  srtt_ms: number | null
  loss_rate: number | null
  goodput_bps: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

export type DashboardLink = {
  link_id: number | null
  transport_id: number | null
  direction: string | null
  state: string | null
  created_at_ms: number | null
  last_recv_ms: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

export type DashboardTree = {
  root: string | null
  is_root: boolean
  depth: number | null
  declaration_sequence: number | null
  declaration_signed: boolean
  peer_tree_count: number
  peers: Array<{
    display_name: string | null
    depth: number | null
    distance_to_us: number | null
  }>
  stats: {
    accepted: number
    parent_switches: number
    parent_losses: number
    loop_detected: number
    flap_dampened: number
  }
}

export type DashboardSession = {
  display_name: string | null
  npub: string | null
  state: string | null
  is_initiator: boolean
  last_activity_ms: number | null
  srtt_ms: number | null
  loss_rate: number | null
  goodput_bps: number | null
  path_mtu: number | null
  packets_sent: number
  packets_recv: number
  bytes_sent: number
  bytes_recv: number
}

export type DashboardTransport = {
  transport_id: number | null
  type: string | null
  state: string | null
  mtu: number | null
  name: string | null
  local_port: number | null
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

export type DashboardInfo = {
  status: DashboardStatus
  peers: DashboardPeer[]
  links: DashboardLink[]
  tree: DashboardTree
  sessions: DashboardSession[]
  transports: DashboardTransport[]
}

async function fipsctl<T>(command: string): Promise<T> {
  const proc = Bun.spawn(['fipsctl', '-s', CONTROL_SOCKET, 'show', command], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  if (code !== 0) {
    throw new Error(stderr || `Exit code: ${code}`)
  }

  try {
    return JSON.parse(stdout.trim()) as T
  } catch {
    throw new Error('Invalid JSON response from fipsctl')
  }
}

function parsePort(localAddr?: string): number | null {
  if (!localAddr) return null
  const ipv6Match = localAddr.match(/\]:(\d+)$/)
  if (ipv6Match) return Number.parseInt(ipv6Match[1], 10)
  const parts = localAddr.split(':')
  const maybePort = parts[parts.length - 1]
  if (!maybePort || !/^\d+$/.test(maybePort)) return null
  return Number.parseInt(maybePort, 10)
}

function sanitizeStatus(input: FipsStatusResponse): DashboardStatus {
  return {
    version: input.version ?? null,
    npub: input.npub ?? null,
    state: input.state ?? null,
    uptime_secs: input.uptime_secs ?? null,
    peer_count: input.peer_count ?? 0,
    link_count: input.link_count ?? 0,
    session_count: input.session_count ?? 0,
    transport_count: input.transport_count ?? 0,
    estimated_mesh_size: input.estimated_mesh_size ?? null,
    tun_state: input.tun_state ?? null,
    effective_ipv6_mtu: input.effective_ipv6_mtu ?? null,
    forwarding: {
      delivered_packets: input.forwarding?.delivered_packets ?? 0,
      forwarded_packets: input.forwarding?.forwarded_packets ?? 0,
      drop_no_route_packets: input.forwarding?.drop_no_route_packets ?? 0,
      drop_mtu_exceeded_packets: input.forwarding?.drop_mtu_exceeded_packets ?? 0,
      decode_error_packets: input.forwarding?.decode_error_packets ?? 0,
    },
  }
}

function sanitizePeers(input: FipsPeerResponse): DashboardPeer[] {
  return (input.peers ?? []).map((peer) => ({
    display_name: peer.display_name ?? null,
    npub: peer.npub ?? null,
    connectivity: peer.connectivity ?? null,
    authenticated_at_ms: peer.authenticated_at_ms ?? null,
    last_seen_ms: peer.last_seen_ms ?? null,
    relationship: peer.is_parent ? 'parent' : peer.is_child ? 'child' : 'peer',
    direction: peer.direction ?? null,
    transport_type: peer.transport_type ?? null,
    tree_depth: peer.tree_depth ?? null,
    srtt_ms: peer.mmp?.srtt_ms ?? null,
    loss_rate: peer.mmp?.loss_rate ?? null,
    goodput_bps: peer.mmp?.goodput_bps ?? null,
    packets_sent: peer.stats?.packets_sent ?? 0,
    packets_recv: peer.stats?.packets_recv ?? 0,
    bytes_sent: peer.stats?.bytes_sent ?? 0,
    bytes_recv: peer.stats?.bytes_recv ?? 0,
  }))
}

function sanitizeLinks(input: FipsLinksResponse): DashboardLink[] {
  return (input.links ?? []).map((link) => ({
    link_id: link.link_id ?? null,
    transport_id: link.transport_id ?? null,
    direction: link.direction ?? null,
    state: link.state ?? null,
    created_at_ms: link.created_at_ms ?? null,
    last_recv_ms: link.stats?.last_recv_ms ?? null,
    packets_sent: link.stats?.packets_sent ?? 0,
    packets_recv: link.stats?.packets_recv ?? 0,
    bytes_sent: link.stats?.bytes_sent ?? 0,
    bytes_recv: link.stats?.bytes_recv ?? 0,
  }))
}

function sanitizeTree(input: FipsTreeResponse): DashboardTree {
  return {
    root: input.root ?? null,
    is_root: input.is_root ?? false,
    depth: input.depth ?? null,
    declaration_sequence: input.declaration_sequence ?? null,
    declaration_signed: input.declaration_signed ?? false,
    peer_tree_count: input.peer_tree_count ?? 0,
    peers: (input.peers ?? []).map((peer) => ({
      display_name: peer.display_name ?? null,
      depth: peer.depth ?? null,
      distance_to_us: peer.distance_to_us ?? null,
    })),
    stats: {
      accepted: input.stats?.accepted ?? 0,
      parent_switches: input.stats?.parent_switches ?? 0,
      parent_losses: input.stats?.parent_losses ?? 0,
      loop_detected: input.stats?.loop_detected ?? 0,
      flap_dampened: input.stats?.flap_dampened ?? 0,
    },
  }
}

function sanitizeSessions(input: FipsSessionsResponse): DashboardSession[] {
  return (input.sessions ?? []).map((session) => ({
    display_name: session.display_name ?? null,
    npub: session.npub ?? null,
    state: session.state ?? null,
    is_initiator: session.is_initiator ?? false,
    last_activity_ms: session.last_activity_ms ?? null,
    srtt_ms: session.mmp?.srtt_ms ?? null,
    loss_rate: session.mmp?.loss_rate ?? null,
    goodput_bps: session.mmp?.goodput_bps ?? null,
    path_mtu: session.mmp?.path_mtu ?? null,
    packets_sent: session.stats?.packets_sent ?? 0,
    packets_recv: session.stats?.packets_recv ?? 0,
    bytes_sent: session.stats?.bytes_sent ?? 0,
    bytes_recv: session.stats?.bytes_recv ?? 0,
  }))
}

function sanitizeTransports(input: FipsTransportsResponse): DashboardTransport[] {
  return (input.transports ?? []).map((transport) => ({
    transport_id: transport.transport_id ?? null,
    type: transport.type ?? null,
    state: transport.state ?? null,
    mtu: transport.mtu ?? null,
    name: transport.name ?? null,
    local_port: parsePort(transport.local_addr),
    packets_sent: transport.stats?.packets_sent ?? 0,
    packets_recv: transport.stats?.packets_recv ?? 0,
    bytes_sent: transport.stats?.bytes_sent ?? 0,
    bytes_recv: transport.stats?.bytes_recv ?? 0,
    accepted: transport.stats?.accepted ?? 0,
    accept_errors: transport.stats?.accept_errors ?? 0,
    connects_started: transport.stats?.connects_started ?? 0,
    connects_established: transport.stats?.connects_established ?? 0,
    connects_failed: transport.stats?.connects_failed ?? 0,
    inbound_closed: transport.stats?.inbound_closed ?? 0,
    outbound_closed: transport.stats?.outbound_closed ?? 0,
    rx_dropped_unknown_src: transport.stats?.rx_dropped_unknown_src ?? 0,
    rx_no_peer: transport.stats?.rx_no_peer ?? 0,
    discovery_sent: transport.stats?.discovery_sent ?? 0,
    discovery_recv: transport.stats?.discovery_recv ?? 0,
    discovery_ignored_self: transport.stats?.discovery_ignored_self ?? 0,
  }))
}

export async function getStatus(): Promise<DashboardStatus> {
  return sanitizeStatus(await fipsctl<FipsStatusResponse>('status'))
}

export async function getPeers(): Promise<{ peers: DashboardPeer[] }> {
  return { peers: sanitizePeers(await fipsctl<FipsPeerResponse>('peers')) }
}

export async function getLinks(): Promise<{ links: DashboardLink[] }> {
  return { links: sanitizeLinks(await fipsctl<FipsLinksResponse>('links')) }
}

export async function getTree(): Promise<DashboardTree> {
  return sanitizeTree(await fipsctl<FipsTreeResponse>('tree'))
}

export async function getSessions(): Promise<{ sessions: DashboardSession[] }> {
  return { sessions: sanitizeSessions(await fipsctl<FipsSessionsResponse>('sessions')) }
}

export async function getTransports(): Promise<{ transports: DashboardTransport[] }> {
  return { transports: sanitizeTransports(await fipsctl<FipsTransportsResponse>('transports')) }
}

export async function getInfo(): Promise<DashboardInfo> {
  const [status, peers, links, tree, sessions, transports] = await Promise.all([
    fipsctl<FipsStatusResponse>('status'),
    fipsctl<FipsPeerResponse>('peers'),
    fipsctl<FipsLinksResponse>('links'),
    fipsctl<FipsTreeResponse>('tree'),
    fipsctl<FipsSessionsResponse>('sessions'),
    fipsctl<FipsTransportsResponse>('transports'),
  ])

  return {
    status: sanitizeStatus(status),
    peers: sanitizePeers(peers),
    links: sanitizeLinks(links),
    tree: sanitizeTree(tree),
    sessions: sanitizeSessions(sessions),
    transports: sanitizeTransports(transports),
  }
}
