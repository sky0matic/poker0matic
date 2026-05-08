<script setup lang="ts">
  interface FloatingReaction {
    id: string
    emoji: string
    x: number
    y: number
  }

  defineProps<{
    reactions: FloatingReaction[]
  }>()
</script>

<template>
  <span
    v-for="reaction in reactions"
    :key="reaction.id"
    class="float-react"
    :style="{ left: `${reaction.x}px`, top: `${reaction.y}px` }"
  >
    {{ reaction.emoji }}
  </span>
</template>
