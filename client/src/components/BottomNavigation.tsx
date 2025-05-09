import { useLocation } from 'wouter';
import { Home, Compass, PlusCircle, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

const BottomNavigation = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => location === path;
  
  const navigateToPath = (path: string) => {
    // Apply smooth animation for navigation
    navigate(path);
  };
  
  const navigateToProfile = () => {
    if (user) {
      navigate(`/profile/${user.id}`);
    } else {
      navigate('/profile');
    }
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border flex items-center justify-around z-40 h-16">
      <button 
        className={`flex flex-col items-center justify-center py-2 px-4 ${
          isActive('/') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => navigateToPath('/')}
      >
        <Home className={`h-6 w-6 ${isActive('/') ? 'text-primary' : ''}`} />
        <span className="text-xs mt-1">Home</span>
        {isActive('/') && (
          <motion.div 
            className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full"
            layoutId="bottomNav"
          />
        )}
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-4 ${
          isActive('/discover') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => navigateToPath('/discover')}
      >
        <Compass className={`h-6 w-6 ${isActive('/discover') ? 'text-primary' : ''}`} />
        <span className="text-xs mt-1">Discover</span>
        {isActive('/discover') && (
          <motion.div 
            className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full"
            layoutId="bottomNav"
          />
        )}
      </button>
      
      <button 
        className="flex flex-col items-center justify-center py-2 px-5"
        onClick={() => navigateToPath('/upload')}
      >
        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center">
          <PlusCircle className="h-6 w-6" />
        </div>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-4 ${
          isActive('/settings') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => navigateToPath('/settings')}
      >
        <Settings className={`h-6 w-6 ${isActive('/settings') ? 'text-primary' : ''}`} />
        <span className="text-xs mt-1">Settings</span>
        {isActive('/settings') && (
          <motion.div 
            className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full"
            layoutId="bottomNav"
          />
        )}
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-4 ${
          location.startsWith('/profile') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={navigateToProfile}
      >
        <User className={`h-6 w-6 ${location.startsWith('/profile') ? 'text-primary' : ''}`} />
        <span className="text-xs mt-1">Profile</span>
        {location.startsWith('/profile') && (
          <motion.div 
            className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full"
            layoutId="bottomNav"
          />
        )}
      </button>
    </nav>
  );
};

export default BottomNavigation;
