<template>
  <img
    :alt="name"
    :height="size"
    :src="avatarUrl"
    :style="`display: block; border-radius: ${square ? '7px' : '50%'};`"
    :width="size"
  >
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useConfigStore } from '@/stores/config'
  import { buildAvatarUrl } from '@/utils/avatarStyles'

  const props = defineProps<{
    name: string
    size?: number
    square?: boolean
  }>()

  const configStore = useConfigStore()
  const size = computed(() => props.size ?? 64)

  const avatarUrl = computed(() =>
    buildAvatarUrl(configStore.avatarStyle, props.name),
  )
</script>
