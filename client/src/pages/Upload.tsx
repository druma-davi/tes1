import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';
import { motion } from 'framer-motion';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useLocation } from 'wouter';
import { Upload as UploadIcon, Loader2, CheckCircle, X, Image } from 'lucide-react';

const Upload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(2); // Default to third thumbnail
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HCaptcha>(null);
  
  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  const uploadVideoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload video');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Your video has been uploaded successfully!",
        variant: "default",
      });
      
      // Reset form and navigate to home
      setFile(null);
      setPreview(null);
      setTitle('');
      setDescription('');
      setIsUploading(false);
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your video",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  const handleFileSelection = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be less than 100MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Create video preview
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  const handleRemoveVideo = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (!file) {
      toast({
        title: "No video selected",
        description: "Please select a video to upload",
        variant: "destructive",
      });
      return;
    }
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a title for your video",
        variant: "destructive",
      });
      return;
    }
    
    if (!captchaToken) {
      toast({
        title: "Captcha required",
        description: "Please complete the captcha verification",
        variant: "destructive",
      });
      captchaRef.current?.execute();
      return;
    }
    
    // Prepare form data for upload
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('isPrivate', visibility === 'private' ? 'true' : 'false');
    formData.append('captchaToken', captchaToken);
    formData.append('thumbnailIndex', selectedThumbnail.toString());
    
    setIsUploading(true);
    uploadVideoMutation.mutate(formData);
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  return (
    <motion.div 
      className="h-full overflow-y-auto pb-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Video</h1>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Upload Area */}
          {!preview ? (
            <div 
              className="border-2 border-dashed border-primary/50 rounded-xl p-6 text-center"
              onClick={handleFileSelection}
            >
              <div className="mb-4">
                <UploadIcon className="mx-auto h-12 w-12 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Drag and drop your video or</h3>
              <button 
                type="button" 
                className="bg-primary text-white px-4 py-2 rounded-lg inline-flex items-center btn-primary-animate"
              >
                <i className="fas fa-plus mr-2"></i>
                Select Video
              </button>
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <p className="text-sm text-dark-gray mt-3">MP4 format, max 1 minute, max size 100MB</p>
            </div>
          ) : (
            <div>
              <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden mb-3">
                <video className="w-full h-full object-contain" controls src={preview}></video>
              </div>
              <button 
                type="button" 
                className="text-red-500 text-sm font-medium flex items-center"
                onClick={handleRemoveVideo}
              >
                <X className="w-4 h-4 mr-1" />
                Remove video
              </button>
            </div>
          )}
          
          {/* Video Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="video-title" className="block text-sm font-medium mb-1">Title</label>
              <input 
                type="text" 
                id="video-title" 
                className="w-full px-3 py-2 border border-light-gray rounded-lg focus:outline-none focus:border-primary" 
                placeholder="Add a title" 
                required 
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="video-description" className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                id="video-description" 
                rows={3} 
                className="w-full px-3 py-2 border border-light-gray rounded-lg focus:outline-none focus:border-primary" 
                placeholder="Add a description" 
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            
            {preview && (
              <div>
                <label className="block text-sm font-medium mb-1">Cover</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={index}
                      className={`aspect-square rounded-lg bg-black/10 flex items-center justify-center border cursor-pointer ${
                        selectedThumbnail === index ? 'border-primary' : 'border-light-gray'
                      }`}
                      onClick={() => setSelectedThumbnail(index)}
                    >
                      <Image className={`w-6 h-6 ${selectedThumbnail === index ? 'text-primary' : 'text-dark-gray'}`} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-dark-gray">Select a thumbnail or upload your own</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <div className="flex items-center justify-between bg-light-gray/50 rounded-lg p-3">
                <span>Who can watch this video?</span>
                <select 
                  className="bg-white border border-light-gray rounded-lg px-2 py-1"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="everyone">Everyone</option>
                  <option value="followers">Followers only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            
            {/* hCaptcha Area */}
            <div className="bg-light-gray/50 p-4 rounded-lg border border-light-gray flex items-center justify-center min-h-24">
              <HCaptcha
                sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
                onVerify={handleCaptchaVerify}
                ref={captchaRef}
              />
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full bg-primary text-white py-3 rounded-lg font-medium btn-primary-animate flex items-center justify-center"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post Video
                </>
              )}
            </button>
          </div>
        </form>
        
        {showLoginModal && (
          <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => {
              setShowLoginModal(false);
              navigate('/');
            }} 
          />
        )}
      </div>
    </motion.div>
  );
};

export default Upload;
