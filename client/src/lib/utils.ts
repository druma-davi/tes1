import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to compact format (e.g. 1K, 1M)
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`.replace('.0K', 'K');
  return `${(count / 1000000).toFixed(1)}M`.replace('.0M', 'M');
}

/**
 * Format video duration in seconds to mm:ss format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get relative time (e.g. "2 days ago", "just now")
 */
export function getRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

/**
 * Validate file size and type for video uploads
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('video/')) {
    return { valid: false, error: 'File must be a video' };
  }
  
  // Check file size (max 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'Video must be less than 100MB' };
  }
  
  return { valid: true };
}

/**
 * Create a thumbnail from a video file
 */
export function createVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to 1 second or 25% of the video, whichever is less
      const seekTo = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTo;
    };
    
    video.onseeked = () => {
      // Create a canvas to draw the thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnailUrl);
    };
    
    video.onerror = () => {
      reject(new Error('Error generating thumbnail'));
    };
    
    // Set video source
    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Auto-scroll to center an element in the viewport
 */
export function scrollToCenter(element: HTMLElement): void {
  const elementRect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  
  // Calculate where the element should be positioned
  const targetScrollY = window.scrollY + elementRect.top - (windowHeight - elementRect.height) / 2;
  
  window.scrollTo({
    top: targetScrollY,
    behavior: 'smooth',
  });
}

/**
 * Get random items from an array
 */
export function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
