<template>
  <svg
    :height="size"
    shape-rendering="crispEdges"
    style="display: block;"
    :viewBox="`0 0 ${size} ${size}`"
    :width="size"
  >
    <rect
      v-for="(rect, i) in rects"
      :key="i"
      :fill="rect.fill"
      :height="px"
      :width="px"
      :x="rect.x"
      :y="rect.y"
    />
  </svg>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  const props = defineProps<{
    userId: string
    name: string
    size?: number
  }>()

  const size = computed(() => props.size ?? 64)
  const px = computed(() => size.value / 12)

  // -- palettes ------------------------------------------------------------
  const PALETTES: Record<string, { s: string, d: string, e: string, a: string }> = {
    robot: { s: '#8aa2c7', d: '#3d4f6f', e: '#7af3ff', a: '#c9d4ea' },
    ghost: { s: '#dee3ec', d: '#9ba2af', e: '#1a1f2b', a: '#ffffff' },
    knight: { s: '#a8a290', d: '#4a4536', e: '#ffd75a', a: '#d8d0b6' },
    alien: { s: '#7ee0a3', d: '#2d6b48', e: '#ff5e9c', a: '#a8f0c2' },
    cat: { s: '#f0a85a', d: '#7d4818', e: '#3ecf8e', a: '#ffd09c' },
    frog: { s: '#9adc6e', d: '#3a6128', e: '#1a1f2b', a: '#c5edab' },
    pumpkin: { s: '#f08144', d: '#7a3919', e: '#1a1f2b', a: '#ffb47a' },
    ninja: { s: '#3a4252', d: '#15181f', e: '#f0e5c2', a: '#5a6478' },
  }

  // -- pixel patterns (12x12 each) -----------------------------------------
  const PATTERNS: Record<string, string[]> = {
    robot: [
      '............',
      '....ssss....',
      '...sssssss..',
      '..sssssssss.',
      '..sdssssds..',
      '..seessees..',
      '..sssssssss.',
      '..sssaasss..',
      '..ssssssss..',
      '...ssssss...',
      '....s..s....',
      '....d..d....',
    ],
    ghost: [
      '............',
      '...ssssss...',
      '..ssssssss..',
      '.ssssssssss.',
      '.sdssssssds.',
      '.seessssees.',
      '.ssssssssss.',
      '.ssssssssss.',
      '.ssssssssss.',
      '.ssssssssss.',
      '.s.ss.ss.ss.',
      '............',
    ],
    knight: [
      '............',
      '....dddd....',
      '...dssssd...',
      '..dssssssd..',
      '..dseesesd..',
      '..dssssssd..',
      '..dsssssds..',
      '..ddddddd...',
      '...sssss....',
      '...sasas....',
      '...s.s.s....',
      '...d...d....',
    ],
    alien: [
      '............',
      '....ssss....',
      '...sssssss..',
      '..sssssssss.',
      '..sdseesds..',
      '..sssssssss.',
      '..ssssssss..',
      '...ssaass...',
      '....ssss....',
      '...s.ss.s...',
      '..s..ss..s..',
      '.d...dd...d.',
    ],
    cat: [
      '............',
      '..s......s..',
      '..ss....ss..',
      '..sss..sss..',
      '..ssssssss..',
      '..sesssses..',
      '..sssddssss.',
      '..ssssssss..',
      '..sasssasss.',
      '...ssssss...',
      '....s..s....',
      '....d..d....',
    ],
    frog: [
      '............',
      '....ss..ss..',
      '...ssss.sss.',
      '..ssesssesss',
      '..ssesssesss',
      '.ssssssssss.',
      '.sssddddss..',
      '.ssssssss...',
      '.ssaaaass...',
      '..ssssss....',
      '..s....s....',
      '..d....d....',
    ],
    pumpkin: [
      '............',
      '.....dd.....',
      '....ddd.....',
      '...ssssss...',
      '..ssssssss..',
      '.sdsssssds..',
      '.seessssees.',
      '.ssddddssss.',
      '.ssssssssss.',
      '..ssssssss..',
      '...ssssss...',
      '............',
    ],
    ninja: [
      '............',
      '...ddddddd..',
      '..dssssssss.',
      '..ddddddddd.',
      '..deessseed.',
      '..ddddddddd.',
      '..ssssssss..',
      '..ssssssss..',
      '..sasssssas.',
      '...ssssss...',
      '...d....d...',
      '...d....d...',
    ],
  }

  const MASCOT_KEYS = Object.keys(PALETTES)

  function hashUserId (id: string): number {
    let h = 0
    for (const char of id) {
      h = (char.codePointAt(0) ?? 0) + ((h << 5) - h)
      h = Math.trunc(h)
    }
    return Math.abs(h)
  }

  const mascotKey = computed(() => MASCOT_KEYS[hashUserId(props.userId) % MASCOT_KEYS.length])

  const rects = computed(() => {
    const pal = PALETTES[mascotKey.value]
    const pattern = PATTERNS[mascotKey.value]
    const p = px.value
    const map: Record<string, string> = { s: pal.s, d: pal.d, e: pal.e, a: pal.a }
    const out: { x: number, y: number, fill: string }[] = []
    for (const [y, row] of pattern.entries()) {
      for (const [x, element] of Array.from(row).entries()) {
        const fill = map[element]
        if (fill) {
          out.push({ x: x * p, y: y * p, fill })
        }
      }
    }
    return out
  })
</script>
