export type ListingStatus = 'active' | 'paused' | 'closed' | 'draft' | string

export interface ListingNode {
  id: string
  house_id: string
  name: string
  city: string
  status: ListingStatus
  latitude?: number | null
  longitude?: number | null
  reactions_count: number
  reactions_max: number
  listed_at: string
  has_coordinates: boolean
  /* Optioneel — geleverd door rijker (mock) model, valt netjes terug als afwezig. */
  street?: string | null
  postcode?: string | null
  neighborhood?: string | null
}

export interface NodesResponse {
  count: number
  nodes: ListingNode[]
}

export interface NodesSnapshotMessage {
  type: 'nodes_snapshot'
  nodes: ListingNode[]
}
