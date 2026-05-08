<script setup lang="ts">
  defineProps<{
    reactions: readonly string[]
  }>()

  defineEmits<{
    react: [emoji: string]
  }>()
</script>

<template>
  <div
    aria-label="Quick reactions"
    class="reactions"
  >
    <span class="label">React</span>

    <button
      v-for="emoji in reactions"
      :key="emoji"
      :aria-label="`Send ${emoji} reaction`"
      class="react-btn"
      type="button"
      @click="$emit('react', emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>
