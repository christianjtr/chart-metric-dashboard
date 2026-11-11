<script setup lang="ts">
defineProps<{ name?: string }>()
</script>

<template>
  <section class="section-panel">
    <div v-if="name" class="section-panel-header">
      <span class="section-panel-title">{{ name }}</span>
      <slot name="append" />
    </div>
    <slot />
  </section>
</template>
