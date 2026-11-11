<script setup lang="ts">
import { computed } from 'vue'
import type { DeltaInfo } from '../utils/delta'

const props = defineProps<{
  delta: DeltaInfo
}>()

const arrow = computed(() => (props.delta.direction === 'up' ? '▲' : '▼'))
const label = computed(() => `${arrow.value} ${Math.abs(props.delta.pct).toFixed(1)}%`)
const color = computed(() => (props.delta.improved ? 'success' : 'error'))
</script>

<template>
  <v-chip size="x-small" label :color="color" class="delta-chip">
    {{ label }}
  </v-chip>
</template>

<style scoped>
.delta-chip {
  font-variant-numeric: tabular-nums;
}
</style>
