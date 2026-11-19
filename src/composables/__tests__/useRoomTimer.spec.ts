import type { RoomSettings } from '@/config/roomVersions'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type Ref, ref } from 'vue'
import { formatElapsed, type TimedRoom, useRoomTimer } from '../useRoomTimer'

type TimerState = ReturnType<typeof useRoomTimer>

describe('composables/useRoomTimer', () => {
  let now: number
  let room: Ref<TimedRoom | null>

  function mountHost () {
    let state!: TimerState
    const Host = defineComponent({
      setup () {
        state = useRoomTimer(room)
        return () => h('div')
      },
    })
    const wrapper = mount(Host)
    return { wrapper, state }
  }

  function makeRoom (overrides: Partial<TimedRoom> = {}, settings: RoomSettings = {}): TimedRoom {
    return { createdAt: now, ...overrides, settings: { showVotes: false, ...settings } }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    now = faker.date.recent().getTime()
    vi.setSystemTime(now)
    room = ref<TimedRoom | null>(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each([
    [0, '00:00'],
    [9, '00:09'],
    [75, '01:15'],
    [3600, '60:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    // Act
    const result = formatElapsed(seconds)

    // Assert
    expect(result).toBe(expected)
  })

  it('counts elapsed seconds from resetAt, falling back to createdAt', async () => {
    // Arrange
    room.value = makeRoom({ createdAt: now - 30_000 })
    const { state, wrapper } = mountHost()

    // Act
    vi.advanceTimersByTime(1000)
    const fromCreatedAt = state.elapsedSeconds.value
    room.value = makeRoom({ createdAt: now - 30_000, resetAt: now - 5000 })
    await nextTick()
    vi.advanceTimersByTime(1000)

    // Assert
    expect(fromCreatedAt).toBe(31)
    expect(state.elapsedSeconds.value).toBe(7)
    wrapper.unmount()
  })

  it.each([
    ['normal', 10],
    ['target', 60],
    ['ceiling', 120],
  ])('reports %s status when elapsed reaches the threshold', async (expected, elapsed) => {
    // Arrange
    room.value = makeRoom({}, { targetDuration: 60, ceilingDuration: 120 })
    const { state, wrapper } = mountHost()

    // Act
    vi.advanceTimersByTime(elapsed * 1000)
    await nextTick()

    // Assert
    expect(state.timerStatus.value).toBe(expected)
    wrapper.unmount()
  })

  it('derives revealedAt from settings.revealedAt and clears it when votes are hidden again', async () => {
    // Arrange
    const revealedAfter = faker.number.int({ min: 1, max: 300 })
    room.value = makeRoom({}, { showVotes: true, revealedAt: now + revealedAfter * 1000 })
    const { state, wrapper } = mountHost()
    const revealedBefore = state.revealedAt.value

    // Act
    room.value = makeRoom()
    await nextTick()

    // Assert
    expect(revealedBefore).toBe(revealedAfter)
    expect(state.revealedAt.value).toBeNull()
    wrapper.unmount()
  })

  it('restarts elapsed seconds at zero when restart is called', () => {
    // Arrange
    room.value = makeRoom()
    const { state, wrapper } = mountHost()
    vi.advanceTimersByTime(5000)
    const before = state.elapsedSeconds.value

    // Act
    state.restart()

    // Assert
    expect(before).toBe(5)
    expect(state.elapsedSeconds.value).toBe(0)
    wrapper.unmount()
  })

  it('clears its interval on unmount', () => {
    // Arrange
    room.value = makeRoom()
    const { state, wrapper } = mountHost()
    vi.advanceTimersByTime(2000)

    // Act
    wrapper.unmount()
    vi.advanceTimersByTime(5000)

    // Assert
    expect(state.elapsedSeconds.value).toBe(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
