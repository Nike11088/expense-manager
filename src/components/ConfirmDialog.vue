<script setup lang="ts">
import { onMounted, ref } from "vue";
defineProps<{
  title: string;
  description: string;
  action: string;
  busy?: boolean;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const dialog = ref<HTMLDialogElement>();
onMounted(() => dialog.value?.showModal());
</script>
<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    aria-labelledby="confirm-title"
    @cancel.prevent="!busy && emit('close')"
  >
    <h2 id="confirm-title">{{ title }}</h2>
    <p>{{ description }}</p>
    <div class="dialog-actions">
      <button
        :disabled="busy"
        class="text-button"
        autofocus
        @click="emit('close')"
      >
        Отмена</button
      ><button
        :disabled="busy"
        class="text-button danger"
        @click="emit('confirm')"
      >
        {{ busy ? "Подождите…" : action }}
      </button>
    </div>
  </dialog>
</template>
