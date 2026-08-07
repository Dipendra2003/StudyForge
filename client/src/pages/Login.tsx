import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to intended page or dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirect: Admin users go to admin panel, regular users go to dashboard
      let redirectPath;
      
      if (user.role === 'admin') {
        // Admin users should go to admin panel. If stored redirect is not an admin route, default to '/admin'
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
        redirectPath = (storedRedirect && storedRedirect.startsWith('/admin')) ? storedRedirect : '/admin';
      } else {
        // Regular users always go to dashboard or intended non-admin route after login
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
        redirectPath = (storedRedirect && !storedRedirect.startsWith('/admin')) ? storedRedirect : '/dashboard';
      }
      
      // Clear the redirect flags
      sessionStorage.removeItem('redirectAfterLogin');
      sessionStorage.removeItem('lastVisitedPage');
      
      setLocation(redirectPath);
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs before submitting
    if (!identifier || !identifier.trim()) {
      setError('Username/Email and password are required');
      return;
    }
    
    if (!password || !password.trim()) {
      setError('Username/Email and password are required');
      return;
    }
    
    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
      
      // Show success toast
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      // Navigation will happen automatically via useEffect when isAuthenticated becomes true
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      
      // Show specific error messages
      if (errorMessage.includes('not verified')) {
        toast({
          title: 'Email not verified',
          description: 'Please check your email and verify your account.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('locked')) {
        toast({
          title: 'Account locked',
          description: 'Your account has been temporarily locked due to too many failed login attempts.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('Invalid credentials')) {
        toast({
          title: 'Login failed',
          description: 'Invalid username/email or password.',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <LogIn className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your StudyForge account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
