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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M13 9h-2V7h2m0 2v6h-2m1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"
          />
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
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.65;
  cursor: help;
  transition: opacity 0.15s ease;
}

.panel-description-trigger:hover,
.panel-description-trigger:focus-visible {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}
</style>
