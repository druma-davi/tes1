import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name"),
  email: text("email"),
  bio: text("bio"),
  avatar: text("avatar"),
  password: text("password"), // For local auth, can be null if using OAuth
  googleId: text("google_id").unique(), // For Google OAuth
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  followersCount: true,
  followingCount: true,
});

// Video model
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration").notNull(), // in seconds
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  dislikes: integer("dislikes").default(0),
  commentsCount: integer("comments_count").default(0),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  qualities: json("qualities").$type<string[]>(), // Available quality options: ["720p", "1080p", "1440p"]
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  views: true,
  likes: true,
  dislikes: true,
  commentsCount: true,
  createdAt: true,
  qualities: true,
});

// Comment model
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  parentId: integer("parent_id"), // For replies (null means top-level comment)
  createdAt: timestamp("created_at").defaultNow(),
  image: text("image"), // Optional image URL for image comments
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  likes: true,
  createdAt: true,
});

// Follow relationship
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(), // User who is following
  followingId: integer("following_id").notNull(), // User who is being followed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

// Advertisement model
export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  brandName: text("brand_name").notNull(),
  brandLogo: text("brand_logo"),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
  createdAt: true,
});

// AdView to track ad views per user per day
export const adViews = pgTable("ad_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Can be null for non-logged in users (tracked by session)
  sessionId: text("session_id").notNull(), // For tracking anonymous users
  adId: integer("ad_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
  viewedDate: text("viewed_date").notNull(), // YYYY-MM-DD format for easy counting
});

export const insertAdViewSchema = createInsertSchema(adViews).omit({
  id: true,
  viewedAt: true,
});

// Session store for express-session
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => {
  return {
    expireIdx: index("sessions_expire_idx").on(table.expire),
  }
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;

export type AdView = typeof adViews.$inferSelect;
export type InsertAdView = z.infer<typeof insertAdViewSchema>;

// Video with user data
export interface VideoWithUser extends Video {
  user: {
    id: number;
    username: string;
    name: string | null;
    avatar: string | null;
  };
}

// Comment with user data
export interface CommentWithUser extends Comment {
  user: {
    id: number;
    username: string;
    name: string | null;
    avatar: string | null;
  };
  replies?: CommentWithUser[];
}
