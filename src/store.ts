import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import type { Category, Expense, Theme } from "./domain";
import { today } from "./domain";
import { createRepository } from "./storage/repository";
import type { Repository } from "./storage/repository";

export const useExpenses = defineStore("expenses", () => {
  const repository = shallowRef<Repository>();
  const expenses = ref<Expense[]>([]);
  const categories = ref<Category[]>([]);
  const theme = ref<Theme>("light");
  const ready = ref(false);
  const error = ref("");
  const selectedMonth = ref(today().slice(0, 7));
  const historyCategoryIds = ref<string[]>([]);
  const expanded = ref<Record<string, boolean>>({});
  const activeCategories = computed(() =>
    categories.value
      .filter((item) => !item.archived)
      .sort((a, b) => a.order - b.order),
  );
  function category(id: string | null) {
    return categories.value.find((item) => item.id === id);
  }
  async function init() {
    error.value = "";
    try {
      // Неудачное открытие могло не создать соединение. Закрытие не должно мешать повтору.
      if (repository.value) await repository.value.close().catch(() => {});
      repository.value = await createRepository();
      await repository.value.init();
      const [savedExpenses, savedCategories, savedTheme] = await Promise.all([
        repository.value.expenses(),
        repository.value.categories(),
        repository.value.theme(),
      ]);
      expenses.value = savedExpenses;
      categories.value = savedCategories;
      theme.value = savedTheme;
      ready.value = true;
    } catch {
      error.value =
        "Не удалось открыть данные. Проверьте доступное место и разрешение браузера на хранение данных.";
    }
  }
  function db() {
    if (!repository.value) throw new Error("Хранилище ещё не готово.");
    return repository.value;
  }
  async function saveExpense(value: Expense) {
    await db().putExpense(value);
    const index = expenses.value.findIndex((item) => item.id === value.id);
    if (index < 0) expenses.value.push(value);
    else expenses.value[index] = value;
  }
  async function removeExpense(id: string) {
    await db().deleteExpense(id);
    expenses.value = expenses.value.filter((item) => item.id !== id);
  }
  async function saveCategory(value: Category) {
    await db().putCategory(value);
    const index = categories.value.findIndex((item) => item.id === value.id);
    if (index < 0) categories.value.push(value);
    else categories.value[index] = value;
  }
  async function setTheme(value: Theme) {
    await db().setTheme(value);
    theme.value = value;
  }
  return {
    expenses,
    categories,
    theme,
    ready,
    error,
    selectedMonth,
    historyCategoryIds,
    expanded,
    activeCategories,
    category,
    init,
    saveExpense,
    removeExpense,
    saveCategory,
    setTheme,
  };
});
