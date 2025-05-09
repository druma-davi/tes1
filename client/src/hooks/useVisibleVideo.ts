import { useState, useCallback, useEffect } from 'react';

export function useVisibleVideo() {
  const [visibleVideos, setVisibleVideos] = useState<Record<number, boolean>>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<number | null>(null);
  
  // Register a video as visible or not visible
  const registerVideo = useCallback((id: number, isVisible: boolean) => {
    setVisibleVideos(prev => {
      // Only update if the visibility has changed
      if (prev[id] !== isVisible) {
        return { ...prev, [id]: isVisible };
      }
      return prev;
    });
  }, []);
  
  // Determine which video should be playing based on visibility
  useEffect(() => {
    const visibleVideoIds = Object.entries(visibleVideos)
      .filter(([_, isVisible]) => isVisible)
      .map(([id]) => parseInt(id, 10));
    
    if (visibleVideoIds.length === 0) {
      setCurrentlyPlayingId(null);
      return;
    }
    
    // If there's only one visible video, play it
    if (visibleVideoIds.length === 1) {
      setCurrentlyPlayingId(visibleVideoIds[0]);
      return;
    }
    
    // If there are multiple visible videos, play the one with the highest visibility (first one in the array)
    // This assumes the videos are ordered by visibility in the DOM
    setCurrentlyPlayingId(visibleVideoIds[0]);
  }, [visibleVideos]);
  
  return {
    registerVideo,
    currentlyPlayingId,
  };
}
