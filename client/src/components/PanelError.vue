<script setup lang="ts">
defineProps<{ error?: string }>()
</script>

<template>
  <v-tooltip v-if="error" location="top" max-width="380" open-delay="150">
    <template #activator="{ props: activatorProps }">
      <span
        v-bind="activatorProps"
        class="panel-error-trigger"
        role="img"
        aria-label="Metric failed to load"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 4 2.5 20.5h19L12 4Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <rect x="11" y="10.2" width="2" height="5" rx="1" fill="currentColor" />
          <circle cx="12" cy="17.6" r="1.3" fill="currentColor" />
        </svg>
      </span>
    </template>
    <span class="text-caption">{{ error }}</span>
  </v-tooltip>
</template>

<style scoped>
.panel-error-trigger {
  display: inline-flex;
  align-items: center;
  color: rgb(var(--v-theme-error));
  cursor: help;
}
</style>
