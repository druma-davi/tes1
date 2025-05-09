import { 
  User, InsertUser, Video, InsertVideo, Comment, InsertComment, 
  Follow, InsertFollow, Ad, InsertAd, AdView, InsertAdView,
  VideoWithUser, CommentWithUser
} from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Video operations
  getVideo(id: number): Promise<Video | undefined>;
  getVideoWithUser(id: number): Promise<VideoWithUser | undefined>;
  getVideos(limit?: number, offset?: number): Promise<VideoWithUser[]>;
  getUserVideos(userId: number): Promise<VideoWithUser[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, data: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
  incrementVideoViews(id: number): Promise<boolean>;
  likeVideo(id: number): Promise<boolean>;
  dislikeVideo(id: number): Promise<boolean>;

  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  getVideoComments(videoId: number): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  likeComment(id: number): Promise<boolean>;
  deleteComment(id: number): Promise<boolean>;

  // Follow operations
  follow(data: InsertFollow): Promise<Follow>;
  unfollow(followerId: number, followingId: number): Promise<boolean>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  // Ad operations
  getAd(id: number): Promise<Ad | undefined>;
  getRandomAd(): Promise<Ad | undefined>;
  createAdView(adView: InsertAdView): Promise<AdView>;
  getAdViewCountForDay(sessionId: string, date: string): Promise<number>;
}

// Memory-based implementation using JSON file
export class MemStorage implements IStorage {
  private data: {
    users: User[];
    videos: Video[];
    comments: Comment[];
    follows: Follow[];
    ads: Ad[];
    adViews: AdView[];
  };
  private userIdCounter: number;
  private videoIdCounter: number;
  private commentIdCounter: number;
  private followIdCounter: number;
  private adIdCounter: number;
  private adViewIdCounter: number;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'server', 'db.json');
    
    // Initialize with empty arrays or load from file if exists
    if (fs.existsSync(this.dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      } catch (error) {
        console.error('Error loading db.json, initializing empty DB', error);
        this.data = {
          users: [],
          videos: [],
          comments: [],
          follows: [],
          ads: [],
          adViews: []
        };
      }
    } else {
      this.data = {
        users: [],
        videos: [],
        comments: [],
        follows: [],
        ads: [],
        adViews: []
      };
    }

    // Set up counters
    this.userIdCounter = this.data.users.length > 0 
      ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
    
    this.videoIdCounter = this.data.videos.length > 0 
      ? Math.max(...this.data.videos.map(v => v.id)) + 1 : 1;
    
    this.commentIdCounter = this.data.comments.length > 0 
      ? Math.max(...this.data.comments.map(c => c.id)) + 1 : 1;
    
    this.followIdCounter = this.data.follows.length > 0 
      ? Math.max(...this.data.follows.map(f => f.id)) + 1 : 1;
    
    this.adIdCounter = this.data.ads.length > 0 
      ? Math.max(...this.data.ads.map(a => a.id)) + 1 : 1;
    
    this.adViewIdCounter = this.data.adViews.length > 0 
      ? Math.max(...this.data.adViews.map(av => av.id)) + 1 : 1;

    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist() {
    const dirs = [
      path.join(process.cwd(), 'server', 'videos'),
      path.join(process.cwd(), 'server', 'ads')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private saveData(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.data.users.find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return this.data.users.find(user => user.googleId === googleId);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...userData, id, followersCount: 0, followingCount: 0 };
    this.data.users.push(newUser);
    this.saveData();
    return newUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const index = this.data.users.findIndex(user => user.id === id);
    if (index === -1) return undefined;

    const updatedUser = { ...this.data.users[index], ...data };
    this.data.users[index] = updatedUser;
    this.saveData();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const initialLength = this.data.users.length;
    this.data.users = this.data.users.filter(user => user.id !== id);
    
    // Also delete related data
    this.data.videos = this.data.videos.filter(video => video.userId !== id);
    this.data.comments = this.data.comments.filter(comment => comment.userId !== id);
    
    // Handle follows
    const userFollows = this.data.follows.filter(
      follow => follow.followerId === id || follow.followingId === id
    );
    
    // Update follower/following counts for affected users
    for (const follow of userFollows) {
      if (follow.followerId === id) {
        const followingUser = this.data.users.find(u => u.id === follow.followingId);
        if (followingUser && followingUser.followersCount > 0) {
          followingUser.followersCount--;
        }
      }
      if (follow.followingId === id) {
        const followerUser = this.data.users.find(u => u.id === follow.followerId);
        if (followerUser && followerUser.followingCount > 0) {
          followerUser.followingCount--;
        }
      }
    }
    
    // Remove all follows
    this.data.follows = this.data.follows.filter(
      follow => follow.followerId !== id && follow.followingId !== id
    );
    
    this.saveData();
    return this.data.users.length !== initialLength;
  }

  // Video operations
  async getVideo(id: number): Promise<Video | undefined> {
    return this.data.videos.find(video => video.id === id);
  }

  async getVideoWithUser(id: number): Promise<VideoWithUser | undefined> {
    const video = this.data.videos.find(video => video.id === id);
    if (!video) return undefined;

    const user = this.data.users.find(user => user.id === video.userId);
    if (!user) return undefined;

    return {
      ...video,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar
      }
    };
  }

  async getVideos(limit: number = 10, offset: number = 0): Promise<VideoWithUser[]> {
    // Get videos sorted by most recent first
    return this.data.videos
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(offset, offset + limit)
      .map(video => {
        const user = this.data.users.find(user => user.id === video.userId);
        return {
          ...video,
          user: user ? {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar
          } : {
            id: 0,
            username: 'unknown',
            name: null,
            avatar: null
          }
        };
      });
  }

  async getUserVideos(userId: number): Promise<VideoWithUser[]> {
    const user = this.data.users.find(user => user.id === userId);
    if (!user) return [];

    return this.data.videos
      .filter(video => video.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map(video => ({
        ...video,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar: user.avatar
        }
      }));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const id = this.videoIdCounter++;
    const now = new Date();
    const newVideo: Video = {
      ...videoData,
      id,
      views: 0,
      likes: 0,
      dislikes: 0,
      commentsCount: 0,
      createdAt: now
    };
    this.data.videos.push(newVideo);
    this.saveData();
    return newVideo;
  }

  async updateVideo(id: number, data: Partial<Video>): Promise<Video | undefined> {
    const index = this.data.videos.findIndex(video => video.id === id);
    if (index === -1) return undefined;

    const updatedVideo = { ...this.data.videos[index], ...data };
    this.data.videos[index] = updatedVideo;
    this.saveData();
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<boolean> {
    const video = this.data.videos.find(v => v.id === id);
    if (!video) return false;

    // Remove the video file
    try {
      if (video.videoUrl) {
        const filePath = path.join(process.cwd(), video.videoUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (video.thumbnailUrl) {
        const filePath = path.join(process.cwd(), video.thumbnailUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error deleting video files:', error);
    }

    const initialLength = this.data.videos.length;
    this.data.videos = this.data.videos.filter(video => video.id !== id);
    
    // Also delete related comments
    this.data.comments = this.data.comments.filter(comment => comment.videoId !== id);
    
    this.saveData();
    return this.data.videos.length !== initialLength;
  }

  async incrementVideoViews(id: number): Promise<boolean> {
    const video = this.data.videos.find(video => video.id === id);
    if (!video) return false;

    video.views++;
    this.saveData();
    return true;
  }

  async likeVideo(id: number): Promise<boolean> {
    const video = this.data.videos.find(video => video.id === id);
    if (!video) return false;

    video.likes++;
    this.saveData();
    return true;
  }

  async dislikeVideo(id: number): Promise<boolean> {
    const video = this.data.videos.find(video => video.id === id);
    if (!video) return false;

    video.dislikes++;
    this.saveData();
    return true;
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    return this.data.comments.find(comment => comment.id === id);
  }

  async getVideoComments(videoId: number): Promise<CommentWithUser[]> {
    // Get top-level comments
    const topLevelComments = this.data.comments
      .filter(comment => comment.videoId === videoId && comment.parentId === null)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    // Get all replies
    const replies = this.data.comments
      .filter(comment => comment.videoId === videoId && comment.parentId !== null);

    // Build comment tree with user data
    const commentsWithUsers: CommentWithUser[] = topLevelComments.map(comment => {
      const user = this.data.users.find(user => user.id === comment.userId);
      const commentReplies = replies
        .filter(reply => reply.parentId === comment.id)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        })
        .map(reply => {
          const replyUser = this.data.users.find(user => user.id === reply.userId);
          return {
            ...reply,
            user: replyUser ? {
              id: replyUser.id,
              username: replyUser.username,
              name: replyUser.name,
              avatar: replyUser.avatar
            } : {
              id: 0,
              username: 'unknown',
              name: null,
              avatar: null
            }
          };
        });

      return {
        ...comment,
        user: user ? {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar: user.avatar
        } : {
          id: 0,
          username: 'unknown',
          name: null,
          avatar: null
        },
        replies: commentReplies
      };
    });

    return commentsWithUsers;
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const now = new Date();
    const newComment: Comment = {
      ...commentData,
      id,
      likes: 0,
      createdAt: now
    };
    this.data.comments.push(newComment);

    // Increment comment count on video
    const video = this.data.videos.find(v => v.id === commentData.videoId);
    if (video) {
      video.commentsCount++;
    }

    this.saveData();
    return newComment;
  }

  async likeComment(id: number): Promise<boolean> {
    const comment = this.data.comments.find(comment => comment.id === id);
    if (!comment) return false;

    comment.likes++;
    this.saveData();
    return true;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = this.data.comments.find(c => c.id === id);
    if (!comment) return false;

    // Get all replies to be deleted
    const replies = this.data.comments.filter(c => c.parentId === id);
    const allCommentIds = [id, ...replies.map(r => r.id)];

    const initialLength = this.data.comments.length;
    this.data.comments = this.data.comments.filter(c => !allCommentIds.includes(c.id));

    // Decrement comment count on video
    const video = this.data.videos.find(v => v.id === comment.videoId);
    if (video) {
      video.commentsCount -= allCommentIds.length;
      if (video.commentsCount < 0) video.commentsCount = 0;
    }

    this.saveData();
    return this.data.comments.length !== initialLength;
  }

  // Follow operations
  async follow(data: InsertFollow): Promise<Follow> {
    // Check if already following
    const existingFollow = this.data.follows.find(
      f => f.followerId === data.followerId && f.followingId === data.followingId
    );
    
    if (existingFollow) {
      return existingFollow;
    }

    const id = this.followIdCounter++;
    const now = new Date();
    const newFollow: Follow = {
      ...data,
      id,
      createdAt: now
    };
    this.data.follows.push(newFollow);

    // Update follower counts
    const follower = this.data.users.find(u => u.id === data.followerId);
    const following = this.data.users.find(u => u.id === data.followingId);

    if (follower) {
      follower.followingCount = (follower.followingCount || 0) + 1;
    }
    
    if (following) {
      following.followersCount = (following.followersCount || 0) + 1;
    }

    this.saveData();
    return newFollow;
  }

  async unfollow(followerId: number, followingId: number): Promise<boolean> {
    const initialLength = this.data.follows.length;
    const followToRemove = this.data.follows.find(
      f => f.followerId === followerId && f.followingId === followingId
    );

    if (!followToRemove) return false;

    this.data.follows = this.data.follows.filter(
      f => !(f.followerId === followerId && f.followingId === followingId)
    );

    // Update follower counts
    const follower = this.data.users.find(u => u.id === followerId);
    const following = this.data.users.find(u => u.id === followingId);

    if (follower && follower.followingCount > 0) {
      follower.followingCount--;
    }
    
    if (following && following.followersCount > 0) {
      following.followersCount--;
    }

    this.saveData();
    return this.data.follows.length !== initialLength;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return this.data.follows.some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  // Ad operations
  async getAd(id: number): Promise<Ad | undefined> {
    return this.data.ads.find(ad => ad.id === id);
  }

  async getRandomAd(): Promise<Ad | undefined> {
    if (this.data.ads.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * this.data.ads.length);
    return this.data.ads[randomIndex];
  }

  async createAdView(adViewData: InsertAdView): Promise<AdView> {
    const id = this.adViewIdCounter++;
    const now = new Date();
    const newAdView: AdView = {
      ...adViewData,
      id,
      viewedAt: now
    };
    this.data.adViews.push(newAdView);
    this.saveData();
    return newAdView;
  }

  async getAdViewCountForDay(sessionId: string, date: string): Promise<number> {
    return this.data.adViews.filter(
      av => av.sessionId === sessionId && av.viewedDate === date
    ).length;
  }
}

// Database-based implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    if (!googleId) return undefined;
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      followersCount: 0,
      followingCount: 0
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        ...data,
        // Ensure these are not overwritten with undefined
        name: data.name !== undefined ? data.name : undefined,
        email: data.email !== undefined ? data.email : undefined,
        bio: data.bio !== undefined ? data.bio : undefined,
        avatar: data.avatar !== undefined ? data.avatar : undefined,
        password: data.password !== undefined ? data.password : undefined,
        googleId: data.googleId !== undefined ? data.googleId : undefined,
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    // First, handle follows to update counts
    const userFollows = await db.select().from(follows)
      .where(or(eq(follows.followerId, id), eq(follows.followingId, id)));
    
    for (const follow of userFollows) {
      if (follow.followerId === id) {
        const followingUser = await this.getUser(follow.followingId);
        if (followingUser && followingUser.followersCount !== null && followingUser.followersCount > 0) {
          await db.update(users)
            .set({ followersCount: followingUser.followersCount - 1 })
            .where(eq(users.id, follow.followingId));
        }
      }
      if (follow.followingId === id) {
        const followerUser = await this.getUser(follow.followerId);
        if (followerUser && followerUser.followingCount !== null && followerUser.followingCount > 0) {
          await db.update(users)
            .set({ followingCount: followerUser.followingCount - 1 })
            .where(eq(users.id, follow.followerId));
        }
      }
    }
    
    // Delete related data
    await db.delete(follows).where(or(
      eq(follows.followerId, id),
      eq(follows.followingId, id)
    ));
    
    // Delete comments
    await db.delete(comments).where(eq(comments.userId, id));
    
    // Get videos to delete files
    const userVideos = await db.select().from(videos).where(eq(videos.userId, id));
    
    for (const video of userVideos) {
      await this.deleteVideo(video.id);
    }
    
    // Finally delete the user
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Video operations
  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getVideoWithUser(id: number): Promise<VideoWithUser | undefined> {
    const result = await db.select({
      video: videos,
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.id, id));
    
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      ...row.video,
      user: {
        id: row.userId,
        username: row.username,
        name: row.name,
        avatar: row.avatar
      }
    };
  }

  async getVideos(limit: number = 10, offset: number = 0): Promise<VideoWithUser[]> {
    const result = await db.select({
      video: videos,
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
    
    return result.map(row => ({
      ...row.video,
      user: {
        id: row.userId,
        username: row.username,
        name: row.name,
        avatar: row.avatar
      }
    }));
  }

  async getUserVideos(userId: number): Promise<VideoWithUser[]> {
    const result = await db.select({
      video: videos,
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.userId, userId))
    .orderBy(desc(videos.createdAt));
    
    return result.map(row => ({
      ...row.video,
      user: {
        id: row.userId,
        username: row.username,
        name: row.name,
        avatar: row.avatar
      }
    }));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values({
      ...videoData,
      views: 0,
      likes: 0,
      dislikes: 0,
      commentsCount: 0,
      isPrivate: videoData.isPrivate || false,
      qualities: []
    }).returning();
    return video;
  }

  async updateVideo(id: number, data: Partial<Video>): Promise<Video | undefined> {
    const [updatedVideo] = await db.update(videos)
      .set({
        ...data,
        // Ensure these are not overwritten with undefined
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : undefined,
        isPrivate: data.isPrivate !== undefined ? data.isPrivate : undefined,
        qualities: data.qualities !== undefined ? data.qualities : undefined,
      })
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<boolean> {
    // Get video to delete files
    const video = await this.getVideo(id);
    if (!video) return false;

    // Remove video files
    try {
      if (video.videoUrl) {
        const filePath = path.join(process.cwd(), video.videoUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (video.thumbnailUrl) {
        const filePath = path.join(process.cwd(), video.thumbnailUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error deleting video files:', error);
    }

    // Delete related comments
    await db.delete(comments).where(eq(comments.videoId, id));
    
    // Delete the video
    const result = await db.delete(videos).where(eq(videos.id, id)).returning();
    return result.length > 0;
  }

  async incrementVideoViews(id: number): Promise<boolean> {
    const video = await this.getVideo(id);
    if (!video) return false;

    await db.update(videos)
      .set({ views: (video.views || 0) + 1 })
      .where(eq(videos.id, id));
    
    return true;
  }

  async likeVideo(id: number): Promise<boolean> {
    const video = await this.getVideo(id);
    if (!video) return false;

    await db.update(videos)
      .set({ likes: (video.likes || 0) + 1 })
      .where(eq(videos.id, id));
    
    return true;
  }

  async dislikeVideo(id: number): Promise<boolean> {
    const video = await this.getVideo(id);
    if (!video) return false;

    await db.update(videos)
      .set({ dislikes: (video.dislikes || 0) + 1 })
      .where(eq(videos.id, id));
    
    return true;
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async getVideoComments(videoId: number): Promise<CommentWithUser[]> {
    // Get all comments for the video
    const allComments = await db.select({
      comment: comments,
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.videoId, videoId))
    .orderBy(desc(comments.createdAt));
    
    // Separate top-level comments and replies
    const topLevelCommentsMap = new Map<number, CommentWithUser>();
    const repliesMap = new Map<number, CommentWithUser[]>();
    
    allComments.forEach(row => {
      const commentWithUser: CommentWithUser = {
        ...row.comment,
        user: {
          id: row.userId,
          username: row.username,
          name: row.name,
          avatar: row.avatar
        },
        replies: []
      };
      
      if (row.comment.parentId === null) {
        topLevelCommentsMap.set(row.comment.id, commentWithUser);
      } else {
        const parentId = row.comment.parentId;
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId)?.push(commentWithUser);
      }
    });
    
    // Combine top-level comments with their replies
    repliesMap.forEach((replies, parentId) => {
      const parent = topLevelCommentsMap.get(parentId);
      if (parent) {
        parent.replies = replies.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      }
    });
    
    return Array.from(topLevelCommentsMap.values());
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    // Increment comment count on video
    await db.transaction(async (tx) => {
      const video = await tx.select().from(videos).where(eq(videos.id, commentData.videoId)).forUpdate();
      if (video.length > 0) {
        await tx.update(videos)
          .set({ commentsCount: (video[0].commentsCount || 0) + 1 })
          .where(eq(videos.id, commentData.videoId));
      }
    });
    
    const [comment] = await db.insert(comments).values({
      ...commentData,
      likes: 0
    }).returning();
    
    return comment;
  }

  async likeComment(id: number): Promise<boolean> {
    const comment = await this.getComment(id);
    if (!comment) return false;

    await db.update(comments)
      .set({ likes: (comment.likes || 0) + 1 })
      .where(eq(comments.id, id));
    
    return true;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = await this.getComment(id);
    if (!comment) return false;

    // Get all replies
    const replies = await db.select().from(comments).where(eq(comments.parentId, id));
    const allCommentIds = [id, ...replies.map(r => r.id)];
    
    // Update video comment count
    await db.transaction(async (tx) => {
      const video = await tx.select().from(videos).where(eq(videos.id, comment.videoId)).forUpdate();
      if (video.length > 0) {
        const newCount = Math.max(0, (video[0].commentsCount || 0) - allCommentIds.length);
        await tx.update(videos)
          .set({ commentsCount: newCount })
          .where(eq(videos.id, comment.videoId));
      }
    });
    
    // Delete replies and the comment
    await db.delete(comments).where(inArray(comments.id, allCommentIds));
    
    return true;
  }

  // Follow operations
  async follow(data: InsertFollow): Promise<Follow> {
    // Check if already following
    const [existingFollow] = await db.select().from(follows)
      .where(and(
        eq(follows.followerId, data.followerId),
        eq(follows.followingId, data.followingId)
      ));
    
    if (existingFollow) {
      return existingFollow;
    }
    
    // Create new follow relationship
    await db.transaction(async (tx) => {
      // Update follower counts
      const follower = await tx.select().from(users).where(eq(users.id, data.followerId)).forUpdate();
      const following = await tx.select().from(users).where(eq(users.id, data.followingId)).forUpdate();
      
      if (follower.length > 0) {
        await tx.update(users)
          .set({ followingCount: (follower[0].followingCount || 0) + 1 })
          .where(eq(users.id, data.followerId));
      }
      
      if (following.length > 0) {
        await tx.update(users)
          .set({ followersCount: (following[0].followersCount || 0) + 1 })
          .where(eq(users.id, data.followingId));
      }
    });
    
    const [follow] = await db.insert(follows).values(data).returning();
    return follow;
  }

  async unfollow(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db.select().from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    
    if (!follow) return false;
    
    await db.transaction(async (tx) => {
      // Update follower counts
      const follower = await tx.select().from(users).where(eq(users.id, followerId)).forUpdate();
      const following = await tx.select().from(users).where(eq(users.id, followingId)).forUpdate();
      
      if (follower.length > 0 && follower[0].followingCount !== null && follower[0].followingCount > 0) {
        await tx.update(users)
          .set({ followingCount: follower[0].followingCount - 1 })
          .where(eq(users.id, followerId));
      }
      
      if (following.length > 0 && following[0].followersCount !== null && following[0].followersCount > 0) {
        await tx.update(users)
          .set({ followersCount: following[0].followersCount - 1 })
          .where(eq(users.id, followingId));
      }
      
      // Delete the follow relationship
      await tx.delete(follows).where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    });
    
    return true;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db.select().from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    
    return !!follow;
  }

  // Ad operations
  async getAd(id: number): Promise<Ad | undefined> {
    const [ad] = await db.select().from(ads).where(eq(ads.id, id));
    return ad;
  }

  async getRandomAd(): Promise<Ad | undefined> {
    // Count total ads
    const [{ count }] = await db.select({ count: count() }).from(ads);
    if (count === 0) return undefined;
    
    // Get random ad
    const randomOffset = Math.floor(Math.random() * count);
    const [ad] = await db.select().from(ads).limit(1).offset(randomOffset);
    return ad;
  }

  async createAdView(adViewData: InsertAdView): Promise<AdView> {
    const [adView] = await db.insert(adViews).values(adViewData).returning();
    return adView;
  }

  async getAdViewCountForDay(sessionId: string, date: string): Promise<number> {
    const [{ count }] = await db.select({ count: count() })
      .from(adViews)
      .where(and(
        eq(adViews.sessionId, sessionId),
        eq(adViews.viewedDate, date)
      ));
    
    return Number(count);
  }
}

// Import missing modules
import { db } from './db';
import { 
  users, videos, comments, follows, ads, adViews
} from '@shared/schema';
import {
  eq, and, or, desc, count, inArray
} from 'drizzle-orm';

// Switch to database storage
export const storage = new DatabaseStorage();
