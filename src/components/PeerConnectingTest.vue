<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Peer, { DataConnection } from 'peerjs'

const peerId = ref('')
const otherPeerId = ref('')
const receivedMessage = ref('')
const connectionState = ref('not connected')
let peer: Peer | null = null
let connection: DataConnection | null = null

const peerOptions = {
  config: {
	"iceServers": [
		{
			"urls": [
				"stun:stun.cloudflare.com:3478",
				"stun:stun.cloudflare.com:53"
			]
		},
		{
			"urls": [
				"turn:turn.cloudflare.com:3478?transport=udp",
				"turn:turn.cloudflare.com:3478?transport=tcp",
				"turns:turn.cloudflare.com:5349?transport=tcp",
				"turn:turn.cloudflare.com:53?transport=udp",
				"turn:turn.cloudflare.com:80?transport=tcp",
				"turns:turn.cloudflare.com:443?transport=tcp"
			],
			"username": "g0366fe22b033d3c45c4ee102321bc7e7494744ddd4c4f6592c3b201b1568c97",
			"credential": "d8761ac9e563c67e6ac5e20715b31dac9c706083de550835b1b4ad734c1b9d96"
		}
	]
  },
}

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
  peer = new Peer(undefined, peerOptions)

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
