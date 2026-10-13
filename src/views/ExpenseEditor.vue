<script setup lang="ts">
import { computed, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useExpenses } from "../store";
import { money, parseAmount, today } from "../domain";
import Icon from "../components/Icon.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const store = useExpenses();
const route = useRoute();
const router = useRouter();
const original = store.expenses.find((item) => item.id === route.params.id);
const missing = route.params.id !== "new" && !original;
const amount = ref(
  original ? (original.amount / 100).toFixed(2).replace(".", ",") : "",
);
const categoryId = ref<string | null>(original?.categoryId ?? null);
const date = ref(original?.date ?? today());
const note = ref(original?.note ?? "");
const error = ref("");
const busy = ref(false);
const deleting = ref(false);
const committed = ref(false);
const back =
  typeof route.query.from === "string" &&
  ["/overview", "/history"].includes(route.query.from)
    ? route.query.from
    : "/overview";
const initial = JSON.stringify([
  amount.value,
  categoryId.value,
  date.value,
  note.value,
]);
const choices = computed(() =>
  store.categories
    .filter((item) => !item.archived || item.id === original?.categoryId)
    .sort((a, b) => a.order - b.order),
);
onBeforeRouteLeave(() => {
  if (busy.value) return false;
  if (
    !committed.value &&
    initial !==
      JSON.stringify([amount.value, categoryId.value, date.value, note.value])
  )
    return window.confirm("Выйти без сохранения расхода?");
});
async function save() {
  if (busy.value) return;
  error.value = "";
  busy.value = true;
  try {
    await store.saveExpense({
      id: original?.id ?? crypto.randomUUID(),
      amount: parseAmount(amount.value),
      categoryId: categoryId.value,
      date: date.value,
      note: note.value.trim(),
      createdAt: original?.createdAt ?? Date.now(),
    });
    committed.value = true;
    if (!original) store.selectedMonth = date.value.slice(0, 7);
    store.expanded[date.value.slice(0, 7)] = true;
    busy.value = false;
    await router.replace(back);
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "Не удалось сохранить расход. Повторите попытку.";
  } finally {
    busy.value = false;
  }
}
async function remove() {
  if (!original || busy.value) return;
  busy.value = true;
  try {
    await store.removeExpense(original.id);
    committed.value = true;
    busy.value = false;
    await router.replace(back);
  } catch {
    error.value = "Не удалось удалить расход. Повторите попытку.";
    deleting.value = false;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="editor-page">
    <header class="editor-toolbar">
      <RouterLink :to="back" class="icon-button" aria-label="Закрыть"
        ><Icon name="close"
      /></RouterLink>
      <h1>{{ original ? "Изменить расход" : "Новый расход" }}</h1>
      <button
        v-if="original"
        class="icon-button"
        aria-label="Удалить расход"
        :disabled="busy"
        @click="deleting = true"
      >
        <Icon name="delete" />
      </button>
    </header>
    <div v-if="missing" class="empty-state">
      <h2>Расход не найден</h2>
      <RouterLink :to="back" class="text-button">Вернуться</RouterLink>
    </div>
    <form v-else @submit.prevent="save">
      <fieldset :disabled="busy">
        <label class="amount-input"
          ><span>₽</span
          ><input
            v-model="amount"
            aria-label="Сумма"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            maxlength="12"
            autocomplete="off"
            required
        /></label>
        <div class="field-heading">Категория</div>
        <div class="category-grid">
          <button
            v-for="category in choices"
            :key="category.id"
            type="button"
            class="category-tile"
            :class="{ active: categoryId === category.id }"
            :style="{ '--category-color': category.color }"
            :aria-pressed="categoryId === category.id"
            @click="categoryId = category.id"
          >
            <Icon :name="category.icon" /><span
              >{{ category.name
              }}{{ category.archived ? " · архив" : "" }}</span
            >
          </button>
        </div>
        <button
          type="button"
          class="uncategorized-button"
          :class="{ active: categoryId === null }"
          :aria-pressed="categoryId === null"
          @click="categoryId = null"
        >
          <Icon :name="categoryId === null ? 'check' : 'uncategorized'" />Без
          категории
        </button>
        <div class="field-heading details-heading">Подробности</div>
        <label class="detail-field"
          ><Icon name="calendar" /><span class="sr-only">Дата</span
          ><input
            v-model="date"
            type="date"
            aria-label="Дата"
            min="1900-01-01"
            max="9999-12-31"
            required
        /></label>
        <label class="detail-field"
          ><Icon name="note" /><span class="sr-only">Примечание</span
          ><input
            v-model="note"
            type="text"
            aria-label="Примечание"
            placeholder="Примечание"
            maxlength="500"
        /></label>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <div class="save-row">
          <span v-if="busy" class="muted" role="status">Сохраняем…</span
          ><button
            class="fab inline-fab"
            type="submit"
            aria-label="Сохранить расход"
          >
            <Icon name="check" />
          </button>
        </div>
      </fieldset>
    </form>
    <ConfirmDialog
      v-if="deleting && original"
      title="Удалить расход?"
      :description="`Запись на ${money(original.amount)} ₽ будет удалена. Отменить это действие нельзя.`"
      action="Удалить"
      :busy="busy"
      @close="deleting = false"
      @confirm="remove"
    />
  </main>
</template>
