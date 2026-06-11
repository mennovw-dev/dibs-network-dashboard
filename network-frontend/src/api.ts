import type { NodesResponse } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function fetchNodes(withCoordinates = false): Promise<NodesResponse> {
  const params = new URLSearchParams({ status: 'active' })
  if (withCoordinates) {
    params.set('with_coordinates', 'true')
  }

  const res = await fetch(`${API_BASE}/api/v1/spatial/nodes?${params}`)
  if (!res.ok) {
    throw new Error(`Failed to load nodes (${res.status})`)
  }
  return res.json()
}

export function websocketURL(): string {
  const configured = import.meta.env.VITE_WS_URL
  if (configured) {
    return configured
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}
