import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { CommentWithUser } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import LoginModal from './LoginModal';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { X, Heart, Reply, Loader, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: number;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, videoId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  
  // Fetch comments for this video
  const { data: comments, isLoading } = useQuery({
    queryKey: [`/api/videos/${videoId}/comments`],
    queryFn: async () => {
      if (!isOpen) return null; // Don't fetch if modal is closed
      const response = await fetch(`/api/videos/${videoId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json() as Promise<CommentWithUser[]>;
    },
    enabled: isOpen,
  });
  
  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId: number | null }) => {
      return apiRequest('POST', `/api/videos/${videoId}/comments`, data);
    },
    onSuccess: () => {
      setCommentText('');
      setReplyToId(null);
      setReplyToUsername(null);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      toast({
        title: 'Comment posted',
        description: 'Your comment has been posted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post comment',
        variant: 'destructive',
      });
    }
  });
  
  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest('POST', `/api/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to like comment',
        variant: 'destructive',
      });
    }
  });
  
  // Handle submitting a comment
  const handleSubmitComment = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (!commentText.trim()) {
      toast({
        title: 'Empty comment',
        description: 'Please enter a comment',
        variant: 'destructive',
      });
      return;
    }
    
    postCommentMutation.mutate({
      content: commentText,
      parentId: replyToId,
    });
  };
  
  // Handle reply to comment
  const handleReplyToComment = (commentId: number, username: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    setReplyToId(commentId);
    setReplyToUsername(username);
    // Focus on input
    document.getElementById('comment-input')?.focus();
  };
  
  // Cancel reply
  const cancelReply = () => {
    setReplyToId(null);
    setReplyToUsername(null);
  };
  
  // Handle like comment
  const handleLikeComment = (commentId: number) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    likeCommentMutation.mutate(commentId);
  };
  
  // Reset state when closing modal
  useEffect(() => {
    if (!isOpen) {
      setCommentText('');
      setReplyToId(null);
      setReplyToUsername(null);
    }
  }, [isOpen]);
  
  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Just now';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md p-0 h-[80vh] flex flex-col">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Comments ({comments?.length || 0})</DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex">
                    <Avatar className="h-9 w-9 mr-3">
                      <AvatarImage 
                        src={comment.user.avatar || undefined} 
                        alt={comment.user.username} 
                      />
                      <AvatarFallback>{comment.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="font-medium text-sm">@{comment.user.username}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                      
                      <p className="text-sm my-1">{comment.content}</p>
                      
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                        <button 
                          className="flex items-center mr-4" 
                          onClick={() => handleLikeComment(comment.id)}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          <span>{comment.likes}</span>
                        </button>
                        
                        <button 
                          className="flex items-center" 
                          onClick={() => handleReplyToComment(comment.id, comment.user.username)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          <span>Reply</span>
                        </button>
                      </div>
                      
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-6 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage 
                                  src={reply.user.avatar || undefined} 
                                  alt={reply.user.username} 
                                />
                                <AvatarFallback>{reply.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <div className="flex items-center">
                                  <p className="font-medium text-sm">@{reply.user.username}</p>
                                  <p className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                                    {formatDate(reply.createdAt)}
                                  </p>
                                </div>
                                
                                <p className="text-sm my-1">{reply.content}</p>
                                
                                <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                                  <button 
                                    className="flex items-center mr-4"
                                    onClick={() => handleLikeComment(reply.id)}
                                  >
                                    <Heart className="h-3 w-3 mr-1" />
                                    <span>{reply.likes}</span>
                                  </button>
                                  
                                  <button 
                                    className="flex items-center"
                                    onClick={() => handleReplyToComment(comment.id, reply.user.username)}
                                  >
                                    <Reply className="h-3 w-3 mr-1" />
                                    <span>Reply</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
          
          {/* Comment Input */}
          <div className="p-3 border-t">
            {replyToUsername && (
              <div className="flex items-center justify-between mb-2 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
                <span>
                  Replying to <span className="font-medium">@{replyToUsername}</span>
                </span>
                <button onClick={cancelReply} className="text-gray-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center">
              <Avatar className="h-9 w-9 mr-2">
                <AvatarImage 
                  src={user?.avatar || undefined} 
                  alt={user?.username || 'Guest'} 
                />
                <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'G'}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 relative">
                <Input 
                  id="comment-input"
                  type="text" 
                  placeholder="Add a comment..." 
                  className="pr-12 bg-gray-100 dark:bg-gray-800 rounded-full"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                />
                
                <Button 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-primary"
                  variant="ghost"
                  size="icon"
                  disabled={postCommentMutation.isPending || !commentText.trim()}
                  onClick={handleSubmitComment}
                >
                  {postCommentMutation.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};

export default CommentsModal;
