<script setup lang="ts">
import { computed, ref } from "vue";
import { useExpenses } from "../store";
import { dateTitle, inMonth, money, monthTitle, sum, today } from "../domain";
import Icon from "../components/Icon.vue";
import CategoryBadge from "../components/CategoryBadge.vue";

const store = useExpenses();
const filterOpen = ref(false);
const months = computed(() =>
  [
    ...new Set([
      today().slice(0, 7),
      ...store.expenses.map((item) => item.date.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse(),
);
function isOpen(month: string) {
  return store.expanded[month] ?? month === months.value[0];
}
const choices = computed(() => {
  const ids = new Set(
    store.expenses.map((item) => item.categoryId ?? "uncategorized"),
  );
  for (const id of store.historyCategoryIds) ids.add(id);
  return [...ids].map((id) => ({
    id,
    name: store.category(id)?.name ?? "Без категории",
    category: store.category(id),
  }));
});
function toggle(id: string) {
  const selected = store.historyCategoryIds;
  store.historyCategoryIds = selected.includes(id)
    ? selected.filter((item) => item !== id)
    : [...selected, id];
}
</script>
<template>
  <main class="page history-page">
    <header class="page-heading history-heading">
      <div>
        <h1>История</h1>
        <span class="muted">{{
          store.historyCategoryIds.length
            ? `Выбрано категорий: ${store.historyCategoryIds.length} · Все месяцы`
            : "Расходы по месяцам"
        }}</span>
      </div>
      <button
        class="icon-button filter-button"
        :class="{ selected: store.historyCategoryIds.length }"
        aria-label="Фильтр истории"
        aria-controls="history-filter"
        :aria-expanded="filterOpen"
        @click="filterOpen = !filterOpen"
      >
        <Icon name="filter" />
        <span v-if="store.historyCategoryIds.length" class="filter-dot" />
      </button>
    </header>
    <div v-if="filterOpen" id="history-filter" class="filter-panel">
      <div class="filter-top">
        <span>Категории во всех месяцах</span>
        <button class="text-button" @click="store.historyCategoryIds = []">
          Сбросить
        </button>
      </div>
      <div class="filter-options">
        <label
          v-for="choice in choices"
          :key="choice.id"
          class="filter-chip"
          :class="{ checked: store.historyCategoryIds.includes(choice.id) }"
        >
          <input
            type="checkbox"
            :checked="store.historyCategoryIds.includes(choice.id)"
            @change="toggle(choice.id)"
          />
          <Icon :name="choice.category?.icon ?? 'uncategorized'" />
          <span>{{ choice.name }}</span>
        </label>
        <p v-if="!choices.length" class="muted">
          В истории пока нет категорий с расходами.
        </p>
      </div>
    </div>
    <section
      v-for="month in months"
      :key="month"
      class="month-section"
      :data-month="month"
    >
      <div class="month-header">
        <button
          class="month-toggle"
          :aria-expanded="isOpen(month)"
          @click="store.expanded[month] = !isOpen(month)"
        >
          <Icon :name="isOpen(month) ? 'down' : 'right'" /><span>{{
            monthTitle(month)
          }}</span
          ><strong
            >{{
              money(
                sum(inMonth(store.expenses, month, store.historyCategoryIds)),
              )
            }}
            ₽</strong
          >
        </button>
      </div>
      <template v-if="isOpen(month)">
        <div v-if="store.historyCategoryIds.length" class="filtered-total">
          <span>Всего за месяц</span
          ><strong>{{ money(sum(inMonth(store.expenses, month))) }} ₽</strong>
        </div>
        <RouterLink
          v-for="expense in inMonth(
            store.expenses,
            month,
            store.historyCategoryIds,
          )"
          :key="expense.id"
          :to="`/expense/${expense.id}?from=/history`"
          class="expense-row"
          ><CategoryBadge :category="store.category(expense.categoryId)" />
          <div class="expense-detail">
            <span class="expense-name">{{
              store.category(expense.categoryId)?.name ?? "Без категории"
            }}</span
            ><span v-if="expense.note" class="expense-note">{{
              expense.note
            }}</span
            ><time :datetime="expense.date">{{ dateTitle(expense.date) }}</time>
          </div>
          <span class="amount">{{ money(expense.amount) }} ₽</span></RouterLink
        >
        <p
          v-if="
            !inMonth(store.expenses, month, store.historyCategoryIds).length
          "
          class="month-empty"
        >
          {{
            store.historyCategoryIds.length
              ? "Ничего не найдено. Попробуйте другие категории."
              : "В этом месяце пока нет расходов."
          }}
        </p>
      </template>
    </section>
    <RouterLink
      class="fab"
      to="/expense/new?from=/history"
      aria-label="Добавить расход"
      ><Icon name="plus"
    /></RouterLink>
  </main>
</template>
