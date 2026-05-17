<script setup lang="ts">
import { usePeerConnection } from '../utils/peerConnection'

const {
  peerId,
  otherPeerId,
  receivedMessage,
  connectionState,
  connectToPeer,
} = usePeerConnection()
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
