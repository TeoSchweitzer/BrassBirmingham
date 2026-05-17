<script setup lang="ts">
import { usePeerConnection } from '../utils/peerConnection'

const {
  peerId,
  otherPeerId,
  selectedPeerId,
  peerList,
  messageLog,
  connectionState,
  connectToPeer,
  sendPing,
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
      <label for="peer-select">Select peer:</label>
      <select id="peer-select" v-model="selectedPeerId">
        <option value="" disabled>Select a peer</option>
        <option v-for="peer in peerList" :key="peer" :value="peer">
          {{ peer }}
        </option>
      </select>
      <button type="button" @click="sendPing">Ping</button>
    </div>

    <div>
      <p>Connection state: {{ connectionState }}</p>
      <p>Message log:</p>
      <textarea
        readonly
        rows="6"
        cols="40"
        :value="messageLog"
      ></textarea>
    </div>
  </div>
</template>
