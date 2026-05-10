<script setup lang="ts">
  import { ref, watch } from 'vue'
  import RoomSettingsForm, { type RoomFormSettings } from '@/components/RoomSettingsForm.vue'

  const props = defineProps<{
    modelValue: boolean
    currentSettings: RoomFormSettings
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'save': [settings: RoomFormSettings]
  }>()

  const settings = ref<RoomFormSettings>({ ...props.currentSettings })

  watch(() => props.modelValue, open => {
    if (open) settings.value = { ...props.currentSettings }
  }, { immediate: true })

  function save () {
    if (!settings.value.name.trim()) return
    emit('save', {
      ...settings.value,
      name: settings.value.name.trim(),
      customDeck: settings.value.deck === 'custom' ? settings.value.customDeck.trim() : '',
    })
    emit('update:modelValue', false)
  }
</script>

<template>
  <v-dialog
    max-width="480"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Room settings</h2>
        <p>Changes apply to all participants. Modifying the deck will reset current votes.</p>
      </div>

      <v-form @submit.prevent="save">
        <div class="p0-modal-body">
          <RoomSettingsForm v-model="settings" />
        </div>

        <div class="p0-modal-foot">
          <v-btn
            class="p0-btn p0-btn-ghost"
            variant="flat"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </v-btn>

          <v-btn
            class="p0-btn p0-btn-primary"
            :disabled="!settings.name.trim()"
            prepend-icon="mdi-content-save"
            type="submit"
            variant="flat"
          >
            Save changes
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
