import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import { initialCategories } from "../domain";
import type { Category, Expense, Theme } from "../domain";
import { cleanCategory, validateExpense } from "./repository";
import type { Repository } from "./repository";

interface ExpenseDb extends DBSchema {
  expenses: { key: string; value: Expense; indexes: { date: string } };
  categories: {
    key: string;
    value: Category;
    indexes: { normalizedName: string };
  };
  settings: { key: string; value: string };
}
export class IndexedDbRepository implements Repository {
  private db!: IDBPDatabase<ExpenseDb>;
  constructor(private readonly name = "expense-manager") {}
  async init() {
    this.db = await openDB<ExpenseDb>(this.name, 1, {
      upgrade(db) {
        db.createObjectStore("expenses", { keyPath: "id" }).createIndex(
          "date",
          "date",
        );
        db.createObjectStore("categories", { keyPath: "id" }).createIndex(
          "normalizedName",
          "normalizedName",
          { unique: true },
        );
        db.createObjectStore("settings");
      },
      blocking: () => this.db.close(),
    });
    const tx = this.db.transaction(["settings", "categories"], "readwrite");
    const settings = tx.objectStore("settings");
    if (!(await settings.get("seeded"))) {
      for (const category of initialCategories)
        await tx.objectStore("categories").put(category);
      await settings.put("light", "theme");
      await settings.put("1", "seeded");
    }
    await tx.done;
  }
  expenses() {
    return this.db.getAll("expenses");
  }
  categories() {
    return this.db.getAll("categories");
  }
  async putExpense(value: Expense) {
    validateExpense(value);
    const tx = this.db.transaction(["expenses", "categories"], "readwrite");
    const existing = await tx.objectStore("expenses").get(value.id);
    if (value.categoryId) {
      const category = await tx.objectStore("categories").get(value.categoryId);
      if (
        !category ||
        (category.archived && existing?.categoryId !== category.id)
      ) {
        await tx.done;
        throw new Error("Эта категория недоступна. Выберите другую.");
      }
    }
    await tx.objectStore("expenses").put(value);
    await tx.done;
  }
  async deleteExpense(id: string) {
    await this.db.delete("expenses", id);
  }
  async putCategory(value: Category) {
    const category = cleanCategory(value);
    try {
      await this.db.put("categories", category);
    } catch (error) {
      if (error instanceof Error && error.name === "ConstraintError")
        throw new Error(
          "Категория с таким названием уже существует, в том числе в архиве.",
        );
      throw error;
    }
  }
  async theme(): Promise<Theme> {
    return (await this.db.get("settings", "theme")) === "dark"
      ? "dark"
      : "light";
  }
  async setTheme(value: Theme) {
    await this.db.put("settings", value, "theme");
  }
  async close() {
    this.db.close();
  }
}
