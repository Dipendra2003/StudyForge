import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
// Import pre-configured query client
import queryClient from "@/lib/queryClient";
import DynamicBackground from "@/components/DynamicBackground";
import WelcomeModal from "@/components/WelcomeModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Dashboard from "@/pages/Dashboard";
import CodeGenerator from "@/pages/CodeGenerator";
import Chat from "@/pages/Chat";
import DocumentSummarization from "@/pages/DocumentSummarization";
import Flashcards from "@/pages/Flashcards";
import StudyPlanner from "@/pages/StudyPlanner";
import QuizMode from "@/pages/QuizMode";
import SharedQuiz from "@/pages/SharedQuiz";
import About from "@/pages/About";
import Policy from "@/pages/Policy";
import Terms from "@/pages/Terms";
import Pricing from "@/pages/Pricing";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import AuthDebug from "@/pages/AuthDebug";

// Auth context is now imported from @/contexts/AuthContext

// HomePage component to redirect users based on authentication status
// Import the Home page (landing page)
import Home from "@/pages/Home";

function HomePage() {
  return <Home />;
}

function PrivateRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; path: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  console.log('[PrivateRoute]', rest.path, '- isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

  // Use effect to handle redirect to avoid setState during render
  useEffect(() => {
    console.log('[PrivateRoute] useEffect', rest.path, '- isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (!isLoading && !isAuthenticated) {
      console.log('[PrivateRoute] Redirecting to /login from', rest.path);
      // Store the current path to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', location);
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation, location]);

  // Show loading state while checking authentication
  if (isLoading) {
    console.log('[PrivateRoute] Showing loading spinner for', rest.path);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show nothing (redirect will happen in useEffect)
  if (!isAuthenticated) {
    console.log('[PrivateRoute] Not authenticated, returning null for', rest.path);
    return null;
  }

  console.log('[PrivateRoute] Rendering component for', rest.path);
  return <Component {...rest} />;
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Store the current page in sessionStorage whenever location changes (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Only store private routes
      const privateRoutes = ['/dashboard', '/chat', '/document-summarization', '/flashcards', '/quiz-mode', '/code-generator', '/study-planner', '/profile', '/settings', '/help'];
      if (privateRoutes.some(route => location.startsWith(route))) {
        sessionStorage.setItem('lastVisitedPage', location);
        console.log('[Router] Stored last visited page:', location);
      }
    }
  }, [location, isAuthenticated, isLoading]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <PrivateRoute path="/dashboard" component={Dashboard} />
      <PrivateRoute path="/code-generator" component={CodeGenerator} />
      <PrivateRoute path="/chat" component={Chat} />
      <PrivateRoute path="/document-summarization" component={DocumentSummarization} />
      <PrivateRoute path="/flashcards" component={Flashcards} />
      <PrivateRoute path="/study-planner" component={StudyPlanner} />
      <PrivateRoute path="/quiz-mode" component={QuizMode} />
      <Route path="/quiz/shared/:linkId" component={SharedQuiz} />
      <PrivateRoute path="/profile" component={Profile} />
      <PrivateRoute path="/settings" component={Settings} />
      <PrivateRoute path="/help" component={Help} />
      <Route path="/about" component={About} />
      <Route path="/privacy-policy" component={Policy} />
      <Route path="/terms" component={Terms} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/auth-debug" component={AuthDebug} />
      <Route path="/" component={HomePage} />
    </Switch>
  );
}

// AuthProvider is now imported from @/contexts/AuthContext
// We're using the pre-configured query client from the import at the top of this file

function App() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisitedBefore = localStorage.getItem('jadoo-welcomed');
    
    if (!hasVisitedBefore) {
      setShowWelcomeModal(true);
      localStorage.setItem('jadoo-welcomed', 'true');
    }
  }, []);
  
  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
  };
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="jadoo-theme">
          {/* Skip to main content link for keyboard navigation */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
          >
            Skip to main content
          </a>
          <DynamicBackground />
          <AuthProvider>
            {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcomeModal} />}
            <Router />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;