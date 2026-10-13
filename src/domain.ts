export type Theme = "light" | "dark";
export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string | null;
  note: string;
  createdAt: number;
}
export interface Category {
  id: string;
  name: string;
  normalizedName: string;
  icon: string;
  color: string;
  archived: boolean;
  order: number;
}
export const palette = [
  "#8bc34a",
  "#03a9f4",
  "#ff9800",
  "#f44336",
  "#9c27b0",
  "#9e9e9e",
  "#e91e63",
  "#009688",
  "#3f51b5",
  "#795548",
  "#607d8b",
  "#ffc107",
];
export const initialCategories: Category[] = [
  ["food", "Еда и напитки", "silverware", palette[0]],
  ["leisure", "Досуг", "emoticon", palette[1]],
  ["transport", "Транспорт", "bike", palette[2]],
  ["health", "Здоровье", "medical", palette[3]],
  ["shopping", "Покупки", "cart", palette[4]],
  ["utilities", "Коммунальные услуги", "wrench", palette[5]],
].map(([id, name, icon, color], order) => ({
  id,
  name,
  normalizedName: normalizeName(name),
  icon,
  color,
  archived: false,
  order,
}));

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("ru-RU");
}
export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
export function parseAmount(input: string): number {
  const value = input.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Введите сумму до 999 999 999,99 ₽, не больше двух знаков после запятой.",
    );
  const [rubles, pennies = ""] = value.split(".");
  const amount = Number(rubles) * 100 + Number(pennies.padEnd(2, "0"));
  if (amount <= 0) throw new Error("Сумма должна быть больше нуля.");
  return amount;
}
export function money(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
export function monthTitle(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, number - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1).replace(" г.", "");
}
export function dateTitle(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(new Date(year, month - 1, day));
}
export function sum(expenses: Expense[]): number {
  const total = expenses.reduce((value, expense) => value + expense.amount, 0);
  if (!Number.isSafeInteger(total))
    throw new Error("Сумма превышает допустимый предел.");
  return total;
}
export function sortedExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt - a.createdAt ||
      b.id.localeCompare(a.id),
  );
}
export function inMonth(
  expenses: Expense[],
  month: string,
  categories: string[] = [],
): Expense[] {
  return sortedExpenses(
    expenses.filter(
      (item) =>
        item.date.slice(0, 7) === month &&
        (!categories.length ||
          categories.includes(item.categoryId ?? "uncategorized")),
    ),
  );
}
export function distribution(
  expenses: Expense[],
): { categoryId: string | null; amount: number }[] {
  const groups = new Map<string | null, Expense[]>();
  expenses.forEach((item) =>
    groups.set(item.categoryId, [...(groups.get(item.categoryId) ?? []), item]),
  );
  return [...groups]
    .map(([categoryId, items]) => ({ categoryId, amount: sum(items) }))
    .sort((a, b) => b.amount - a.amount);
}
