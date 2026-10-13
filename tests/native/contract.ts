import { SqliteRepository } from "../../src/storage/sqlite";
import { initialCategories, inMonth, sum } from "../../src/domain";
import type { Expense } from "../../src/domain";

export async function runNativeChecks(): Promise<string> {
  const database = `contract_${Date.now()}`;
  let repository = new SqliteRepository(database);
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const rejects = async (action: () => Promise<void>) => {
    let rejected = false;
    try {
      await action();
    } catch {
      rejected = true;
    }
    assert(rejected, "Ожидался отказ от неверной записи");
  };
  await repository.init();
  try {
    assert((await repository.categories()).length === 6, "Начальные категории");
    const expense: Expense = {
      id: "native-contract",
      amount: 12345,
      date: "2026-10-08",
      categoryId: "food",
      note: "Тест SQLite",
      createdAt: 1,
    };
    await repository.putExpense(expense);
    await repository.setTheme("dark");
    await repository.putCategory({
      ...initialCategories[0],
      name: "Продукты",
      archived: true,
    });
    await repository.putExpense({ ...expense, amount: 10, date: "2026-09-30" });
    await rejects(() =>
      repository.putExpense({ ...expense, id: "bad-archive" }),
    );
    await rejects(() =>
      repository.putCategory({ ...initialCategories[1], name: "  ПРОДУКТЫ  " }),
    );
    await rejects(() =>
      repository.putExpense({ ...expense, categoryId: "missing" }),
    );
    await rejects(() => repository.putExpense({ ...expense, amount: 0.1 }));
    await rejects(() =>
      repository.putExpense({ ...expense, date: "2026-02-30" }),
    );
    await repository.close();
    repository = new SqliteRepository(database);
    await repository.init();
    assert(
      (await repository.theme()) === "dark",
      "Тема после повторного открытия",
    );
    const categories = await repository.categories();
    assert(
      categories.length === 6 &&
        categories.find((item) => item.id === "food")?.archived,
      "Сохранность категорий после открытия",
    );
    assert(
      sum(inMonth(await repository.expenses(), "2026-09")) === 10,
      "Сумма и изменение месяца",
    );
    await repository.putCategory({ ...initialCategories[0], name: "Продукты" });
    await repository.putExpense({
      ...expense,
      id: "restored",
      amount: 20,
      date: "2026-09-30",
    });
    assert(
      sum(await repository.expenses()) === 30,
      "Восстановленная категория",
    );
    await repository.deleteExpense(expense.id);
    assert((await repository.expenses()).length === 1, "Удаление расхода");
    return "PASS: SQLite seed, money, dates, archive, duplicates, validation, reopen, theme, restore, delete";
  } finally {
    await repository.close();
  }
}
