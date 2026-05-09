<script setup lang="ts">
  defineProps<{
    modelValue: boolean
  }>()

  defineEmits<{
    'update:modelValue': [value: boolean]
  }>()
</script>

<template>
  <v-dialog
    max-width="440"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>About</h2>
        <p>poker<strong>0</strong>matic — real-time collaborative planning poker.</p>
      </div>

      <div class="p0-modal-body">
        <p class="about-line">
          <a
            href="https://www.flaticon.com/free-icons/casino-chip"
            rel="noopener noreferrer"
            target="_blank"
          >Casino chip icons by POD Gladiator – Flaticon</a>
        </p>
      </div>

      <div class="p0-modal-foot">
        <v-btn
          class="p0-btn p0-btn-primary"
          variant="flat"
          @click="$emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
