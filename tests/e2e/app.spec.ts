import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { today } from "../../src/domain";

async function addExpense(
  page: Page,
  amount: string,
  category: string,
  date: string,
  note: string,
) {
  await page
    .getByRole("link", { name: "Добавить расход", exact: true })
    .last()
    .click();
  await page.getByRole("textbox", { name: "Сумма" }).fill(amount);
  await page.getByRole("button", { name: category, exact: true }).click();
  await page.getByLabel("Дата", { exact: true }).fill(date);
  await page.getByRole("textbox", { name: "Примечание" }).fill(note);
  await page.getByRole("button", { name: "Сохранить расход" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
}
test("общий фильтр всех месяцев, исправление и удаление расходов", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("overview-total")).toContainText("0,00");
  await addExpense(page, "120,10", "Еда и напитки", "2026-09-30", "Сентябрь");
  await addExpense(
    page,
    "50",
    "Транспорт",
    "2026-09-29",
    "Сентябрьский проезд",
  );
  await addExpense(page, "0,20", "Еда и напитки", "2026-10-01", "Копейки");
  await addExpense(page, "350", "Транспорт", "2026-10-08", "Автобус");
  await expect(page.getByTestId("overview-total")).toContainText("350,20");
  await page.getByRole("link", { name: "История", exact: true }).click();
  const october = page.locator('[data-month="2026-10"]');
  const filterButton = page.getByRole("button", { name: "Фильтр истории" });
  await expect(filterButton).toHaveCount(1);
  await expect(page.locator(".month-section .filter-button")).toHaveCount(0);
  await filterButton.click();
  await page.getByRole("checkbox", { name: "Еда и напитки" }).check();
  await expect(october.getByText("Копейки", { exact: true })).toBeVisible();
  await expect(october.getByText("Автобус", { exact: true })).toBeHidden();
  const september = page.locator('[data-month="2026-09"]');
  await expect(october.locator(".month-toggle strong")).toHaveText("0,20 ₽");
  await expect(september.locator(".month-toggle strong")).toHaveText(
    "120,10 ₽",
  );
  await expect(september.getByText("Сентябрь", { exact: true })).toBeVisible();
  await expect(
    september.getByText("Сентябрьский проезд", { exact: true }),
  ).toBeHidden();
  await page.getByRole("checkbox", { name: "Транспорт" }).check();
  await expect(october.getByText("Автобус", { exact: true })).toBeVisible();
  await expect(
    september.getByText("Сентябрьский проезд", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Транспорт" }).uncheck();
  await filterButton.click();
  await expect(page.locator("#history-filter")).toBeHidden();
  await expect(october.getByText("Автобус", { exact: true })).toBeHidden();
  await october.getByText("Копейки", { exact: true }).click();
  await page.getByRole("textbox", { name: "Сумма" }).fill("20,30");
  await page.getByLabel("Дата", { exact: true }).fill("2026-09-29");
  await page.getByRole("button", { name: "Сохранить расход" }).click();
  await expect(
    october.getByText("Ничего не найдено.", { exact: false }),
  ).toBeVisible();
  await expect(september.getByText("Копейки", { exact: true })).toBeVisible();
  await september.getByText("Копейки", { exact: true }).click();
  await page.getByRole("button", { name: "Удалить расход" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "История" })).toBeVisible();
  await expect(page.getByText("Копейки", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Фильтр истории" }).click();
  await page.getByRole("button", { name: "Сбросить" }).click();
  await expect(october.getByText("Автобус", { exact: true })).toBeVisible();
  await expect(
    september.getByText("Сентябрьский проезд", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await page
    .locator(".distribution-row")
    .filter({ hasText: "Транспорт" })
    .click();
  await expect(september.getByText("Сентябрь", { exact: true })).toBeHidden();
  await expect(
    september.getByText("Сентябрьский проезд", { exact: true }),
  ).toBeVisible();
  await expect(october.locator(".month-toggle strong")).toHaveText("350,00 ₽");
  await page.reload();
  await expect(page.getByRole("heading", { name: "История" })).toBeVisible();
});
test("60 иконок, новая категория, дубликат, архив, восстановление, тема", async ({
  page,
}) => {
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Тёмная", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Управление категориями" }).click();
  await page.getByRole("link", { name: "Создать категорию" }).click();
  await page
    .getByRole("textbox", { name: "Название категории" })
    .fill("Питомцы");
  await page.getByRole("button", { name: /Изменить иконку/ }).click();
  await expect(page.locator(".icon-grid button")).toHaveCount(60);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Питомцы", exact: true })
    .click();
  await page.getByRole("button", { name: "Цвет 7", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить категорию" }).click();
  await page.getByRole("link", { name: "Питомцы", exact: true }).click();
  await page.getByRole("button", { name: "В архив", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "В архив", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Питомцы", exact: true }),
  ).toBeHidden();
  await page
    .getByRole("checkbox", { name: "Показать архивные категории" })
    .check();
  await page.getByRole("link", { name: "Питомцы В архиве" }).click();
  await page.getByRole("button", { name: "Восстановить" }).click();
  await expect(
    page.getByRole("link", { name: "Питомцы", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Создать категорию" }).click();
  await page
    .getByRole("textbox", { name: "Название категории" })
    .fill("  питомцы  ");
  await page.getByRole("button", { name: "Сохранить категорию" }).click();
  await expect(page.getByRole("alert")).toContainText("уже существует");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("сохранение после перезагрузки и работа открытого приложения без сети", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await addExpense(page, "1,23", "Без категории", today(), "Офлайн");
  await page.reload();
  await expect(page.getByTestId("overview-total")).toContainText("1,23");
  await context.setOffline(true);
  await addExpense(page, "4,56", "Покупки", today(), "Без сети");
  await expect(page.getByTestId("overview-total")).toContainText("5,79");
  await context.setOffline(false);
});
