/**
 * @file db/schema.ts
 * @module #db/schema
 * This file defines the database's schema using the Drizzle ORM.
 * It includes tables for posts, games, videos, and user auth, along with their relations and constraints.
 * Triggers should be managed using Raw SQL.
 */
import { relations } from "drizzle-orm";
import {
  pgTable,
  integer,
  varchar,
  text,
  boolean,
  numeric,
  date,
  timestamp,
  unique,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import z from "zod";
import { shapes } from "@znko/types";

type ProcessingStatus = z.infer<typeof shapes.jobs.processingStatus>;
export const status = pgEnum("status", [
  "pending",
  "processing",
  "ready",
  "failed",
] as [ProcessingStatus, ...ProcessingStatus[]]);

/**
 * @name Posts
 * Table for user posts, linked to a user. Each post can have multiple media items linked to it.
 */
export const posts = pgTable(
  "posts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uploaderId: integer("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nanoid: varchar("nanoid", { length: 21 }).unique().notNull(),
    content: text("content").notNull(),
    rating: numeric("rating", { precision: 3, scale: 1 }),
    pinned: boolean("pinned").notNull().default(false),
    public: boolean("public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("posts_rating_check", sql`${t.rating} >= 0 AND ${t.rating} <= 10`),
  ],
);

// Media linked to posts, such as images, videos, etc.
export const postMedia = pgTable("post_media", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const postsRelations = relations(posts, ({ many, one }) => ({
  postMedia: many(postMedia),
  user: one(users, { fields: [posts.uploaderId], references: [users.id] }),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, { fields: [postMedia.postId], references: [posts.id] }),
}));

/**
 * @name Games
 * Games table, used to organize videos and display games that the owner plays.
 */
export const games = pgTable(
  "games",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uploaderId: integer("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nanoid: varchar("nanoid", { length: 21 }).unique().notNull(),
    slug: text("slug").unique().notNull(),
    title: varchar("title", { length: 64 }).notNull(),
    description: text("description").notNull(),
    tags: text("tags").array(),
    launchDate: date("launch_date"),
    coverImgUrl: text("cover_img_url"),
    heroImgUrl: text("hero_img_url"),
    rating: numeric("rating", { precision: 3, scale: 1 }),
    order: integer("order").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    public: boolean("public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("games_rating_check", sql`${t.rating} >= 0 AND ${t.rating} <= 10`),
  ],
);

// Links media to games, such as trailers, gameplay, cover images, etc.
export const gameMedia = pgTable("game_media", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const gamesRelations = relations(games, ({ many, one }) => ({
  gameMedia: many(gameMedia),
  videos: many(videos),
  user: one(users, { fields: [games.uploaderId], references: [users.id] }),
}));

export const gameMediaRelations = relations(gameMedia, ({ one }) => ({
  game: one(games, { fields: [gameMedia.gameId], references: [games.id] }),
}));

/**
 * @name Videos
 * This table stores videos uploaded by users, and it can be filtered by game. Each video has a title, description, url, thumbnail, and tags.
 */
export const videos = pgTable("videos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nanoid: varchar("nanoid", { length: 21 }).unique().notNull(),
  uploaderId: integer("uploader_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => games.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 165 }),
  url: text("url"),
  thumbnailUrl: text("thumbnail_url").notNull(),
  tags: text("tags").array(),
  status: status().notNull().default("pending"),
  public: boolean("public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const videosRelations = relations(videos, ({ one }) => ({
  user: one(users, { fields: [videos.uploaderId], references: [users.id] }),
  game: one(games, { fields: [videos.gameId], references: [games.id] }),
}));

/**
 * @name Authentication
 * This section contains tables related to user authentication and profile management.
 * The User stores profile data, while user_oidc_accounts links users and their OIDC accounts, allowing each user to have multiple providers.
 */
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nanoid: varchar("nanoid", { length: 21 }).unique().notNull(),
  email: varchar("email", { length: 320 }).unique(),
  username: varchar("username", { length: 32 }).unique(),
  displayName: varchar("display_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  videos: many(videos),
  games: many(games),
  gameMedia: many(gameMedia),
}));

// Links a OIDC Provider account to a user.
export const userOidcAccounts = pgTable(
  "user_oidc_accounts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    subject: text("subject").notNull(),
    issuer: text("issuer").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("uoa_issuer_subject").on(t.issuer, t.subject)],
);
