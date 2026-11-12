<script setup lang="ts">
import type { PanelReference } from '@server/schemas/config'

defineProps<{ reference?: PanelReference }>()
</script>

<template>
  <div v-if="reference" class="panel-reference">
    Healthy {{ reference.healthy }}
    <a v-if="reference.url" :href="reference.url" target="_blank" rel="noopener">
      {{ reference.source }}
    </a>
    <span v-else>{{ reference.source }}</span>
  </div>
</template>

<style scoped>
.panel-reference {
  margin-top: 10px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.panel-reference a {
  color: rgb(var(--v-theme-info));
  text-decoration: none;
  margin-left: 4px;
}

.panel-reference a:hover {
  text-decoration: underline;
}
</style>
