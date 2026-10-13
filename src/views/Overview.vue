<script setup lang="ts">
import { computed } from "vue";
import { useExpenses } from "../store";
import { distribution, inMonth, money, monthTitle, sum } from "../domain";
import Icon from "../components/Icon.vue";
import CategoryBadge from "../components/CategoryBadge.vue";

const store = useExpenses();
const items = computed(() => inMonth(store.expenses, store.selectedMonth));
const groups = computed(() => distribution(items.value));
const total = computed(() => sum(items.value));
const monthValue = computed({
  get: () => store.selectedMonth,
  set: (value: string) => {
    if (/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value))
      store.selectedMonth = value;
  },
});
function shiftMonth(delta: number) {
  const [year, month] = store.selectedMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
  store.selectedMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
</script>
<template>
  <main class="page overview">
    <header class="overview-heading">
      <span class="eyebrow">Расходы за месяц</span>
      <h1 class="total" data-testid="overview-total">
        {{ money(total) }} <small>₽</small>
      </h1>
      <div class="month-selector">
        <button
          class="icon-button"
          aria-label="Предыдущий месяц"
          @click="shiftMonth(-1)"
        >
          <Icon name="left" />
        </button>
        <label class="month-label"
          ><span>{{ monthTitle(store.selectedMonth) }}</span
          ><Icon name="down" /><input
            v-model="monthValue"
            type="month"
            min="1900-01"
            max="9999-12"
            aria-label="Месяц обзора"
            required
        /></label>
        <button
          class="icon-button"
          aria-label="Следующий месяц"
          @click="shiftMonth(1)"
        >
          <Icon name="right" />
        </button>
      </div>
    </header>
    <section
      v-if="groups.length"
      class="distribution"
      aria-label="Расходы по категориям"
    >
      <RouterLink
        v-for="group in groups"
        :key="group.categoryId ?? 'none'"
        class="distribution-row"
        to="/history"
        @click="
          store.expanded[store.selectedMonth] = true;
          store.historyCategoryIds = [group.categoryId ?? 'uncategorized'];
        "
      >
        <CategoryBadge :category="store.category(group.categoryId)" />
        <div class="distribution-detail">
          <div class="distribution-caption">
            <span>{{
              store.category(group.categoryId)?.name ?? "Без категории"
            }}</span
            ><span class="amount">{{ money(group.amount) }} ₽</span>
          </div>
          <div class="bar-track">
            <div
              class="bar"
              :style="{ width: `${(group.amount / groups[0].amount) * 100}%` }"
            />
          </div>
        </div>
      </RouterLink>
    </section>
    <section v-else class="empty-state">
      <span class="empty-icon"><Icon name="chart" /></span>
      <h2>Здесь начнётся ваш месяц</h2>
      <p>Добавьте первый расход — и увидите,<br />на что уходят деньги.</p>
      <RouterLink class="text-button" to="/expense/new?from=/overview"
        >Добавить расход</RouterLink
      >
    </section>
    <RouterLink
      class="fab"
      to="/expense/new?from=/overview"
      aria-label="Добавить расход"
      ><Icon name="plus"
    /></RouterLink>
  </main>
</template>
