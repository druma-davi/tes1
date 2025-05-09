import { useQuery } from '@tanstack/react-query';
import { VideoWithUser } from '@shared/schema';
import { useLocation } from 'wouter';
import { Loader } from 'lucide-react';
import { motion } from 'framer-motion';

const Discover = () => {
  const [, navigate] = useLocation();

  // Fetch trending videos
  const { data: trendingVideos, isLoading: trendingLoading } = useQuery({
    queryKey: ['/api/videos', { limit: 4, sortBy: 'trending' }],
    queryFn: () => fetch('/api/videos?limit=4&sortBy=trending').then(res => res.json()) as Promise<VideoWithUser[]>,
  });

  // Fetch recommended videos
  const { data: recommendedVideos, isLoading: recommendedLoading } = useQuery({
    queryKey: ['/api/videos', { limit: 6, recommended: true }],
    queryFn: () => fetch('/api/videos?limit=6&recommended=true').then(res => res.json()) as Promise<VideoWithUser[]>,
  });

  const handleVideoClick = (videoId: number) => {
    navigate(`/?video=${videoId}`);
  };

  const categories = [
    { icon: 'music', name: 'Music' },
    { icon: 'utensils', name: 'Food' },
    { icon: 'gamepad', name: 'Gaming' },
    { icon: 'tshirt', name: 'Fashion' },
    { icon: 'dumbbell', name: 'Fitness' },
    { icon: 'ellipsis-h', name: 'More' }
  ];

  return (
    <motion.div 
      className="h-full overflow-y-auto pb-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Trending Now</h2>
          {trendingLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {trendingVideos?.map(video => (
                <div 
                  key={video.id} 
                  className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <img 
                    src={video.thumbnailUrl || '/placeholder-thumbnail.jpg'} 
                    alt={video.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2">
                    <div className="flex items-center">
                      <img 
                        src={video.user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(video.user.username)} 
                        alt={video.user.username} 
                        className="w-6 h-6 rounded-full mr-1"
                      />
                      <p className="text-white text-xs truncate">@{video.user.username}</p>
                    </div>
                    <p className="text-white text-xs font-medium truncate">{video.title}</p>
                    <div className="flex items-center text-white text-xs mt-1">
                      <i className="fas fa-heart mr-1 text-xs"></i>
                      <span>{video.likes}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded">
                    <i className="fas fa-fire-alt mr-0.5"></i>
                    <span>Trending</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">For You</h2>
          {recommendedLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recommendedVideos?.map(video => (
                <div 
                  key={video.id} 
                  className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <img 
                    src={video.thumbnailUrl || '/placeholder-thumbnail.jpg'} 
                    alt={video.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-1">
                    <p className="text-white text-xs font-medium truncate">{video.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
              <button 
                key={index} 
                className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center"
              >
                <i className={`fas fa-${category.icon} text-primary text-xl mr-3`}></i>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Discover;
