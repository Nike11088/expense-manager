import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IndexedDbRepository } from "../../src/storage/indexeddb";
import { initialCategories } from "../../src/domain";
import type { Expense } from "../../src/domain";

let repository: IndexedDbRepository;
let name: string;
const entry: Expense = {
  id: "expense-1",
  amount: 12345,
  date: "2026-10-08",
  categoryId: "food",
  note: "Обед",
  createdAt: 1,
};
beforeEach(async () => {
  name = crypto.randomUUID();
  repository = new IndexedDbRepository(name);
  await repository.init();
});
afterEach(async () => {
  await repository.close();
});
describe("Контракт локального хранилища", () => {
  it("сохраняет расходы, тему и категории при повторном открытии", async () => {
    await repository.putExpense(entry);
    await repository.setTheme("dark");
    await repository.putCategory({ ...initialCategories[0], name: "Продукты" });
    await repository.close();
    repository = new IndexedDbRepository(name);
    await repository.init();
    expect(await repository.expenses()).toEqual([entry]);
    expect(await repository.theme()).toBe("dark");
    expect(
      (await repository.categories()).find((item) => item.id === "food")?.name,
    ).toBe("Продукты");
    expect(await repository.categories()).toHaveLength(6);
  });
  it("позволяет менять дату, сумму и удалять расход", async () => {
    await repository.putExpense(entry);
    await repository.putExpense({ ...entry, amount: 1, date: "2026-09-30" });
    expect(await repository.expenses()).toEqual([
      { ...entry, amount: 1, date: "2026-09-30" },
    ]);
    await repository.deleteExpense(entry.id);
    expect(await repository.expenses()).toEqual([]);
  });
  it("не теряет историю при архивировании, запрещает новые расходы с архивной категорией", async () => {
    await repository.putExpense(entry);
    await repository.putCategory({ ...initialCategories[0], archived: true });
    await repository.putExpense({ ...entry, amount: 2 });
    await expect(
      repository.putExpense({ ...entry, id: "new" }),
    ).rejects.toThrow("недоступна");
    expect(await repository.expenses()).toHaveLength(1);
    await repository.putCategory(initialCategories[0]);
    await repository.putExpense({ ...entry, id: "new" });
    expect(await repository.expenses()).toHaveLength(2);
  });
  it("проверяет дубликаты названий, даже находящихся в архиве", async () => {
    await repository.putCategory({ ...initialCategories[0], archived: true });
    await expect(
      repository.putCategory({
        ...initialCategories[1],
        name: "  ЕДА И НАПИТКИ  ",
      }),
    ).rejects.toThrow("уже существует");
    expect(await repository.categories()).toHaveLength(6);
  });
  it("проверяет ссылки, дату и сумму до сохранения", async () => {
    await expect(
      repository.putExpense({ ...entry, categoryId: "missing" }),
    ).rejects.toThrow();
    await expect(
      repository.putExpense({ ...entry, date: "2026-02-30" }),
    ).rejects.toThrow();
    await expect(
      repository.putExpense({ ...entry, amount: 0.1 }),
    ).rejects.toThrow();
    expect(await repository.expenses()).toEqual([]);
  });
});
