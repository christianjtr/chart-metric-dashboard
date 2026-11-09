<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { trpc } from './api/trpc'

const gatewayOk = ref<boolean | null>(null)
const sources = ref<Awaited<ReturnType<typeof trpc.sources.list.query>>>([])

onMounted(async () => {
  try {
    gatewayOk.value = (await trpc.health.query()).ok
    sources.value = await trpc.sources.list.query()
  } catch {
    gatewayOk.value = false
  }
})
</script>

<template>
  <v-app>
    <v-app-bar color="primary" title="Chart Dashboard">
      <v-chip class="ma-4" :color="gatewayOk === null ? 'grey' : gatewayOk ? 'success' : 'error'">
        {{ gatewayOk === null ? 'connecting…' : gatewayOk ? 'gateway: ok' : 'gateway: down' }}
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container>
        <h2 class="text-h5 mb-4">Sources</h2>
        <v-list lines="one">
          <v-list-item v-for="source in sources" :key="source.id" :title="source.label">
            <template #append>
              <v-chip size="small">{{ source.adapter }}</v-chip>
            </template>
          </v-list-item>
        </v-list>

        <p class="text-medium-emphasis mt-4">
          Panels render from <code>dashboard.config.json</code> — adapters and charts land in the
          next phases.
        </p>
      </v-container>
    </v-main>
  </v-app>
</template>
