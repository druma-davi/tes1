import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, LogOut, Trash2, Lock, Bell, Globe, Settings as SettingsIcon, HelpCircle, 
  FileText, Shield, Moon, Loader
} from 'lucide-react';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
  ];
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  
  // Video quality options
  const videoQualities = ['Auto', '720p', '480p', '360p'];
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in');
      
      const res = await fetch(`/api/users/${user.id}`, {
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
      logout();
      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };
  
  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
  };

  const SettingsItem = ({ 
    icon: Icon, 
    title, 
    description = null, 
    action = null, 
    onClick = () => {}
  }: {
    icon: any;
    title: string;
    description?: React.ReactNode | null;
    action?: React.ReactNode | null;
    onClick?: () => void;
  }) => (
    <button 
      className="w-full px-4 py-3 flex items-center justify-between"
      onClick={onClick}
    >
      <div className="flex items-center">
        <Icon className="text-gray-500 mr-3 w-5 h-5" />
        <div className="text-left">
          <span className="font-medium">{title}</span>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </button>
  );

  return (
    <motion.div 
      className="h-full overflow-y-auto pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        {/* Account Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Account</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-border">
            <div className="border-b border-border">
              <SettingsItem 
                icon={User} 
                title="Profile Information"
                onClick={() => navigate('/profile')}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
            <div className="border-b border-border">
              <SettingsItem 
                icon={Lock} 
                title="Privacy and Safety"
                onClick={() => {}}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
            <div>
              <SettingsItem 
                icon={Bell} 
                title="Notifications"
                onClick={() => {}}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
          </div>
        </div>
        
        {/* Content Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Content & Display</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-border">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <Moon className="text-gray-500 mr-3 w-5 h-5" />
                <span className="font-medium">Dark Mode</span>
              </div>
              <Switch 
                checked={darkMode} 
                onCheckedChange={handleDarkModeToggle}
              />
            </div>
            <div className="border-b border-border">
              <SettingsItem 
                icon={Globe} 
                title="Language"
                action={
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2 text-sm">
                      {languages.find(l => l.code === selectedLanguage)?.name || 'English'}
                    </span>
                    <span className="text-gray-400">→</span>
                  </div>
                }
                onClick={() => {
                  // Would open language selection dialog
                }}
              />
            </div>
            <div>
              <SettingsItem 
                icon={SettingsIcon} 
                title="Video Quality"
                action={
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2 text-sm">{selectedQuality}</span>
                    <span className="text-gray-400">→</span>
                  </div>
                }
                onClick={() => {
                  // Would open video quality selection dialog
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Support & About */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Support & About</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-border">
            <div className="border-b border-border">
              <SettingsItem 
                icon={HelpCircle} 
                title="Help Center"
                onClick={() => {}}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
            <div className="border-b border-border">
              <SettingsItem 
                icon={FileText} 
                title="Terms of Service"
                onClick={() => {}}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
            <div>
              <SettingsItem 
                icon={Shield} 
                title="Privacy Policy"
                onClick={() => {}}
                action={<span className="text-gray-400">→</span>}
              />
            </div>
          </div>
        </div>
        
        {/* Account Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Account Actions</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-border">
            <div className="border-b border-border">
              <button 
                className="w-full px-4 py-3 flex items-center text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
            <div>
              <button 
                className="w-full px-4 py-3 flex items-center text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-3 w-5 h-5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* App Info */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">Tik Fans v1.0.0</p>
          <p className="text-xs mt-1">© 2023 Tik Fans. All rights reserved.</p>
        </div>
      </div>

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

export default SettingsPage;
