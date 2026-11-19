import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatElapsed, type TimerStatus } from '@/composables/useRoomTimer'
import RoomTimer from '../RoomTimer.vue'

describe('RoomTimer', () => {
  let elapsedSeconds: number

  function mountTimer (props: { timerStatus?: TimerStatus, revealedAt?: number | null } = {}) {
    return mount(RoomTimer, {
      props: { elapsedSeconds, timerStatus: 'normal', revealedAt: null, ...props },
      global: {
        stubs: {
          VTooltip: { template: '<div class="tooltip-stub"><slot name="activator" v-bind="{ props: {} }" /><slot /></div>' },
        },
      },
    })
  }

  beforeEach(() => {
    elapsedSeconds = faker.number.int({ min: 0, max: 3599 })
  })

  afterEach(() => vi.clearAllMocks())

  it.each([
    ['text-medium-emphasis', 'normal'],
    ['text-warning', 'target'],
    ['text-error', 'ceiling'],
  ] as const)('applies the %s colour class for %s status', (expectedClass, timerStatus) => {
    // Act
    const wrapper = mountTimer({ timerStatus })

    // Assert
    expect(wrapper.classes()).toContain(expectedClass)
    expect(wrapper.find('.tooltip-stub').exists()).toBe(timerStatus !== 'normal')
    expect(wrapper.text()).toContain(`Time since reset: ${formatElapsed(elapsedSeconds)}`)
  })

  it('renders the revealed-at time only when provided', async () => {
    // Arrange
    const revealedAt = faker.number.int({ min: 0, max: 3599 })
    const wrapper = mountTimer()
    const textWithout = wrapper.text()

    // Act
    await wrapper.setProps({ revealedAt })

    // Assert
    expect(textWithout).not.toContain('revealed at')
    expect(wrapper.text()).toContain(`revealed at ${formatElapsed(revealedAt)}`)
  })

  it.each([
    ['past-target', 'target', 'Past the target duration', 'mdi-clock-alert-outline'],
    ['past-ceiling', 'ceiling', 'Past the ceiling duration', 'mdi-clock-alert'],
  ] as const)('shows the %s tooltip when the status is %s', (_label, timerStatus, expectedText, expectedIcon) => {
    // Act
    const wrapper = mountTimer({ timerStatus })

    // Assert
    const tooltip = wrapper.find('.tooltip-stub')
    expect(tooltip.text()).toContain(expectedText)
    expect(tooltip.find(`.${expectedIcon}`).exists()).toBe(true)
  })
})
