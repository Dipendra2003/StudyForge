import { useState, useEffect, createContext, useContext } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
// Import pre-configured query client
import queryClient from "@/lib/queryClient";
import DynamicBackground from "@/components/DynamicBackground";
import WelcomeModal from "@/components/WelcomeModal";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CodeGenerator from "@/pages/CodeGenerator";
import Chat from "@/pages/Chat";
import DocumentSummarization from "@/pages/DocumentSummarization";
import Flashcards from "@/pages/Flashcards";
import StudyPlanner from "@/pages/StudyPlanner";
import QuizMode from "@/pages/QuizMode";
import About from "@/pages/About";
import Policy from "@/pages/Policy";
import Terms from "@/pages/Terms";
import Pricing from "@/pages/Pricing";

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  preferredLanguage?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => {
  return useContext(AuthContext);
};

// HomePage component to redirect users based on authentication status
// Import the Home page (landing page)
import Home from "@/pages/Home";

function HomePage() {
  return <Home />;
}

function PrivateRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; path: string }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  return isAuthenticated ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <PrivateRoute path="/dashboard" component={Dashboard} />
      <PrivateRoute path="/code-generator" component={CodeGenerator} />
      <PrivateRoute path="/chat" component={Chat} />
      <PrivateRoute path="/document-summarization" component={DocumentSummarization} />
      <PrivateRoute path="/flashcards" component={Flashcards} />
      <PrivateRoute path="/study-planner" component={StudyPlanner} />
      <PrivateRoute path="/quiz-mode" component={QuizMode} />
      <Route path="/about" component={About} />
      <Route path="/privacy-policy" component={Policy} />
      <Route path="/terms" component={Terms} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/" component={HomePage} />
    </Switch>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="jadoo-theme">
        <DynamicBackground />
        <AuthProvider>
          {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcomeModal} />}
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;