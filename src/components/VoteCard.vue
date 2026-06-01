<template>
  <div class="vote-card-scene" :class="{ small }" :style="{ zIndex: hovered ? 1 : undefined }">
    <button
      ref="cardRef"
      class="vote-card"
      :class="{ selected, small, readonly }"
      :style="cardStyle"
      type="button"
      @click="$emit('click')"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @mousemove="onMouseMove"
    >
      <span class="card-corner card-top-left card-pip">
        {{ typeof option === 'number' ? SUIT_SYMBOLS[suit] : '★' }}
      </span>

      <span class="card-center-pip">{{ option }}</span>

      <span class="card-corner card-bottom-right card-pip">
        {{ typeof option === 'number' ? SUIT_SYMBOLS[suit] : '★' }}
      </span>
    </button>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { usePreferencesStore } from '@/stores/preferences'

  const SUIT_SYMBOLS = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠', joker: '★' } as const
  type Suit = keyof typeof SUIT_SYMBOLS
  const SUIT_COLORS: Record<Suit, string> = {
    clubs: '#1a1a1a', diamonds: '#c0392b', hearts: '#c0392b', spades: '#1a1a1a', joker: '#7c3aed',
  }

  const props = defineProps<{
    option: number | string
    voteOptions: Array<number | string>
    selected: boolean
    small?: boolean
    readonly?: boolean
  }>()

  defineEmits<{ click: [] }>()

  const suit = computed<Suit>(() => {
    if (typeof props.option !== 'number') return 'joker'
    const numeric = props.voteOptions.filter((v): v is number => typeof v === 'number')
    const idx = numeric.indexOf(props.option)
    const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
    return suits[Math.min(Math.floor(idx / numeric.length * 4), 3)]
  })

  const preferencesStore = usePreferencesStore()

  const cardRef = ref<HTMLButtonElement | null>(null)
  const rx = ref(0)
  const ry = ref(0)
  const hovered = ref(false)

  const cardStyle = computed(() => {
    const base = { '--c': SUIT_COLORS[suit.value] }
    if (props.readonly || preferencesStore.reducedMotion) return base

    const shadowOffsetX = (ry.value * 0.4).toFixed(1)
    const shadowOffsetY = (-rx.value * 0.3 + (hovered.value ? 10 : 2)).toFixed(1)
    const shadowBlur = (Math.hypot(rx.value, ry.value) * 0.6 + (hovered.value ? 12 : 4)).toFixed(1)

    return {
      ...base,
      transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg) scale(${hovered.value ? 1.2 : 1})`,
      transition: hovered.value ? 'transform 0.06s linear, box-shadow 0.06s linear' : 'transform 0.5s ease-out, box-shadow 0.5s ease-out',
      boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,0.28)`,
    }
  })

  function onMouseEnter () {
    if (props.readonly || preferencesStore.reducedMotion) return
    hovered.value = true
  }

  function onMouseMove (e: MouseEvent) {
    if (props.readonly || preferencesStore.reducedMotion || !cardRef.value) return
    const rect = cardRef.value.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    ry.value = -x * 60
    rx.value = y * 44
  }

  function onMouseLeave () {
    hovered.value = false
    rx.value = 0
    ry.value = 0
  }
</script>

<style scoped>
.vote-card-scene {
  width: 64px;
  height: 90px;
  perspective: 180px;
  perspective-origin: center center;
  position: relative;
}

.vote-card-scene.small {
  width: 40px;
  height: 56px;
}

.vote-card {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: white;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  padding: 0;
  font-family: inherit;
  appearance: none;
  transform-style: preserve-3d;
  will-change: transform;
}

.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  color: var(--c);
}

.card-top-left {
  top: 5px;
  left: 6px;
}

.card-bottom-right {
  bottom: 5px;
  right: 6px;
  transform: rotate(180deg);
}

.card-pip {
  font-size: 16px;
}

.card-center-pip {
  font-size: 28px;
  font-weight: 700;
  color: var(--c);
  line-height: 1;
  user-select: none;
}

.vote-card:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.vote-card.selected {
  border-color: #1976d2;
  background: #e3f2fd;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.vote-card.small .card-top-left {
  top: 3px;
  left: 4px;
}

.vote-card.small .card-bottom-right {
  bottom: 3px;
  right: 4px;
}

.vote-card.small .card-pip {
  font-size: 10px;
}

.vote-card.small .card-center-pip {
  font-size: 17px;
}

.vote-card.readonly {
  cursor: default;
  pointer-events: none;
}
</style>
