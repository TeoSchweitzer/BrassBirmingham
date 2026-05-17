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
    const STORAGE_KEY = 'bb_peer_meta_v1'

    type StoredMeta = {
      ownedId?: string
      peers?: string[]
    }

    function loadMeta(): StoredMeta | null {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as StoredMeta
      } catch (e) {
        console.warn('Failed to load peer meta from localStorage', e)
        return null
      }
    }

    function saveMeta(meta: StoredMeta) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
      } catch (e) {
        console.warn('Failed to save peer meta to localStorage', e)
      }
    }

    function clearMeta() {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (e) {
        console.warn('Failed to clear peer meta', e)
      }
    }

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
      // persist discovered peers
      const meta = loadMeta() || { peers: [] }
      meta.peers = meta.peers || []
      if (!meta.peers.includes(trimmed)) {
        meta.peers.push(trimmed)
        saveMeta(meta)
      }
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

      // persist requested peer
      const meta = loadMeta() || { peers: [] }
      meta.peers = meta.peers || []
      if (!meta.peers.includes(targetId)) {
        meta.peers.push(targetId)
        saveMeta(meta)
      }

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

      // persist ping target
      const meta = loadMeta() || { peers: [] }
      meta.peers = meta.peers || []
      if (!meta.peers.includes(targetId)) {
        meta.peers.push(targetId)
        saveMeta(meta)
      }
  }

  onMounted(async () => {
    const config = await iceServersPromise
    

      // attempt to reuse stored ownedId and peers
      const stored = loadMeta()

      async function createPeerWithOptionalId(ownedId?: string, allowFallback = true) {
        try {
          peer = ownedId ? new Peer(ownedId, { config }) : new Peer({ config })
        } catch (err) {
          // construction error (unlikely) -> fallback to new id
          if (allowFallback) {
            clearMeta()
            return createPeerWithOptionalId(undefined, false)
          }
          setError(err)
          return
        }

        let attemptedOwnedId = ownedId

        const onOpen = (id: string) => {
          // if we asked for an id but didn't get it, assume reclaim failed
          if (attemptedOwnedId && id !== attemptedOwnedId) {
            // wipe local and restart without id
            clearMeta()
            // cleanup listeners and peer, then recreate
            peer?.disconnect()
            peer?.destroy()
            peer = null
            createPeerWithOptionalId(undefined, false)
            return
          }

          peerId.value = id

          // if we have stored peers, attempt to connect to them
          const peersToConnect = stored?.peers || []
          for (const remote of peersToConnect) {
            try {
              if (remote && remote !== peerId.value) {
                const conn = peer!.connect(remote)
                setupConnection(conn)
              }
            } catch (e) {
              console.warn('Failed to connect to stored peer', remote, e)
            }
          }
        }

        const onConnection = (conn: DataConnection) => {
          setupConnection(conn)
          conn.on('open', () => {
            const reply = `Hi back from ${peerId.value} !`
            conn.send(reply)
          })
        }

        const onError = (error: any) => {
          // detect id taken / unavailable id errors
          const msg = String(error && (error.type || error.message || error))
          if (attemptedOwnedId && /unavailable-id|taken|in use|ID/.test(msg)) {
            clearMeta()
            peer?.disconnect()
            peer?.destroy()
            peer = null
            createPeerWithOptionalId(undefined, false)
            return
          }
          setError(error)
        }

        peer.on('open', onOpen)
        peer.on('connection', onConnection)
        peer.on('error', onError)

        // if we successfully created with an ownedId, persist it
        if (ownedId) {
          saveMeta({ ownedId, peers: stored?.peers || [] })
        } else if (!stored) {
          // no stored meta existed; persist the newly assigned id
          // open handler will set peerId and we can save then
          peer.once('open', (id: string) => {
            saveMeta({ ownedId: id, peers: [] })
          })
        }
      }

      // start
      if (stored && stored.ownedId) {
        await createPeerWithOptionalId(stored.ownedId)
      } else {
        await createPeerWithOptionalId(undefined)
      }
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
