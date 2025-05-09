import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google';

import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Discover from "@/pages/Discover";
import Upload from "@/pages/Upload";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="flex flex-col h-screen bg-light overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Switch location={location} key={location}>
            <Route path="/" component={Home} />
            <Route path="/discover" component={Discover} />
            <Route path="/upload" component={Upload} />
            <Route path="/settings" component={Settings} />
            <Route path="/profile/:id?" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </main>
      
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
