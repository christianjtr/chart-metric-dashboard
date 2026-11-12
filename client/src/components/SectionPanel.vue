<script setup lang="ts">
defineProps<{ name?: string; description?: string }>()
</script>

<template>
  <section class="section-panel">
    <div v-if="name || description" class="section-panel-header">
      <div class="section-panel-heading">
        <span v-if="name" class="section-panel-title">{{ name }}</span>
        <span v-if="description" class="section-panel-description">{{ description }}</span>
      </div>
      <slot name="append" />
    </div>
    <slot />
  </section>
</template>
