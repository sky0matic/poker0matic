<template>
  <Teleport to="body">
    <Transition name="p0-loader">
      <div v-if="modelValue" class="p0-fullscreen-loader">
        <div class="p0-loader-inner">
          <div class="p0-loader-ring" />
          <span v-if="message" class="p0-loader-msg">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
  defineProps<{
    modelValue: boolean
    message?: string
  }>()
</script>

<style scoped>
  .p0-fullscreen-loader {
    position: fixed;
    inset: 0;
    background: var(--bg-base);
    display: grid;
    place-items: center;
    z-index: 9999;
  }

  .p0-loader-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .p0-loader-ring {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2.5px solid var(--border-strong);
    border-top-color: var(--accent);
    animation: p0-spin 0.65s linear infinite;
  }

  @keyframes p0-spin {
    to { transform: rotate(360deg); }
  }

  .p0-loader-msg {
    font-size: 12px;
    color: var(--text-3);
    font-family: var(--font-mono);
    margin: 0;
    letter-spacing: 0;
  }

  .p0-loader-enter-active,
  .p0-loader-leave-active {
    transition: opacity 0.18s ease;
  }

  .p0-loader-enter-from,
  .p0-loader-leave-to {
    opacity: 0;
  }
</style>
