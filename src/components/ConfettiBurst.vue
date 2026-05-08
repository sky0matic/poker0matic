<script setup lang="ts">
  interface ConfettiPiece {
    id: string
    left: number
    bg: string
    delay: number
    duration: number
    rotation: number
    shape: string
  }

  defineProps<{
    pieces: ConfettiPiece[]
  }>()
</script>

<template>
  <div
    aria-hidden="true"
    class="confetti-host"
  >
    <span
      v-for="piece in pieces"
      :key="piece.id"
      class="confetti-piece"
      :style="{
        left: `${piece.left}%`,
        background: piece.bg,
        animationDelay: `${piece.delay}s`,
        animationDuration: `${piece.duration}s`,
        borderRadius: piece.shape,
        transform: `rotate(${piece.rotation}deg)`,
      }"
    />
  </div>
</template>
