import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  from: varchar({ length: 255 }).notNull(),
  to: varchar({ length: 255 }).notNull(),
  amount: integer().notNull(),
});
