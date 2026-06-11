import { useCallback, useEffect, useState } from 'react'
import { fetchNodes, websocketURL } from '../api'
import type { ListingNode, NodesSnapshotMessage } from '../types'

interface NetworkNodesState {
  nodes: ListingNode[]
  loading: boolean
  error: string | null
  source: 'http' | 'websocket' | null
  lastUpdated: Date | null
}

export function useNetworkNodes(): NetworkNodesState {
  const [nodes, setNodes] = useState<ListingNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'http' | 'websocket' | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const applyNodes = useCallback((next: ListingNode[], from: 'http' | 'websocket') => {
    setNodes(next)
    setSource(from)
    setLastUpdated(new Date())
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchNodes()
      .then((data) => {
        if (!cancelled) {
          applyNodes(data.nodes ?? [], 'http')
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyNodes])

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let closed = false

    const connect = () => {
      socket = new WebSocket(websocketURL())

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as NodesSnapshotMessage
          if (message.type === 'nodes_snapshot' && Array.isArray(message.nodes)) {
            applyNodes(message.nodes, 'websocket')
          }
        } catch {
          // ignore malformed frames
        }
      }

      socket.onclose = () => {
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
  }, [applyNodes])

  return { nodes, loading, error, source, lastUpdated }
}
