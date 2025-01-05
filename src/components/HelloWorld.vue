<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { joinRoom, type Room } from 'trystero/firebase'
import { selfId, type DataPayload } from 'trystero'

type Drink = DataPayload & {
    drink: string
    withIce: boolean
}

const config = { appId: 'https://brassbirminghammatchmaking-default-rtdb.europe-west1.firebasedatabase.app/' }
let triggerSendingDrink = () => {}

defineProps<{ msg: string }>()

const knownPeers = ref(new Set<string>())
const room: Ref<Room | undefined> = ref(undefined)

function GoToRoom() {
    room.value = joinRoom(config, 'yoyodyne')
    const [sendDrink, getDrink] = room.value.makeAction('drink')
    knownPeers.value.add(selfId)
    room.value.onPeerJoin((peerId: string) => {
        console.log(`${peerId} joined`)
        knownPeers.value.add(peerId)
    })
    room.value.onPeerLeave((peerId: string) => {
        console.log(`${peerId} left`)
        knownPeers.value.delete(peerId)
    })
    getDrink((data, peerId) => {
        knownPeers.value.add(peerId)
        let drink = data as Drink
        console.log(`got a ${drink.drink} with${drink.withIce ? '' : 'out'} ice from ${peerId}`)
    })
    triggerSendingDrink = () => sendDrink({ drink: 'mezcal', withIce: false})
}

function LeaveRoom() {
    room.value?.leave()
    room.value = undefined
}

</script>


<template>
    <h1>{{ msg }}</h1>

    <div class="card">
        <button v-if="room == null" type="button" @click="GoToRoom">Join</button>
        <button v-else type="button" @click="LeaveRoom">Leave</button>
        <p v-if="room == null">
            Not in a room !
        </p>
        <div v-else>
            <p>Your peer ID is {{ selfId }}</p>
            <p>Known peers : {{ Array.from(knownPeers.values()).join(', ') }}</p>
            <button type="button" @click="triggerSendingDrink()">Send Drinks</button>
        </div>
    </div>

    <p>
        Check out
        <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank">create-vue</a>, the official Vue + Vite
        starter
    </p>
    <p>
        Learn more about IDE Support for Vue in the
        <a href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support" target="_blank">Vue Docs Scaling up
            Guide</a>.
    </p>
    <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>


<style scoped>
.read-the-docs {
    color: #888;
}
</style>
