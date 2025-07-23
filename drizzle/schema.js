import { relations, sql } from "drizzle-orm";
import { boolean, mysqlEnum, text, timestamp } from "drizzle-orm/mysql-core";
import {int, mysqlTable, varchar} from "drizzle-orm/mysql-core"

export const shortLinksTable = mysqlTable("short_link", {
  id: int().autoincrement().primaryKey(),
  url: varchar({ length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  userId: int("user_id").notNull().references(() => usersRegistration.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),         //! foreign key
});

export const sessionsTable = mysqlTable("sessions", {
id: int().autoincrement().primaryKey(),
userId: int("user_id").notNull().references(() => usersRegistration.id,{onDelete: "cascade"}),
valid: boolean().default(true).notNull(),
userAgent:text("user_agent"),
ip:varchar({length: 255}),
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

export const verifyEmailTokensTable = mysqlTable("is_email_valid", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersRegistration.id, {onDelete: "cascade"}),
  token: varchar({length:8}).notNull(),
  expiresAt: timestamp("expires_at").default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 DAY)`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const passwordResetTokenTable = mysqlTable("password_reset_tokens", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersRegistration.id, {onDelete: "cascade"}).unique(),
  tokenHash: text("token_hash").notNull(),
 expiresAt: timestamp("expires_at").default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 HOUR)`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), 
})

export const oauthAccountsTable = mysqlTable("oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersRegistration.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google", "github"]).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRegistration = mysqlTable("users_register", {
  id: int().autoincrement().primaryKey(),                                 //! primary key
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({length:255}),
  avatarUrl: text("avatar_url"),
  isEmailValid: boolean("is_email_valid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const usersRelation = relations(usersRegistration, ({many}) => ({
shortLink: many(shortLinksTable),
session: many(sessionsTable),
}) )

export const shortRelation = relations(shortLinksTable, ({one}) => ({
user: one(usersRegistration, {
  fields: [shortLinksTable.userId],
  references: [usersRegistration.id],
})
}))

export const sessionRelation = relations(sessionsTable, ({one}) => ({
user: one(usersRegistration, {
fields: [sessionsTable.userId],
references: [usersRegistration.id],
})
}))