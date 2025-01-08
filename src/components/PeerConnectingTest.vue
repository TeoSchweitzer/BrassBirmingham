<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { joinRoom, type Room } from 'trystero'
import { selfId } from 'trystero'

const servers = {
    iceServers: [{urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}],
    iceCandidatePoolSize: 10,
};
const config = {appId: 'app_id_sodmvytvxaps', rtcConfig: servers}
const knownPeers = ref(new Set<string>())
const room: Ref<Room | undefined> = ref(undefined)

function GoToRoom() {
    room.value = joinRoom(config, 'room_id_mkpicavyoixs')
    room.value.onPeerJoin((peerId: string) => knownPeers.value.add(peerId))
}
</script>

<template>
    <div>
        <button v-if="room == null" type="button" @click="GoToRoom">Join the Room</button>
        <div v-else>
            <p>Your peer ID is {{ selfId }}</p>
            <p>Known peers : {{ Array.from(knownPeers.values()).join(', ') }}</p>
        </div>
    </div>
</template>
