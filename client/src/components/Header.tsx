import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Determine page title based on current location
  const getPageTitle = () => {
    if (location === '/discover') return 'Discover';
    if (location === '/upload') return 'Upload';
    if (location === '/settings') return 'Settings';
    if (location.startsWith('/profile')) return 'Profile';
    return 'Tik Fans';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isSearchOpen ? (
          <motion.form 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            exit={{ opacity: 0, width: 0 }}
            onSubmit={handleSearch}
            className="flex items-center"
          >
            <Input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              autoFocus
            />
            <button 
              type="button" 
              className="ml-2 text-gray-500" 
              onClick={toggleSearch}
            >
              <X className="h-5 w-5" />
            </button>
          </motion.form>
        ) : (
          <>
            <i className="fas fa-video text-primary text-2xl"></i>
            <span className="font-bold text-xl">{getPageTitle()}</span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {!isSearchOpen && (
          <>
            <button 
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" 
              onClick={toggleSearch}
            >
              <Search className="h-5 w-5" />
            </button>
            
            <button 
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" 
              onClick={toggleNotifications}
            >
              <Bell className="h-5 w-5" />
            </button>
            
            {user && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar || undefined} alt={user.username} />
                <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </>
        )}
      </div>
      
      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            className="absolute top-full right-0 mt-1 w-72 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <div className="p-4">
              {/* Notification items would go here */}
              <p className="text-center text-gray-500 text-sm">No new notifications</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
