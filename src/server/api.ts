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
  connection_count?: number
  estimated_mesh_size?: number
  tun_state?: string
  tun_name?: string
  effective_ipv6_mtu?: number
  ipv6_addr?: string
  node_addr?: string
  is_leaf_only?: boolean
  pid?: number
  exe_path?: string
  control_socket?: string
  forwarding?: {
    delivered_packets?: number
    delivered_bytes?: number
    forwarded_packets?: number
    forwarded_bytes?: number
    originated_packets?: number
    originated_bytes?: number
    received_packets?: number
    received_bytes?: number
    drop_no_route_packets?: number
    drop_no_route_bytes?: number
    drop_mtu_exceeded_packets?: number
    drop_mtu_exceeded_bytes?: number
    drop_send_error_packets?: number
    drop_send_error_bytes?: number
    decode_error_packets?: number
    decode_error_bytes?: number
    ttl_exhausted_packets?: number
    ttl_exhausted_bytes?: number
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
    transport_addr?: string
    ipv6_addr?: string
    node_addr?: string
    link_id?: number
    tree_depth?: number
    filter_sequence?: number
    has_bloom_filter?: boolean
    has_tree_position?: boolean
    mmp?: {
      srtt_ms?: number
      loss_rate?: number
      goodput_bps?: number
      etx?: number
      smoothed_etx?: number
      smoothed_loss?: number
      lqi?: number
      delivery_ratio_forward?: number
      delivery_ratio_reverse?: number
      mode?: string
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
    remote_addr?: string
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
  my_coords?: string[]
  my_node_addr?: string
  parent?: string
  parent_display_name?: string
  peers?: Array<{
    display_name?: string
    npub?: string
    depth?: number
    distance_to_us?: number
    node_addr?: string
    root?: string
    coords?: string[]
  }>
  stats?: {
    accepted?: number
    parent_switches?: number
    parent_switched?: number
    parent_losses?: number
    loop_detected?: number
    flap_dampened?: number
    ancestry_changed?: number
    addr_mismatch?: number
    decode_error?: number
    rate_limited?: number
    received?: number
    sent?: number
    send_failed?: number
    sig_failed?: number
    stale?: number
    unknown_peer?: number
  }
}

type FipsSessionsResponse = {
  sessions?: Array<{
    display_name?: string
    npub?: string
    state?: string
    is_initiator?: boolean
    last_activity_ms?: number
    remote_addr?: string
    mmp?: {
      srtt_ms?: number
      loss_rate?: number
      goodput_bps?: number
      path_mtu?: number
      etx?: number
      smoothed_etx?: number
      smoothed_loss?: number
      sqi?: number
      delivery_ratio_forward?: number
      delivery_ratio_reverse?: number
      mode?: string
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
      // common
      packets_sent?: number
      packets_recv?: number
      bytes_sent?: number
      bytes_recv?: number
      send_errors?: number
      recv_errors?: number
      mtu_exceeded?: number
      // udp
      kernel_drops?: number
      // tcp
      connect_refused?: number
      connect_timeouts?: number
      connections_accepted?: number
      connections_established?: number
      connections_rejected?: number
      // ethernet
      beacons_sent?: number
      beacons_recv?: number
      frames_sent?: number
      frames_recv?: number
      frames_too_long?: number
      frames_too_short?: number
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
  connection_count: number
  estimated_mesh_size: number | null
  tun_state: string | null
  tun_name: string | null
  effective_ipv6_mtu: number | null
  ipv6_addr: string | null
  node_addr: string | null
  is_leaf_only: boolean
  forwarding: {
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

export type DashboardPeer = {
  display_name: string | null
  npub: string | null
  connectivity: string | null
  authenticated_at_ms: number | null
  last_seen_ms: number | null
  relationship: 'parent' | 'child' | 'peer'
  direction: string | null
  transport_type: string | null
  ipv6_addr: string | null
  node_addr: string | null
  link_id: number | null
  tree_depth: number | null
  filter_sequence: number | null
  has_bloom_filter: boolean
  has_tree_position: boolean
  srtt_ms: number | null
  loss_rate: number | null
  goodput_bps: number | null
  etx: number | null
  smoothed_etx: number | null
  smoothed_loss: number | null
  lqi: number | null
  delivery_ratio_forward: number | null
  delivery_ratio_reverse: number | null
  mmp_mode: string | null
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
  my_coords: string[]
  parent: string | null
  parent_display_name: string | null
  peers: Array<{
    display_name: string | null
    npub: string | null
    depth: number | null
    distance_to_us: number | null
    coords: string[]
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
  etx: number | null
  smoothed_etx: number | null
  smoothed_loss: number | null
  sqi: number | null
  delivery_ratio_forward: number | null
  delivery_ratio_reverse: number | null
  mmp_mode: string | null
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
  send_errors: number
  recv_errors: number
  mtu_exceeded: number
  // udp
  kernel_drops: number
  // tcp
  connect_refused: number
  connect_timeouts: number
  connections_accepted: number
  connections_established: number
  connections_rejected: number
  // ethernet
  beacons_sent: number
  beacons_recv: number
  frames_sent: number
  frames_recv: number
  frames_too_long: number
  frames_too_short: number
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
    connection_count: input.connection_count ?? 0,
    estimated_mesh_size: input.estimated_mesh_size ?? null,
    tun_state: input.tun_state ?? null,
    tun_name: input.tun_name ?? null,
    effective_ipv6_mtu: input.effective_ipv6_mtu ?? null,
    ipv6_addr: input.ipv6_addr ?? null,
    node_addr: input.node_addr ?? null,
    is_leaf_only: input.is_leaf_only ?? false,
    forwarding: {
      delivered_packets: input.forwarding?.delivered_packets ?? 0,
      delivered_bytes: input.forwarding?.delivered_bytes ?? 0,
      forwarded_packets: input.forwarding?.forwarded_packets ?? 0,
      forwarded_bytes: input.forwarding?.forwarded_bytes ?? 0,
      originated_packets: input.forwarding?.originated_packets ?? 0,
      originated_bytes: input.forwarding?.originated_bytes ?? 0,
      received_packets: input.forwarding?.received_packets ?? 0,
      received_bytes: input.forwarding?.received_bytes ?? 0,
      drop_no_route_packets: input.forwarding?.drop_no_route_packets ?? 0,
      drop_no_route_bytes: input.forwarding?.drop_no_route_bytes ?? 0,
      drop_mtu_exceeded_packets: input.forwarding?.drop_mtu_exceeded_packets ?? 0,
      drop_mtu_exceeded_bytes: input.forwarding?.drop_mtu_exceeded_bytes ?? 0,
      drop_send_error_packets: input.forwarding?.drop_send_error_packets ?? 0,
      drop_send_error_bytes: input.forwarding?.drop_send_error_bytes ?? 0,
      decode_error_packets: input.forwarding?.decode_error_packets ?? 0,
      decode_error_bytes: input.forwarding?.decode_error_bytes ?? 0,
      ttl_exhausted_packets: input.forwarding?.ttl_exhausted_packets ?? 0,
      ttl_exhausted_bytes: input.forwarding?.ttl_exhausted_bytes ?? 0,
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
    relationship: peer.is_parent ? 'parent' as const : peer.is_child ? 'child' as const : 'peer' as const,
    direction: peer.direction ?? null,
    transport_type: peer.transport_type ?? null,
    ipv6_addr: peer.ipv6_addr ?? null,
    node_addr: peer.node_addr ?? null,
    link_id: peer.link_id ?? null,
    tree_depth: peer.tree_depth ?? null,
    filter_sequence: peer.filter_sequence ?? null,
    has_bloom_filter: peer.has_bloom_filter ?? false,
    has_tree_position: peer.has_tree_position ?? false,
    srtt_ms: peer.mmp?.srtt_ms ?? null,
    loss_rate: peer.mmp?.loss_rate ?? null,
    goodput_bps: peer.mmp?.goodput_bps ?? null,
    etx: peer.mmp?.etx ?? null,
    smoothed_etx: peer.mmp?.smoothed_etx ?? null,
    smoothed_loss: peer.mmp?.smoothed_loss ?? null,
    lqi: peer.mmp?.lqi ?? null,
    delivery_ratio_forward: peer.mmp?.delivery_ratio_forward ?? null,
    delivery_ratio_reverse: peer.mmp?.delivery_ratio_reverse ?? null,
    mmp_mode: peer.mmp?.mode ?? null,
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
    my_coords: input.my_coords ?? [],
    parent: input.parent ?? null,
    parent_display_name: input.parent_display_name ?? null,
    peers: (input.peers ?? []).map((peer) => ({
      display_name: peer.display_name ?? null,
      npub: peer.npub ?? null,
      depth: peer.depth ?? null,
      distance_to_us: peer.distance_to_us ?? null,
      coords: peer.coords ?? [],
    })),
    stats: {
      accepted: input.stats?.accepted ?? 0,
      parent_switches: input.stats?.parent_switches ?? 0,
      parent_losses: input.stats?.parent_losses ?? 0,
      loop_detected: input.stats?.loop_detected ?? 0,
      flap_dampened: input.stats?.flap_dampened ?? 0,
      ancestry_changed: input.stats?.ancestry_changed ?? 0,
      addr_mismatch: input.stats?.addr_mismatch ?? 0,
      decode_error: input.stats?.decode_error ?? 0,
      rate_limited: input.stats?.rate_limited ?? 0,
      received: input.stats?.received ?? 0,
      sent: input.stats?.sent ?? 0,
      send_failed: input.stats?.send_failed ?? 0,
      sig_failed: input.stats?.sig_failed ?? 0,
      stale: input.stats?.stale ?? 0,
      unknown_peer: input.stats?.unknown_peer ?? 0,
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
    etx: session.mmp?.etx ?? null,
    smoothed_etx: session.mmp?.smoothed_etx ?? null,
    smoothed_loss: session.mmp?.smoothed_loss ?? null,
    sqi: session.mmp?.sqi ?? null,
    delivery_ratio_forward: session.mmp?.delivery_ratio_forward ?? null,
    delivery_ratio_reverse: session.mmp?.delivery_ratio_reverse ?? null,
    mmp_mode: session.mmp?.mode ?? null,
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
    send_errors: transport.stats?.send_errors ?? 0,
    recv_errors: transport.stats?.recv_errors ?? 0,
    mtu_exceeded: transport.stats?.mtu_exceeded ?? 0,
    kernel_drops: transport.stats?.kernel_drops ?? 0,
    connect_refused: transport.stats?.connect_refused ?? 0,
    connect_timeouts: transport.stats?.connect_timeouts ?? 0,
    connections_accepted: transport.stats?.connections_accepted ?? 0,
    connections_established: transport.stats?.connections_established ?? 0,
    connections_rejected: transport.stats?.connections_rejected ?? 0,
    beacons_sent: transport.stats?.beacons_sent ?? 0,
    beacons_recv: transport.stats?.beacons_recv ?? 0,
    frames_sent: transport.stats?.frames_sent ?? 0,
    frames_recv: transport.stats?.frames_recv ?? 0,
    frames_too_long: transport.stats?.frames_too_long ?? 0,
    frames_too_short: transport.stats?.frames_too_short ?? 0,
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
