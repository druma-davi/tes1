import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import VideoPost from '@/components/VideoPost';
import AdVideoPost from '@/components/AdVideoPost';
import { useVisibleVideo } from '@/hooks/useVisibleVideo';
import { useAds } from '@/hooks/useAds';
import { VideoWithUser } from '@shared/schema';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

const FETCH_LIMIT = 5;

const Home = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [allVideos, setAllVideos] = useState<VideoWithUser[]>([]);
  const { registerVideo, currentlyPlayingId } = useVisibleVideo();
  const { showAd, currentAd } = useAds();

  // Fetch videos for infinite scroll
  const { data, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery<
    VideoWithUser[], 
    Error,
    VideoWithUser[], 
    string[],
    number
  >({
    queryKey: ['/api/videos'],
    queryFn: ({ pageParam }) => {
      const offset = pageParam * FETCH_LIMIT;
      return fetch(`/api/videos?limit=${FETCH_LIMIT}&offset=${offset}`)
        .then(res => res.json());
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has less videos than the limit, we've reached the end
      return lastPage.length < FETCH_LIMIT ? undefined : allPages.length;
    },
    enabled: true,
  });

  useEffect(() => {
    if (data && data.pages) {
      const allFetchedVideos = data.pages.flat();
      setAllVideos(prev => {
        // Filter out duplicates
        const newVideos = allFetchedVideos.filter(
          (video) => !prev.some(v => v.id === video.id)
        );
        return [...prev, ...newVideos] as VideoWithUser[];
      });
    }
  }, [data]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // If the last video is visible and we're not already loading more
        if (entries[0].isIntersecting && !isLoading && !isFetchingNextPage && hasNextPage !== false) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    // Observe the last video
    const lastVideoEl = container.querySelector('.video-post:last-child');
    if (lastVideoEl) {
      observer.observe(lastVideoEl);
    }

    return () => observer.disconnect();
  }, [allVideos, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Initial load
  useEffect(() => {
    if (allVideos.length === 0 && !isLoading) {
      fetchNextPage();
    }
  }, [allVideos.length, isLoading, fetchNextPage]);

  // Prepare videos with ads
  const videosWithAds = allVideos.reduce<(VideoWithUser | 'ad')[]>((acc, video, index) => {
    // Add the current video
    acc.push(video);
    
    // Possibly add an ad after every 3rd video (excluding the very first one)
    if (index > 0 && (index + 1) % 3 === 0 && showAd()) {
      acc.push('ad');
    }
    
    return acc;
  }, []);

  return (
    <motion.div 
      className="h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div ref={containerRef} className="video-container h-full overflow-y-auto snap-y snap-mandatory no-scrollbar">
        {isLoading && allVideos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {videosWithAds.map((item, index) => (
              item === 'ad' ? (
                currentAd && (
                  <div key={`ad-${index}`} className="video-post snap-start snap-always h-screen">
                    <AdVideoPost ad={currentAd} />
                  </div>
                )
              ) : (
                <div key={item.id} className="video-post snap-start snap-always h-screen">
                  <VideoPost 
                    video={item} 
                    isPlaying={currentlyPlayingId === item.id}
                    registerVideo={registerVideo} 
                  />
                </div>
              )
            ))}
            
            {(isFetchingNextPage || isLoading) && (
              <div className="flex justify-center items-center p-4 h-20">
                <Loader className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Home;
