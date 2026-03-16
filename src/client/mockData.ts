import type { TreeData, DirectPeer } from './TreeGraph'

// Self is at depth 3 in the global tree, not root.
// 10 peers spread across distance 1–4 from Self.
export const mockTree: TreeData & {
  declaration_sequence: number
  declaration_signed: boolean
} = {
  root: 'deadbeefdeadbeef',
  is_root: false,
  depth: 3,
  declaration_sequence: 42,
  declaration_signed: true,
  peer_tree_count: 15,
  peers: [
    // distance 1 — directly connected to Self
    { display_name: 'alpha',   npub: 'npub1alpha000001', depth: 2, distance_to_us: 1 },
    { display_name: 'bravo',   npub: 'npub1bravo000002', depth: 4, distance_to_us: 1 },
    { display_name: 'charlie', npub: 'npub1charlie00003', depth: 4, distance_to_us: 1 },

    // distance 2 — one hop away via a distance-1 peer
    { display_name: 'delta',   npub: 'npub1delta000004', depth: 5, distance_to_us: 2 },
    { display_name: 'echo',    npub: 'npub1echo0000005', depth: 5, distance_to_us: 2 },
    { display_name: 'foxtrot', npub: 'npub1foxtrot00006', depth: 3, distance_to_us: 2 },

    // distance 3
    { display_name: 'golf',    npub: 'npub1golf0000007', depth: 6, distance_to_us: 3 },
    { display_name: 'hotel',   npub: 'npub1hotel000008', depth: 6, distance_to_us: 3 },

    // distance 4 — leaf nodes
    { display_name: 'india',   npub: 'npub1india000009', depth: 7, distance_to_us: 4 },
    { display_name: 'juliet',  npub: 'npub1juliet00010', depth: 7, distance_to_us: 4 },

    // distance 5 — deep leaves
    { display_name: 'kilo',    npub: 'npub1kilo0000011', depth: 8, distance_to_us: 5 },
    { display_name: 'lima',    npub: 'npub1lima0000012', depth: 8, distance_to_us: 5 },
    { display_name: 'mike',    npub: 'npub1mike0000013', depth: 8, distance_to_us: 5 },
    { display_name: 'november',npub: 'npub1november0014', depth: 8, distance_to_us: 5 },
    { display_name: 'oscar',   npub: 'npub1oscar000015', depth: 8, distance_to_us: 5 },
  ],
  stats: {
    accepted: 142,
    parent_switches: 17,
    parent_losses: 9,
    loop_detected: 1,
    flap_dampened: 3,
  },
}

// Direct (physically connected) peers for mock — these inform relationship styling
export const mockPeers: DirectPeer[] = [
  // alpha is Self's parent (depth 2 = Self's depth - 1)
  { display_name: 'alpha',   npub: 'npub1alpha000001', relationship: 'parent',  tree_depth: 2 },
  // bravo and charlie are Self's children (depth 4 = Self's depth + 1)
  { display_name: 'bravo',   npub: 'npub1bravo000002', relationship: 'child',   tree_depth: 4 },
  { display_name: 'charlie', npub: 'npub1charlie00003', relationship: 'child',   tree_depth: 4 },
]
