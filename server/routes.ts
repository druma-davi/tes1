import express, { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { insertUserSchema, insertVideoSchema, insertCommentSchema, insertFollowSchema } from "@shared/schema";
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Configure multer for file uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/videos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Check if FFmpeg is installed
const ffmpegLoaded = true; // Assume FFmpeg is installed, we handle errors in the specific ffmpeg calls

export async function registerRoutes(app: Express): Promise<Server> {
  // No need to load FFmpeg for fluent-ffmpeg

  // Middleware
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'tikfans_secret',
      resave: false,
      saveUninitialized: true,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
    })
  );

  // Session-based auth middleware
  const authenticateUser = async (req: Request, res: Response, next: Function) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await storage.getUser(parseInt(userId as string, 10));
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  };

  // Optional auth - doesn't require login but attaches user if logged in
  const optionalAuth = async (req: Request, res: Response, next: Function) => {
    const userId = req.session.userId;
    if (userId) {
      const user = await storage.getUser(parseInt(userId as string, 10));
      if (user) {
        req.user = user;
      }
    }
    
    // Ensure session ID exists for tracking ad views
    if (!req.session.clientId) {
      req.session.clientId = nanoid();
    }
    
    next();
  };

  // Static file serving
  app.use('/server/videos', express.static('server/videos'));
  app.use('/server/ads', express.static('server/ads'));

  // User routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // If email provided, check if it exists
      if (userData.email) {
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      // Hash password if provided
      if (userData.password) {
        userData.password = crypto
          .createHash('sha256')
          .update(userData.password)
          .digest('hex');
      }
      
      const newUser = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      // Set session
      req.session.userId = newUser.id;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        message: error instanceof z.ZodError 
          ? error.errors.map(e => e.message).join(', ')
          : 'Invalid data provided' 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
      
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  });

  app.post('/api/auth/google', async (req, res) => {
    const { googleId, name, email, avatar } = req.body;
    
    if (!googleId || !email) {
      return res.status(400).json({ message: 'Google ID and email are required' });
    }
    
    try {
      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if email exists
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link Google ID to existing account
          user = await storage.updateUser(user.id, { googleId }) as any;
        } else {
          // Create new user
          const username = `user_${Math.floor(Math.random() * 10000)}`;
          user = await storage.createUser({
            username,
            name,
            email,
            googleId,
            avatar,
            password: null,
          });
        }
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: 'An error occurred during Google authentication' });
    }
  });

  app.get('/api/auth/me', optionalAuth, (req, res) => {
    if (req.user) {
      // Remove password from response
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.put('/api/users/:id', authenticateUser, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId) || userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    try {
      const allowedFields = ['name', 'bio', 'avatar'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', authenticateUser, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId) || userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    try {
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Destroy session
      req.session.destroy(() => {});
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Video routes
  app.get('/api/videos', optionalAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      
      const videos = await storage.getVideos(limit, offset);
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ message: 'Failed to fetch videos' });
    }
  });

  app.get('/api/videos/:id', optionalAuth, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideoWithUser(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // If video is private, check if current user is the owner
      if (video.isPrivate && (!req.user || req.user.id !== video.userId)) {
        return res.status(403).json({ message: 'This video is private' });
      }
      
      // Increment view count
      await storage.incrementVideoViews(videoId);
      
      res.json(video);
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({ message: 'Failed to fetch video' });
    }
  });

  app.post('/api/videos', authenticateUser, upload.single('video'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }
    
    try {
      // Validate video duration
      if (ffmpegLoaded) {
        const videoPath = req.file.path;
        
        // Get video duration using fluent-ffmpeg
        const getDuration = () => {
          return new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Get duration in seconds
              const duration = metadata.format.duration || 0;
              resolve(duration);
            });
          });
        };
        
        try {
          const duration = await getDuration();
          
          if (duration > 60) {
            // Delete the uploaded file if it's too long
            fs.unlinkSync(videoPath);
            return res.status(400).json({ message: 'Video must be 1 minute or less' });
          }
        } catch (error) {
          console.error('Error getting video duration:', error);
        }
      }
      
      // Create thumbnail using fluent-ffmpeg
      let thumbnailUrl = null;
      if (ffmpegLoaded) {
        const thumbnailFilename = `thumbnail_${path.basename(req.file.filename, path.extname(req.file.filename))}.jpg`;
        const thumbnailPath = path.join('server/videos', thumbnailFilename);
        
        // Generate thumbnail using fluent-ffmpeg
        const generateThumbnail = () => {
          return new Promise<void>((resolve, reject) => {
            ffmpeg(req.file.path)
              .on('error', (err) => {
                reject(err);
              })
              .on('end', () => {
                resolve();
              })
              .screenshots({
                timestamps: ['1%'],
                filename: thumbnailFilename,
                folder: 'server/videos',
                size: '320x180'
              });
          });
        };
        
        try {
          await generateThumbnail();
          thumbnailUrl = `/server/videos/${thumbnailFilename}`;
        } catch (error) {
          console.error('Error generating thumbnail:', error);
        }
      }
      
      // Validate and parse other video data
      try {
        const { title, description, isPrivate } = req.body;
        
        const videoData = insertVideoSchema.parse({
          userId: req.user.id,
          title: title,
          description: description || null,
          videoUrl: `/server/videos/${req.file.filename}`,
          thumbnailUrl,
          duration: 60, // Default to max duration if not detected
          isPrivate: isPrivate === 'true',
        });
        
        const newVideo = await storage.createVideo(videoData);
        
        res.status(201).json(newVideo);
      } catch (error) {
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        
        if (thumbnailUrl) {
          const thumbnailPath = path.join(process.cwd(), thumbnailUrl.replace(/^\//, ''));
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        }
        
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: error.errors.map(e => e.message).join(', ') 
          });
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({ message: 'Failed to upload video' });
    }
  });

  app.put('/api/videos/:id', authenticateUser, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      if (video.userId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const allowedFields = ['title', 'description', 'isPrivate'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      const updatedVideo = await storage.updateVideo(videoId, updateData);
      
      res.json(updatedVideo);
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({ message: 'Failed to update video' });
    }
  });

  app.delete('/api/videos/:id', authenticateUser, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      if (video.userId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const success = await storage.deleteVideo(videoId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete video' });
      }
      
      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ message: 'Failed to delete video' });
    }
  });

  app.get('/api/users/:id/videos', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      const videos = await storage.getUserVideos(userId);
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
      res.status(500).json({ message: 'Failed to fetch user videos' });
    }
  });

  // Video interactions
  app.post('/api/videos/:id/like', optionalAuth, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const success = await storage.likeVideo(videoId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to like video' });
      }
      
      res.json({ message: 'Video liked successfully' });
    } catch (error) {
      console.error('Error liking video:', error);
      res.status(500).json({ message: 'Failed to like video' });
    }
  });

  app.post('/api/videos/:id/dislike', optionalAuth, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const success = await storage.dislikeVideo(videoId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to dislike video' });
      }
      
      res.json({ message: 'Video disliked successfully' });
    } catch (error) {
      console.error('Error disliking video:', error);
      res.status(500).json({ message: 'Failed to dislike video' });
    }
  });

  // Comment routes
  app.get('/api/videos/:id/comments', async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const comments = await storage.getVideoComments(videoId);
      
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.post('/api/videos/:id/comments', authenticateUser, async (req, res) => {
    const videoId = parseInt(req.params.id, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    
    try {
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const commentData = insertCommentSchema.parse({
        videoId,
        userId: req.user.id,
        content: req.body.content,
        parentId: req.body.parentId ? parseInt(req.body.parentId, 10) : null
      });
      
      const newComment = await storage.createComment(commentData);
      
      // Fetch user data for response
      const user = await storage.getUser(req.user.id);
      
      const commentWithUser = {
        ...newComment,
        user: {
          id: user?.id || 0,
          username: user?.username || 'unknown',
          name: user?.name,
          avatar: user?.avatar
        }
      };
      
      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error('Error creating comment:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors.map(e => e.message).join(', ') 
        });
      }
      
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  app.post('/api/comments/:id/like', optionalAuth, async (req, res) => {
    const commentId = parseInt(req.params.id, 10);
    
    if (isNaN(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    try {
      const comment = await storage.getComment(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      
      const success = await storage.likeComment(commentId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to like comment' });
      }
      
      res.json({ message: 'Comment liked successfully' });
    } catch (error) {
      console.error('Error liking comment:', error);
      res.status(500).json({ message: 'Failed to like comment' });
    }
  });

  app.delete('/api/comments/:id', authenticateUser, async (req, res) => {
    const commentId = parseInt(req.params.id, 10);
    
    if (isNaN(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    try {
      const comment = await storage.getComment(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      
      if (comment.userId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const success = await storage.deleteComment(commentId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete comment' });
      }
      
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  // Follow routes
  app.post('/api/users/:id/follow', authenticateUser, async (req, res) => {
    const followingId = parseInt(req.params.id, 10);
    
    if (isNaN(followingId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    if (followingId === req.user.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    try {
      const followingUser = await storage.getUser(followingId);
      
      if (!followingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const followData = insertFollowSchema.parse({
        followerId: req.user.id,
        followingId
      });
      
      const follow = await storage.follow(followData);
      
      res.status(201).json(follow);
    } catch (error) {
      console.error('Error following user:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors.map(e => e.message).join(', ') 
        });
      }
      
      res.status(500).json({ message: 'Failed to follow user' });
    }
  });

  app.delete('/api/users/:id/follow', authenticateUser, async (req, res) => {
    const followingId = parseInt(req.params.id, 10);
    
    if (isNaN(followingId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      const success = await storage.unfollow(req.user.id, followingId);
      
      if (!success) {
        return res.status(404).json({ message: 'Follow relationship not found' });
      }
      
      res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ message: 'Failed to unfollow user' });
    }
  });

  app.get('/api/users/:id/following', authenticateUser, async (req, res) => {
    const followingId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;
    
    if (isNaN(followingId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      const isFollowing = await storage.isFollowing(currentUserId, followingId);
      
      res.json({ following: isFollowing });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ message: 'Failed to check follow status' });
    }
  });

  // Ad routes
  app.get('/api/ads/random', optionalAuth, async (req, res) => {
    try {
      // Check if user has seen 5 ads today
      const sessionId = req.session.clientId as string;
      const today = new Date().toISOString().split('T')[0];
      
      const adViewCount = await storage.getAdViewCountForDay(sessionId, today);
      
      if (adViewCount >= 5) {
        return res.status(204).end(); // No more ads for today
      }
      
      // 20% chance to show an ad
      if (Math.random() < 0.2) {
        const ad = await storage.getRandomAd();
        
        if (ad) {
          // Record ad view
          await storage.createAdView({
            userId: req.user?.id || null,
            sessionId,
            adId: ad.id,
            viewedDate: today
          });
          
          return res.json(ad);
        }
      }
      
      // No ad to show
      res.status(204).end();
    } catch (error) {
      console.error('Error fetching ad:', error);
      res.status(500).json({ message: 'Failed to fetch ad' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
