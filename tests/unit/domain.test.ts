import { describe, expect, it } from "vitest";
import {
  distribution,
  inMonth,
  money,
  parseAmount,
  sum,
  validDate,
} from "../../src/domain";
import type { Expense } from "../../src/domain";
const expense = (
  id: string,
  amount: number,
  date: string,
  categoryId: string | null,
): Expense => ({
  id,
  amount,
  date,
  categoryId,
  createdAt: Number(id),
  note: "",
});
describe("Деньги и календарные даты", () => {
  it("считает копейки без накопления ошибок дробной арифметики", () => {
    expect(parseAmount("0,10") + parseAmount("0.20")).toBe(30);
    expect(parseAmount("1250,5")).toBe(125050);
    expect(money(125050)).toMatch(/1\s250,50/);
  });
  it.each([
    "0",
    "-1",
    "1,001",
    "NaN",
    "Infinity",
    "1e3",
    "1.2.3",
    "",
    "1000000000",
  ])("отклоняет неверную сумму %s", (value) =>
    expect(() => parseAmount(value)).toThrow(),
  );
  it("отличает високосный день от недопустимой даты", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2026-04-31")).toBe(false);
    expect(validDate("2026-12-31")).toBe(true);
  });
});
describe("История и обзор", () => {
  const items = [
    expense("1", 10, "2026-09-30", "food"),
    expense("2", 20, "2026-10-01", "food"),
    expense("3", 300, "2026-10-31", "car"),
    expense("4", 40, "2026-10-31", null),
  ];
  it("фильтрует в границах месяца и объединяет категории через ИЛИ", () => {
    expect(
      inMonth(items, "2026-10", ["food", "uncategorized"]).map(
        (item) => item.id,
      ),
    ).toEqual(["4", "2"]);
    expect(sum(inMonth(items, "2026-09"))).toBe(10);
    expect(inMonth(items, "2026-11")).toEqual([]);
  });
  it("сумма распределения совпадает с итогом месяца", () => {
    const month = inMonth(items, "2026-10");
    const groups = distribution(month);
    expect(groups[0]).toEqual({ categoryId: "car", amount: 300 });
    expect(groups.reduce((total, item) => total + item.amount, 0)).toBe(
      sum(month),
    );
  });
  it("не допускает неточный итог при переполнении", () => {
    expect(() =>
      sum([
        expense("1", Number.MAX_SAFE_INTEGER, "2026-10-01", null),
        expense("2", 1, "2026-10-01", null),
      ]),
    ).toThrow();
  });
});
