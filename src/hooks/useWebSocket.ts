import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../lib/store'
import type { WSMessage } from '../types'

const WS_URL = `ws://${window.location.host}/ws`
const RECONNECT_DELAY = 3000
const HEARTBEAT_INTERVAL = 30000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)

  const handleWSMessage = useStore((state) => state.handleWSMessage)

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    // Don't connect if already open or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    cleanup()

    try {
      wsRef.current = new WebSocket(WS_URL)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')

        // Start heartbeat
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          handleWSMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...')
        cleanup()

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)

      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }, [cleanup, handleWSMessage])

  const disconnect = useCallback(() => {
    cleanup()
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'client_disconnecting' }))
        }
        wsRef.current.close()
      } catch (e) {
        // Ignore errors during disconnect
      }
      wsRef.current = null
    }
  }, [cleanup])

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Handle page visibility for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN) {
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connect])

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'client_disconnecting' }))
        }
      } catch (e) {
        // Ignore errors during unload
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return { connect, disconnect, send }
}
