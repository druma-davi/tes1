import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { useInView } from 'react-intersection-observer';
import { Heart, ThumbsDown, MessageCircle, Share2, MoreVertical } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { VideoWithUser } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import CommentsModal from './CommentsModal';
import { useToast } from '@/hooks/use-toast';

interface VideoPostProps {
  video: VideoWithUser;
  isPlaying: boolean;
  registerVideo: (id: number, inView: boolean) => void;
}

const VideoPost: React.FC<VideoPostProps> = ({ video, isPlaying, registerVideo }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const playerRef = useRef<ReactPlayer>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [dislikeCount, setDislikeCount] = useState(video.dislikes);
  const [showComments, setShowComments] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Use intersection observer to determine if video is in view
  const { ref, inView } = useInView({
    threshold: 0.5,
  });
  
  // Register this video with the parent component's visible video tracking
  useEffect(() => {
    registerVideo(video.id, inView);
  }, [inView, video.id, registerVideo]);
  
  // Reset player when video changes
  useEffect(() => {
    if (playerRef.current && !isPlaying) {
      playerRef.current.seekTo(0);
    }
  }, [isPlaying]);
  
  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${video.id}/like`);
    },
    onSuccess: () => {
      if (!isLiked) {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        
        // If user previously disliked, remove dislike
        if (isDisliked) {
          setDislikeCount(prev => prev - 1);
          setIsDisliked(false);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to like video',
        variant: 'destructive',
      });
    }
  });
  
  // Dislike mutation
  const dislikeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${video.id}/dislike`);
    },
    onSuccess: () => {
      if (!isDisliked) {
        setDislikeCount(prev => prev + 1);
        setIsDisliked(true);
        
        // If user previously liked, remove like
        if (isLiked) {
          setLikeCount(prev => prev - 1);
          setIsLiked(false);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to dislike video',
        variant: 'destructive',
      });
    }
  });
  
  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to follow users');
      
      const method = isFollowing ? 'DELETE' : 'POST';
      return apiRequest(method, `/api/users/${video.user.id}/follow`);
    },
    onSuccess: () => {
      setIsFollowing(prev => !prev);
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: isFollowing 
          ? `You are no longer following ${video.user.username}`
          : `You are now following ${video.user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  });
  
  const handleLike = () => {
    likeMutation.mutate();
  };
  
  const handleDislike = () => {
    dislikeMutation.mutate();
  };
  
  const handleComments = () => {
    setShowComments(true);
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this video: ${video.title}`,
        url: `${window.location.origin}/?video=${video.id}`,
      }).catch(error => {
        console.log('Error sharing:', error);
      });
    } else {
      toast({
        title: 'Share',
        description: 'Copy link: ' + `${window.location.origin}/?video=${video.id}`,
      });
    }
  };
  
  const handleFollow = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to follow users',
        variant: 'destructive',
      });
      return;
    }
    
    followMutation.mutate();
  };
  
  const handleMoreOptions = () => {
    setShowOptions(!showOptions);
  };
  
  return (
    <div ref={ref} className="relative h-screen bg-black">
      {/* Video Player */}
      <div className="absolute inset-0">
        <ReactPlayer
          ref={playerRef}
          url={video.videoUrl}
          playing={isPlaying}
          loop
          muted={!isPlaying}
          width="100%"
          height="100%"
          controls={false}
          playsinline
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload',
                disablePictureInPicture: true,
              },
            },
          }}
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* Video Interaction Buttons (Right Side) */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-10">
        <button 
          className="flex flex-col items-center" 
          onClick={handleLike}
        >
          <Heart 
            className={`text-white h-8 w-8 mb-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
          />
          <span className="text-white text-xs">{likeCount}</span>
        </button>
        
        <button 
          className="flex flex-col items-center" 
          onClick={handleDislike}
        >
          <ThumbsDown 
            className={`text-white h-7 w-7 mb-1 ${isDisliked ? 'fill-white' : ''}`} 
          />
          <span className="text-white text-xs">{dislikeCount}</span>
        </button>
        
        <button 
          className="flex flex-col items-center" 
          onClick={handleComments}
        >
          <MessageCircle className="text-white h-7 w-7 mb-1" />
          <span className="text-white text-xs">{video.commentsCount}</span>
        </button>
        
        <button 
          className="flex flex-col items-center" 
          onClick={handleShare}
        >
          <Share2 className="text-white h-7 w-7 mb-1" />
          <span className="text-white text-xs">Share</span>
        </button>
        
        <button 
          className="flex flex-col items-center" 
          onClick={handleMoreOptions}
        >
          <MoreVertical className="text-white h-7 w-7" />
        </button>
      </div>

      {/* Video Info (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
        <div className="flex items-center mb-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage 
              src={video.user.avatar || undefined} 
              alt={video.user.username} 
            />
            <AvatarFallback>{video.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1">
            <p className="text-white font-medium">@{video.user.username}</p>
            <p className="text-white/80 text-sm">{video.user.name || ''}</p>
          </div>
          
          <Button 
            className={`${isFollowing ? 'bg-transparent border border-white text-white' : 'bg-primary text-white'} 
              px-4 py-1.5 rounded-full text-sm font-medium btn-primary-animate h-8`}
            onClick={handleFollow}
            disabled={followMutation.isPending}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>
        
        <div className="text-white mb-12">
          <p className="font-medium mb-1">{video.title}</p>
          <p className="text-sm">{video.description}</p>
        </div>
      </div>
      
      {/* Comments Modal */}
      <CommentsModal 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
        videoId={video.id}
      />
      
      {/* Options Menu */}
      {showOptions && (
        <div className="absolute right-12 bottom-24 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 p-2 min-w-36">
          <button 
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              setShowOptions(false);
              // Implement "Not interested" functionality
            }}
          >
            Not interested
          </button>
          <button 
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
            onClick={() => {
              setShowOptions(false);
              // Implement report functionality
            }}
          >
            Report
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPost;
