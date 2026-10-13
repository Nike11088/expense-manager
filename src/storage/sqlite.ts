import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { initialCategories } from "../domain";
import type { Category, Expense, Theme } from "../domain";
import { cleanCategory, validateExpense } from "./repository";
import type { Repository } from "./repository";

export class SqliteRepository implements Repository {
  constructor(private readonly database = "expenses") {}
  private connection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  async init() {
    const database = this.database;
    await this.connection.addUpgradeStatement(database, [
      {
        toVersion: 1,
        statements: [
          'CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, normalizedName TEXT NOT NULL UNIQUE, icon TEXT NOT NULL, color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, "order" INTEGER NOT NULL);',
          "CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), date TEXT NOT NULL, categoryId TEXT REFERENCES categories(id), note TEXT NOT NULL, createdAt INTEGER NOT NULL);",
          "CREATE INDEX IF NOT EXISTS expense_date ON expenses(date);",
          "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
        ],
      },
    ]);
    await this.connection.checkConnectionsConsistency();
    this.db = (await this.connection.isConnection(database, false)).result
      ? await this.connection.retrieveConnection(database, false)
      : await this.connection.createConnection(
          database,
          false,
          "no-encryption",
          1,
          false,
        );
    await this.db.open();
    await this.db.execute("PRAGMA foreign_keys = ON;", false);
    if (
      !(await this.db.query("SELECT value FROM settings WHERE key = 'seeded';"))
        .values?.length
    ) {
      await this.db.executeSet([
        ...initialCategories.map((category) => ({
          statement:
            'INSERT INTO categories (id,name,normalizedName,icon,color,archived,"order") VALUES (?,?,?,?,?,?,?);',
          values: [
            category.id,
            category.name,
            category.normalizedName,
            category.icon,
            category.color,
            0,
            category.order,
          ],
        })),
        {
          statement: "INSERT INTO settings (key,value) VALUES (?,?);",
          values: ["theme", "light"],
        },
        {
          statement: "INSERT INTO settings (key,value) VALUES (?,?);",
          values: ["seeded", "1"],
        },
      ]);
    }
  }
  async expenses(): Promise<Expense[]> {
    return (await this.db.query("SELECT * FROM expenses;")).values ?? [];
  }
  async categories(): Promise<Category[]> {
    return (
      (await this.db.query("SELECT * FROM categories;")).values ?? []
    ).map((value) => ({
      ...value,
      archived: Boolean(value.archived),
    })) as Category[];
  }
  async putExpense(value: Expense) {
    validateExpense(value);
    if (value.categoryId) {
      const category = (
        await this.db.query("SELECT archived FROM categories WHERE id = ?;", [
          value.categoryId,
        ])
      ).values?.[0];
      const existing = (
        await this.db.query("SELECT categoryId FROM expenses WHERE id = ?;", [
          value.id,
        ])
      ).values?.[0];
      if (
        !category ||
        (category.archived && existing?.categoryId !== value.categoryId)
      )
        throw new Error("Эта категория недоступна. Выберите другую.");
    }
    await this.db.run(
      "INSERT INTO expenses (id,amount,date,categoryId,note,createdAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,date=excluded.date,categoryId=excluded.categoryId,note=excluded.note;",
      [
        value.id,
        value.amount,
        value.date,
        value.categoryId,
        value.note,
        value.createdAt,
      ],
    );
  }
  async deleteExpense(id: string) {
    await this.db.run("DELETE FROM expenses WHERE id = ?;", [id]);
  }
  async putCategory(value: Category) {
    const category = cleanCategory(value);
    const duplicate = (
      await this.db.query(
        "SELECT id FROM categories WHERE normalizedName = ? AND id != ?;",
        [category.normalizedName, category.id],
      )
    ).values?.length;
    if (duplicate)
      throw new Error(
        "Категория с таким названием уже существует, в том числе в архиве.",
      );
    await this.db.run(
      'INSERT INTO categories (id,name,normalizedName,icon,color,archived,"order") VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,normalizedName=excluded.normalizedName,icon=excluded.icon,color=excluded.color,archived=excluded.archived;',
      [
        category.id,
        category.name,
        category.normalizedName,
        category.icon,
        category.color,
        Number(category.archived),
        category.order,
      ],
    );
  }
  async theme(): Promise<Theme> {
    return (
      await this.db.query("SELECT value FROM settings WHERE key = 'theme';")
    ).values?.[0]?.value === "dark"
      ? "dark"
      : "light";
  }
  async setTheme(value: Theme) {
    await this.db.run(
      "INSERT INTO settings(key,value) VALUES('theme',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value;",
      [value],
    );
  }
  async close() {
    await this.connection.closeConnection(this.database, false);
  }
}
