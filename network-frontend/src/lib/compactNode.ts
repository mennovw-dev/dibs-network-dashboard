import type { EnrichedNode } from './houses'
import type { ListingNode } from '../types'

/** Minimal serializable node for workers + WebGL layers. */
export interface CompactNode {
  id: string
  lng: number
  lat: number
  status: string
  listed_at: string
  reactions_count: number
  reactions_max: number
  neighborhood?: string | null
  street?: string | null
  city?: string
}

export function compactFromListing(node: ListingNode): CompactNode | null {
  if (!node.has_coordinates || node.longitude == null || node.latitude == null) {
    return null
  }
  return {
    id: node.id,
    lng: node.longitude,
    lat: node.latitude,
    status: node.status,
    listed_at: node.listed_at,
    reactions_count: node.reactions_count,
    reactions_max: node.reactions_max,
    neighborhood: node.neighborhood,
    street: node.street,
    city: node.city,
  }
}

export function compactFromEnriched(node: EnrichedNode): CompactNode | null {
  if (!node.has_coordinates || node.longitude == null || node.latitude == null) {
    return null
  }
  return {
    id: node.id,
    lng: node.longitude,
    lat: node.latitude,
    status: node.status,
    listed_at: node.listed_at,
    reactions_count: node.reactions_count,
    reactions_max: node.reactions_max,
    neighborhood: node.neighborhood,
    street: node.street,
    city: node.city,
  }
}

export function compactToEnriched(c: CompactNode): EnrichedNode {
  return {
    id: c.id,
    house_id: c.id,
    name: c.street ?? c.city ?? c.id,
    city: c.city ?? 'Utrecht',
    status: c.status,
    latitude: c.lat,
    longitude: c.lng,
    reactions_count: c.reactions_count,
    reactions_max: c.reactions_max,
    listed_at: c.listed_at,
    has_coordinates: true,
    street: c.street ?? null,
    neighborhood: c.neighborhood ?? null,
    postcode: null,
    photo: '/houses/h_01.webp',
    bio: '',
  }
}
