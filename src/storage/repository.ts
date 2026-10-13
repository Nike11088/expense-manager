import { Capacitor } from "@capacitor/core";
import { normalizeName, validDate } from "../domain";
import type { Category, Expense, Theme } from "../domain";

export interface Repository {
  init(): Promise<void>;
  expenses(): Promise<Expense[]>;
  categories(): Promise<Category[]>;
  putExpense(value: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  putCategory(value: Category): Promise<void>;
  theme(): Promise<Theme>;
  setTheme(value: Theme): Promise<void>;
  close(): Promise<void>;
}
export function validateExpense(value: Expense) {
  if (
    !Number.isSafeInteger(value.amount) ||
    value.amount <= 0 ||
    value.amount > 99999999999
  )
    throw new Error("Недопустимая сумма расхода.");
  if (!validDate(value.date)) throw new Error("Укажите корректную дату.");
  if (!value.id || value.note.length > 500)
    throw new Error("Примечание должно быть не длиннее 500 символов.");
}
export function cleanCategory(value: Category): Category {
  const name = value.name.trim();
  if (!name || name.length > 60)
    throw new Error("Название должно содержать от 1 до 60 символов.");
  return { ...value, name, normalizedName: normalizeName(name) };
}
export async function createRepository(): Promise<Repository> {
  if (Capacitor.getPlatform() === "android") {
    const { SqliteRepository } = await import("./sqlite");
    return new SqliteRepository();
  }
  const { IndexedDbRepository } = await import("./indexeddb");
  return new IndexedDbRepository();
}
