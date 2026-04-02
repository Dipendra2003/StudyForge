import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const checkToken = () => {
    const token = localStorage.getItem('accessToken');
    alert(`Token exists: ${!!token}\nToken: ${token?.substring(0, 50)}...`);
  };

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Auth State:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(
                {
                  isLoading,
                  isAuthenticated,
                  user,
                  hasToken: !!localStorage.getItem('accessToken'),
                },
                null,
                2
              )}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={checkToken}>Check Token</Button>
            <Button onClick={clearAuth} variant="destructive">
              Clear Auth & Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
