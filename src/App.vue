<script setup lang="ts">
import { ref } from 'vue'
import PeerConnectingTest from './components/PeerConnectingTest.vue'
import GameEngine from './components/GameEngine.vue'

const currentTab = ref<'peer' | 'gameengine'>('peer')
</script>

<template>
  <div>
    <div class="tab-buttons">
      <button
        type="button"
        :class="{ active: currentTab === 'peer' }"
        @click="currentTab = 'peer'"
      >
        PeerConnectingTest
      </button>
      <button
        type="button"
        :class="{ active: currentTab === 'gameengine' }"
        @click="currentTab = 'gameengine'"
      >
        GameEngine
      </button>
    </div>

    <div class="tab-panel">
      <PeerConnectingTest v-if="currentTab === 'peer'" />
      <GameEngine v-else />
    </div>
  </div>
</template>

<style scoped>
.tab-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
}

button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.tab-panel {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
</style>

