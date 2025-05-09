import { apiRequest } from "./queryClient";
import { VideoWithUser, CommentWithUser } from "@shared/schema";

// Fetch videos for the feed
export async function fetchVideos(limit: number = 10, offset: number = 0): Promise<VideoWithUser[]> {
  const response = await fetch(`/api/videos?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  return response.json();
}

// Fetch a single video
export async function fetchVideo(id: number): Promise<VideoWithUser> {
  const response = await fetch(`/api/videos/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch video');
  }
  return response.json();
}

// Fetch videos for a specific user
export async function fetchUserVideos(userId: number): Promise<VideoWithUser[]> {
  const response = await fetch(`/api/users/${userId}/videos`);
  if (!response.ok) {
    throw new Error('Failed to fetch user videos');
  }
  return response.json();
}

// Fetch comments for a video
export async function fetchVideoComments(videoId: number): Promise<CommentWithUser[]> {
  const response = await fetch(`/api/videos/${videoId}/comments`);
  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  return response.json();
}

// Like a video
export async function likeVideo(videoId: number): Promise<void> {
  await apiRequest('POST', `/api/videos/${videoId}/like`);
}

// Dislike a video
export async function dislikeVideo(videoId: number): Promise<void> {
  await apiRequest('POST', `/api/videos/${videoId}/dislike`);
}

// Add a comment to a video
export async function addComment(videoId: number, content: string, parentId?: number): Promise<CommentWithUser> {
  const response = await apiRequest(
    'POST', 
    `/api/videos/${videoId}/comments`, 
    { content, parentId: parentId || null }
  );
  return response.json();
}

// Like a comment
export async function likeComment(commentId: number): Promise<void> {
  await apiRequest('POST', `/api/comments/${commentId}/like`);
}

// Upload a video
export async function uploadVideo(formData: FormData): Promise<any> {
  const response = await fetch('/api/videos', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload video');
  }
  
  return response.json();
}

// Delete a video
export async function deleteVideo(videoId: number): Promise<void> {
  await apiRequest('DELETE', `/api/videos/${videoId}`);
}

// Update video metadata
export async function updateVideo(videoId: number, data: { title?: string; description?: string; isPrivate?: boolean }): Promise<any> {
  const response = await apiRequest('PUT', `/api/videos/${videoId}`, data);
  return response.json();
}
