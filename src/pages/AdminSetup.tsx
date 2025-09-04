import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Shield, CheckCircle, User, Users } from 'lucide-react';

export default function AdminSetup() {
  const { user } = useAuth();
  const [email, setEmail] = useState('admin@system.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const createFreshAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create a completely new admin account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: 'System',
            last_name: 'Admin'
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (signUpError && !signUpError.message.includes('already been registered')) {
        throw signUpError;
      }

      // Try to sign in immediately
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      setSuccess('New admin account created and logged in successfully! Redirecting...');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err: any) {
      setError(`Failed to create admin: ${err.message}`);
    }
    setLoading(false);
  };

  const tryCredential = async (email: string, password: string, label: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSuccess(`${label} login successful! Redirecting...`);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err: any) {
      setError(`${label} login failed: ${err.message}`);
    }
    setLoading(false);
  };

  const tryOriginalLogin = () => tryCredential('krwibutso5@gmail.com', 'krwibutso123', 'Original');
  const tryAdminLogin = () => tryCredential('admin@system.com', 'admin123', 'Admin');
  const tryTestLogin = () => tryCredential('test@example.com', 'test123', 'Test');
  const tryDemoLogin = () => tryCredential('demo@test.com', 'demo123', 'Demo');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Setup</CardTitle>
          <CardDescription>
            Special setup page for admin account initialization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-3">
              <strong>Available Test Accounts:</strong>
            </div>
            
            <Button 
              onClick={tryOriginalLogin} 
              className="w-full" 
              disabled={loading}
              variant="default"
            >
              <User className="w-4 h-4 mr-2" />
              {loading ? 'Trying...' : 'Original Login (krwibutso5@gmail.com)'}
            </Button>
            
            <Button 
              onClick={tryAdminLogin} 
              variant="secondary" 
              className="w-full" 
              disabled={loading}
            >
              <Shield className="w-4 h-4 mr-2" />
              {loading ? 'Trying...' : 'Admin Login (admin@system.com)'}
            </Button>

            <Button 
              onClick={tryTestLogin} 
              variant="outline" 
              className="w-full" 
              disabled={loading}
            >
              <Users className="w-4 h-4 mr-2" />
              {loading ? 'Trying...' : 'Test Login (test@example.com)'}
            </Button>

            <Button 
              onClick={tryDemoLogin} 
              variant="outline" 
              className="w-full" 
              disabled={loading}
            >
              <Users className="w-4 h-4 mr-2" />
              {loading ? 'Trying...' : 'Demo Login (demo@test.com)'}
            </Button>
            
            <div className="text-center my-3">
              <span className="text-sm text-muted-foreground">or</span>
            </div>

            <Button 
              onClick={createFreshAdmin} 
              variant="destructive" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create New Admin Account'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-3 rounded-lg">
            <p><strong>Test Credentials (ready to use):</strong></p>
            <div className="grid grid-cols-1 gap-1">
              <p>• krwibutso5@gmail.com / krwibutso123</p>
              <p>• admin@system.com / admin123</p>
              <p>• test@example.com / test123</p>
              <p>• demo@test.com / demo123</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <Button variant="link" onClick={() => window.location.href = '/auth'}>
              Back to Regular Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}