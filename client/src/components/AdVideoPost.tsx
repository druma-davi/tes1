import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { ExternalLink, Clock } from 'lucide-react';
import { Ad } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AdVideoPostProps {
  ad: Ad;
}

const AdVideoPost: React.FC<AdVideoPostProps> = ({ ad }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Track ad viewing time
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setSecondsWatched(prev => {
        const newSeconds = prev + 1;
        if (newSeconds >= 10 && !canSkip) {
          setCanSkip(true);
        }
        return newSeconds;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, canSkip]);
  
  // Handle player progress
  const handleProgress = (state: { playedSeconds: number }) => {
    if (state.playedSeconds >= 10 && !canSkip) {
      setCanSkip(true);
    }
  };
  
  const handleActionClick = () => {
    if (ad.actionUrl) {
      window.open(ad.actionUrl, '_blank');
    }
  };
  
  return (
    <div className="relative h-screen bg-black">
      {/* Video Player */}
      <div className="absolute inset-0">
        <ReactPlayer
          ref={playerRef}
          url={ad.videoUrl}
          playing={isPlaying}
          loop={false}
          muted={false}
          width="100%"
          height="100%"
          controls={false}
          onProgress={handleProgress}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
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
      
      {/* Ad Label */}
      <div className="absolute top-4 right-4 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded z-10">
        Advertisement
      </div>
      
      {/* Skip Button (appears after 10 seconds) */}
      <div className={`absolute bottom-28 right-4 z-10 ${canSkip ? 'opacity-100' : 'opacity-50'}`}>
        <Button 
          variant="secondary" 
          size="sm" 
          className="bg-black/70 text-white hover:bg-black/90 flex items-center space-x-1"
          disabled={!canSkip}
          onClick={() => window.history.go(0)} // Refresh page to skip ad
        >
          {canSkip ? (
            <>
              <span>Skip Ad</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 mr-1" />
              <span>Skip in {10 - secondsWatched}s</span>
            </>
          )}
        </Button>
      </div>
      
      {/* Ad Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
        <div className="flex items-center mb-2">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage 
              src={ad.brandLogo || undefined} 
              alt={ad.brandName} 
            />
            <AvatarFallback>{ad.brandName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1">
            <p className="text-white font-medium">{ad.brandName}</p>
            <p className="text-white/80 text-xs">Sponsored</p>
          </div>
          
          <Button 
            className="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-medium btn-primary-animate h-8"
            onClick={handleActionClick}
          >
            Learn More
          </Button>
        </div>
        
        <div className="text-white mb-12">
          <p className="font-medium mb-1">{ad.title}</p>
          <p className="text-sm">{ad.description}</p>
        </div>
      </div>
    </div>
  );
};

export default AdVideoPost;
