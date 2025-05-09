import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useParams, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Loader, Camera, ExternalLink } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, VideoWithUser } from '@shared/schema';

type ProfileTab = 'videos' | 'liked' | 'private';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Determine if we're viewing our own profile or someone else's
  const isCurrentUserProfile = !id || (currentUser && id === currentUser.id.toString());
  const userId = isCurrentUserProfile && currentUser ? currentUser.id : id ? parseInt(id, 10) : 0;
  
  const [activeTab, setActiveTab] = useState<ProfileTab>('videos');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Fetch profile data
  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) {
        throw new Error('User not found');
      }
      return res.json() as Promise<User>;
    },
    enabled: userId > 0,
  });
  
  // Fetch user videos
  const { data: userVideos, isLoading: videosLoading } = useQuery({
    queryKey: [`/api/users/${userId}/videos`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/videos`);
      if (!res.ok) {
        throw new Error('Failed to fetch videos');
      }
      return res.json() as Promise<VideoWithUser[]>;
    },
    enabled: userId > 0,
  });
  
  // Check if current user is following this profile
  const { data: followData } = useQuery({
    queryKey: [`/api/users/${userId}/following`],
    queryFn: async () => {
      if (!currentUser) return { following: false };
      const res = await fetch(`/api/users/${userId}/following`, {
        credentials: 'include',
      });
      if (!res.ok) return { following: false };
      return res.json() as Promise<{ following: boolean }>;
    },
    enabled: !isCurrentUserProfile && !!currentUser && userId > 0,
  });
  
  // Update follow status when data changes
  useEffect(() => {
    if (followData) {
      setIsFollowing(followData.following);
    }
  }, [followData]);
  
  // Initialize edit form with profile data
  useEffect(() => {
    if (profileUser) {
      setEditName(profileUser.name || '');
      setEditBio(profileUser.bio || '');
    }
  }, [profileUser]);
  
  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('You must be logged in to follow users');
      
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`/api/users/${userId}/follow`, {
        method,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update follow status');
      }
      
      return res.json();
    },
    onSuccess: () => {
      setIsFollowing(prev => !prev);
      
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: isFollowing 
          ? `You are no longer following ${profileUser?.username || 'this user'}`
          : `You are now following ${profileUser?.username || 'this user'}`,
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/following`] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; bio?: string }) => {
      if (!currentUser) throw new Error('You must be logged in');
      
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
      
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('You must be logged in');
      
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete account');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account has been deleted successfully',
      });
      
      setShowDeleteDialog(false);
      
      // Log out and redirect to home
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        navigate('/');
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const handleFollow = () => {
    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to follow users',
        variant: 'destructive',
      });
      return;
    }
    
    followMutation.mutate();
  };
  
  const handleEditProfile = () => {
    setShowEditDialog(true);
  };
  
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ 
      name: editName,
      bio: editBio 
    });
  };
  
  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };
  
  const handleVideoClick = (videoId: number) => {
    navigate(`/?video=${videoId}`);
  };
  
  // Loading state
  if (profileLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  // Error state
  if (!profileUser && !profileLoading && userId > 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist</p>
        <Button onClick={() => navigate('/')}>Go back home</Button>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="h-full overflow-y-auto pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-primary/10 pt-6 pb-4">
        <div className="px-4 flex items-center">
          {/* Profile Image */}
          <div className="mr-4 relative">
            <img 
              src={profileUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.username || 'User')}&background=random`} 
              alt={`${profileUser?.username || 'User'} profile`} 
              className="w-20 h-20 rounded-full object-cover border-2 border-white" 
            />
            {isCurrentUserProfile && (
              <button 
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 shadow-md"
                onClick={handleEditProfile}
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="font-bold text-xl">@{profileUser?.username}</h2>
            <p className="text-dark-gray text-sm">{profileUser?.name || ''}</p>
            <div className="mt-2 flex items-center space-x-3 text-sm">
              <button className="font-medium">
                <span className="font-bold">{profileUser?.followingCount || 0}</span> Following
              </button>
              <button className="font-medium">
                <span className="font-bold">{profileUser?.followersCount || 0}</span> Followers
              </button>
            </div>
          </div>
          
          {/* Edit/Follow Button */}
          {isCurrentUserProfile ? (
            <button 
              className="border border-primary text-primary px-4 py-1.5 rounded-full text-sm font-medium"
              onClick={handleEditProfile}
            >
              Edit Profile
            </button>
          ) : (
            <button 
              className={`${isFollowing ? 'border border-primary text-primary' : 'bg-primary text-white'} px-4 py-1.5 rounded-full text-sm font-medium btn-primary-animate`}
              onClick={handleFollow}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                isFollowing ? 'Following' : 'Follow'
              )}
            </button>
          )}
        </div>
        
        {/* Bio */}
        <div className="px-4 mt-3">
          <p className="text-sm">{profileUser?.bio || 'No bio yet'}</p>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <div className="border-b border-light-gray">
        <div className="flex">
          <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'videos' ? 'border-b-2 border-primary text-primary' : 'text-dark-gray'}`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'liked' ? 'border-b-2 border-primary text-primary' : 'text-dark-gray'}`}
            onClick={() => setActiveTab('liked')}
          >
            Liked
          </button>
          {isCurrentUserProfile && (
            <button 
              className={`flex-1 py-3 text-center font-medium ${activeTab === 'private' ? 'border-b-2 border-primary text-primary' : 'text-dark-gray'}`}
              onClick={() => setActiveTab('private')}
            >
              Private
            </button>
          )}
        </div>
      </div>
      
      {/* Videos Grid */}
      <div className="p-1">
        {activeTab === 'videos' && (
          videosLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : userVideos && userVideos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {userVideos.map(video => (
                <div 
                  key={video.id} 
                  className="aspect-[9/16] relative cursor-pointer"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <img 
                    src={video.thumbnailUrl || '/placeholder-thumbnail.jpg'} 
                    alt={video.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-1 left-1 flex items-center">
                    <i className="fas fa-play text-white text-xs"></i>
                    <span className="text-white text-xs ml-1">{video.views}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-dark-gray">No videos yet</p>
              {isCurrentUserProfile && (
                <button 
                  className="mt-3 bg-primary text-white px-4 py-2 rounded-lg inline-flex items-center"
                  onClick={() => navigate('/upload')}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Upload a Video
                </button>
              )}
            </div>
          )
        )}
        
        {activeTab === 'liked' && (
          <div className="p-6 text-center">
            <p className="text-dark-gray">{isCurrentUserProfile ? 'Your liked videos will appear here' : 'Liked videos are private'}</p>
          </div>
        )}
        
        {activeTab === 'private' && isCurrentUserProfile && (
          <div className="p-6 text-center">
            <p className="text-dark-gray">Your private videos will appear here</p>
          </div>
        )}
      </div>
      
      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <img 
                  src={profileUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.username || 'User')}&background=random`} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover" 
                />
                <button className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 shadow-md">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-light-gray rounded-lg focus:outline-none focus:border-primary" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea 
                rows={3} 
                className="w-full px-3 py-2 border border-light-gray rounded-lg focus:outline-none focus:border-primary" 
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself" 
              ></textarea>
            </div>
            
            <div className="pt-2">
              <button 
                type="button" 
                className="text-red-500 text-sm font-medium flex items-center"
                onClick={() => {
                  setShowEditDialog(false);
                  setShowDeleteDialog(true);
                }}
              >
                <i className="fas fa-trash-alt mr-1"></i>
                Delete account
              </button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-destructive">
              All your videos, comments, and account information will be permanently removed.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Profile;
