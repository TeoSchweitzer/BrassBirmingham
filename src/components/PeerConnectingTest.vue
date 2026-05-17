<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Peer, { DataConnection } from 'peerjs'

const peerId = ref('')
const otherPeerId = ref('')
const receivedMessage = ref('')
const connectionState = ref('not connected')
let peer: Peer | null = null
let connection: DataConnection | null = null

const iceServers = (window as any).__ICE_SERVERS__
  ?? await fetch("/api/ice").then(r => r.json());

function setupConnection(conn: DataConnection) {
  connection = conn
  connectionState.value = 'connected'

  connection.on('open', () => {
    if (connection && connection.open) {
      const hello = `Hello from ${peerId.value} !`
      connection.send(hello)
    }
  })

  connection.on('data', (data) => {
    receivedMessage.value = String(data)
  })

  connection.on('close', () => {
    connectionState.value = 'disconnected'
  })
}

function connectToPeer() {
  if (!peer || !otherPeerId.value.trim()) {
    return
  }

  const conn = peer.connect(otherPeerId.value.trim())
  setupConnection(conn)
}

onMounted(() => {
  peer = new Peer({config: iceServers})

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
    receivedMessage.value = `Peer error: ${String(error)}`
  })
})
</script>

<template>
  <div>
    <p>Your peer ID: <strong>{{ peerId }}</strong></p>

    <div>
      <label for="peer-id-input">Other peer ID:</label>
      <input
        id="peer-id-input"
        type="text"
        v-model="otherPeerId"
        placeholder="Enter peer ID"
      />
      <button type="button" @click="connectToPeer">Connect with peer</button>
    </div>

    <div>
      <p>Connection state: {{ connectionState }}</p>
      <p>Received message:</p>
      <textarea
        readonly
        rows="4"
        cols="40"
        :value="receivedMessage"
      ></textarea>
    </div>
  </div>
</template>
