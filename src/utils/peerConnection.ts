import { onMounted, ref } from 'vue'
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'

export type PeerConnectionState = 'not connected' | 'connected' | 'disconnected'

export function usePeerConnection() {
  const peerId = ref('')
  const otherPeerId = ref('')
  const selectedPeerId = ref('')
  const peerList = ref<string[]>([])
  const messageLog = ref('')
  const connectionState = ref<PeerConnectionState>('not connected')

  let peer: Peer | null = null
  const connectionMap = new Map<string, DataConnection>()

  const iceServersPromise = (window as any).__ICE_SERVERS__
    ? Promise.resolve((window as any).__ICE_SERVERS__)
    : fetch('/api/ice')
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load the ICE servers: ${r.status}`)
          return r.json()
        })
        .catch((error) => {
          console.warn(error)
          return undefined
        })

  function addPeerIdToList(id: string) {
    const trimmed = id.trim()
    if (!trimmed || trimmed === peerId.value) {
      return
    }
    if (!peerList.value.includes(trimmed)) {
      peerList.value.push(trimmed)
    }
  }

  function updateConnectionState() {
    const anyOpen = Array.from(connectionMap.values()).some((conn) => conn.open)
    connectionState.value = anyOpen ? 'connected' : 'disconnected'
  }

  function setError(error: unknown, peerName = 'peer') {
    messageLog.value = `Error (${peerName}): ${String(error)}`
    connectionState.value = 'disconnected'
  }

  function setupConnection(conn: DataConnection) {
    const remoteId = conn.peer
    addPeerIdToList(remoteId)
    connectionMap.set(remoteId, conn)
    connectionState.value = 'connected'

    conn.on('open', () => {
      connectionState.value = 'connected'
    })

    conn.on('data', (data) => {
      messageLog.value = `From ${remoteId}: ${String(data)}`
    })

    conn.on('close', () => {
      connectionMap.delete(remoteId)
      updateConnectionState()
    })

    conn.on('error', (error) => {
      setError(error, remoteId)
    })
  }

  function getConnectionForPeer(id: string) {
    const trimmed = id.trim()
    return trimmed ? connectionMap.get(trimmed) : undefined
  }

  function connectToPeer() {
    const targetId = otherPeerId.value.trim()
    if (!peer || !targetId) {
      setError('Enter a peer ID before connecting')
      return
    }

    addPeerIdToList(targetId)
    selectedPeerId.value = targetId

    const existing = getConnectionForPeer(targetId)
    if (existing && existing.open) {
      messageLog.value = `Already connected to ${targetId}`
      return
    }

    try {
      const conn = peer.connect(targetId)
      setupConnection(conn)
    } catch (error) {
      setError(error, targetId)
    }
  }

  function sendPing() {
    const targetId = selectedPeerId.value.trim() || otherPeerId.value.trim()
    if (!peer || !targetId) {
      setError('Select or enter a peer ID before pinging')
      return
    }

    const existing = getConnectionForPeer(targetId)
    if (existing && existing.open) {
      existing.send('Hello!')
      messageLog.value = `Sent to ${targetId}: Hello!`
      return
    }

    try {
      const conn = peer.connect(targetId)
      setupConnection(conn)
      conn.on('open', () => {
        conn.send('Hello!')
        messageLog.value = `Sent to ${targetId}: Hello!`
      })
    } catch (error) {
      setError(error, targetId)
    }
  }

  onMounted(async () => {
    const config = await iceServersPromise
    peer = new Peer({ config })

    peer.on('open', (id) => {
      peerId.value = id
    })

    peer.on('connection', (conn) => {
      setupConnection(conn)
      conn.on('open', () => {
        const reply = `Hi back from ${peerId.value} !`
        conn.send(reply)
      })
    })

    peer.on('error', (error) => {
      setError(error)
    })
  })

  return {
    peerId,
    otherPeerId,
    selectedPeerId,
    peerList,
    messageLog,
    connectionState,
    connectToPeer,
    sendPing,
  }
}
