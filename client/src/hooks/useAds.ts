import { useState, useEffect, useCallback } from 'react';
import { Ad } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export function useAds() {
  const [showAdChance, setShowAdChance] = useState(0.2); // 20% chance to show an ad
  const [adAlreadyShown, setAdAlreadyShown] = useState(false);
  
  // Fetch a random ad from the API
  const { data: ad, refetch } = useQuery({
    queryKey: ['/api/ads/random'],
    queryFn: async () => {
      const res = await fetch('/api/ads/random');
      // If no ad to show, API returns 204 No Content
      if (res.status === 204) {
        return null;
      }
      return res.json() as Promise<Ad>;
    },
    // Don't fetch on mount, we'll fetch when needed
    enabled: false,
  });
  
  // Function to determine if we should show an ad
  const showAd = useCallback(() => {
    // If we've already shown an ad in this session, don't show again
    if (adAlreadyShown) {
      return false;
    }
    
    // Random chance to show an ad
    const rand = Math.random();
    if (rand <= showAdChance) {
      // Only fetch if we decide to show an ad
      refetch();
      setAdAlreadyShown(true);
      return true;
    }
    
    return false;
  }, [adAlreadyShown, showAdChance, refetch]);
  
  // Reset ad already shown flag after a certain period (e.g., 5 minutes)
  useEffect(() => {
    if (adAlreadyShown) {
      const timer = setTimeout(() => {
        setAdAlreadyShown(false);
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearTimeout(timer);
    }
  }, [adAlreadyShown]);
  
  return {
    showAd,
    currentAd: ad,
  };
}
