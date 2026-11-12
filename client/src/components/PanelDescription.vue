<script setup lang="ts">
defineProps<{
  description?: string
}>()
</script>

<template>
  <v-tooltip v-if="description" location="top" max-width="380" open-delay="150">
    <template #activator="{ props: activatorProps }">
      <span
        v-bind="activatorProps"
        class="panel-description-trigger"
        aria-label="Panel description"
        role="button"
        tabindex="0"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="11" y="10.5" width="2" height="6.5" rx="1" fill="currentColor" />
          <circle cx="12" cy="7.4" r="1.5" fill="currentColor" />
        </svg>
      </span>
    </template>
    <span class="text-caption">{{ description }}</span>
  </v-tooltip>
</template>

<style scoped>
.panel-description-trigger {
  display: inline-flex;
  align-items: center;
  color: #9aa0a6;
  cursor: help;
  transition: color 0.15s ease;
}

.panel-description-trigger:hover,
.panel-description-trigger:focus-visible {
  color: rgb(var(--v-theme-primary));
}
</style>
