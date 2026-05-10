<template>
  <img
    :alt="avatarSeed"
    :height="size"
    :src="src"
    :style="`display: block; border-radius: ${square ? '7px' : '50%'}; background-color: ${bg};`"
    :width="size"
  >
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { DEFAULT_AVATAR_BG, THEME_BG_VALUE, buildAvatarUrl } from '@/utils/avatarStyles'

  const props = defineProps<{
    /** DiceBear style ID (e.g. 'notionists-neutral') */
    avatarStyle: string
    /** Seed string used to generate the avatar */
    avatarSeed: string
    /** Optional custom background hex color. Falls back to DEFAULT_AVATAR_BG. */
    avatarBg?: string
    size?: number
    square?: boolean
  }>()

  const size = computed(() => props.size ?? 64)
  const src  = computed(() => buildAvatarUrl(props.avatarStyle, props.avatarSeed))
  const bg   = computed(() => {
    if (!props.avatarBg || props.avatarBg === THEME_BG_VALUE) {
      // 'theme' sentinel → lighter version of the viewer's own accent color
      return props.avatarBg === THEME_BG_VALUE
        ? 'color-mix(in oklab, var(--accent), white 38%)'
        : DEFAULT_AVATAR_BG
    }
    return props.avatarBg
  })
</script>
