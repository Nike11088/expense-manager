<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useExpenses } from "../store";
import { normalizeName, palette } from "../domain";
import { categoryIcons } from "../icons";
import Icon from "../components/Icon.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
const store = useExpenses();
const route = useRoute();
const router = useRouter();
const original = store.categories.find((item) => item.id === route.params.id);
const missing = route.params.id !== "new" && !original;
const name = ref(original?.name ?? "");
const icon = ref(original?.icon ?? "cart");
const color = ref(original?.color ?? palette[0]);
const error = ref("");
const busy = ref(false);
const archiving = ref(false);
const committed = ref(false);
const iconDialog = ref<HTMLDialogElement>();
const initial = JSON.stringify([name.value, icon.value, color.value]);
const iconLabel = computed(
  () => categoryIcons.find((item) => item.id === icon.value)?.label,
);
onBeforeRouteLeave(() => {
  if (busy.value) return false;
  if (iconDialog.value?.open) {
    iconDialog.value.close();
    return false;
  }
  if (
    !committed.value &&
    initial !== JSON.stringify([name.value, icon.value, color.value])
  )
    return window.confirm("Выйти без сохранения категории?");
});
async function chooseIcon() {
  await nextTick();
  iconDialog.value?.showModal();
}
async function save(archived = original?.archived ?? false) {
  if (busy.value) return;
  error.value = "";
  busy.value = true;
  try {
    await store.saveCategory({
      id: original?.id ?? crypto.randomUUID(),
      name: name.value.trim(),
      normalizedName: normalizeName(name.value),
      icon: icon.value,
      color: color.value,
      archived,
      order:
        original?.order ??
        Math.max(-1, ...store.categories.map((item) => item.order)) + 1,
    });
    committed.value = true;
    busy.value = false;
    await router.replace("/settings/categories");
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "Не удалось сохранить категорию. Повторите попытку.";
    archiving.value = false;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="editor-page category-editor">
    <header class="editor-toolbar">
      <RouterLink
        to="/settings/categories"
        class="icon-button"
        aria-label="Назад к категориям"
        ><Icon name="back"
      /></RouterLink>
      <h1>{{ original ? "Изменить категорию" : "Новая категория" }}</h1>
    </header>
    <div v-if="missing" class="empty-state"><h2>Категория не найдена</h2></div>
    <form v-else @submit.prevent="save()">
      <fieldset :disabled="busy">
        <button
          class="category-preview"
          type="button"
          :style="{ background: color }"
          :aria-label="`Изменить иконку: ${iconLabel}`"
          @click="chooseIcon"
        >
          <Icon :name="icon" />
        </button>
        <p class="preview-hint">Нажмите, чтобы выбрать иконку</p>
        <label class="named-field"
          ><span>Название категории</span
          ><input
            v-model="name"
            aria-label="Название категории"
            maxlength="60"
            placeholder="Например, Питомцы"
            required
        /></label>
        <div class="field-heading">Цвет категории</div>
        <div class="color-grid" role="group" aria-label="Цвет категории">
          <button
            v-for="(value, index) in palette"
            :key="value"
            type="button"
            class="color-swatch"
            :style="{ background: value }"
            :aria-label="`Цвет ${index + 1}`"
            :aria-pressed="color === value"
            @click="color = value"
          >
            <Icon v-if="color === value" name="check" />
          </button>
        </div>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <div class="category-save-actions">
          <button
            v-if="original"
            type="button"
            class="text-button archive-action"
            @click="original.archived ? save(false) : (archiving = true)"
          >
            <Icon :name="original.archived ? 'restore' : 'archive'" />{{
              original.archived ? "Восстановить" : "В архив"
            }}</button
          ><button
            type="submit"
            class="fab inline-fab"
            aria-label="Сохранить категорию"
          >
            <Icon name="check" />
          </button>
        </div>
      </fieldset>
    </form>
    <dialog
      ref="iconDialog"
      class="icon-dialog"
      aria-labelledby="icons-title"
      @cancel.prevent="iconDialog?.close()"
    >
      <header>
        <h2 id="icons-title">Изменить иконку</h2>
        <button
          class="icon-button"
          aria-label="Закрыть выбор иконки"
          @click="iconDialog?.close()"
        >
          <Icon name="close" />
        </button>
      </header>
      <div class="icon-grid" :style="{ color }">
        <button
          v-for="item in categoryIcons"
          :key="item.id"
          type="button"
          :aria-label="item.label"
          :aria-pressed="icon === item.id"
          :class="{ active: icon === item.id }"
          @click="
            icon = item.id;
            iconDialog?.close();
          "
        >
          <Icon :name="item.id" />
        </button>
      </div>
    </dialog>
    <ConfirmDialog
      v-if="archiving"
      title="Переместить в архив?"
      description="Категория останется в истории и статистике. Для новых расходов она будет скрыта. Её можно восстановить в любое время."
      action="В архив"
      :busy="busy"
      @close="archiving = false"
      @confirm="save(true)"
    />
  </main>
</template>
