import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Shield, CheckCircle } from 'lucide-react';

export default function AdminSetup() {
  const { user } = useAuth();
  const [email, setEmail] = useState('krwibutso5@gmail.com');
  const [password, setPassword] = useState('krwibutso123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleAdminLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First try regular sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          // If credentials are invalid, try to reset the password
          setError('Credentials invalid. Attempting to fix user account...');
          
          // Try to sign up again to reset the user
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: 'Admin',
                last_name: 'User',
              },
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (signUpError && !signUpError.message.includes('already been registered')) {
            throw signUpError;
          }

          // Wait a moment and try to sign in again
          setTimeout(async () => {
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (retryError) {
              setError('Failed to sign in after account setup. Please try the regular login page.');
            } else {
              setSuccess('Admin account setup successful! Redirecting...');
            }
            setLoading(false);
          }, 2000);
          return;
        } else {
          throw signInError;
        }
      } else {
        setSuccess('Admin login successful! Redirecting...');
      }
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    }
    setLoading(false);
  };

  const handleManualSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create new admin account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: 'Admin',
            last_name: 'User',
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error && !error.message.includes('already been registered')) {
        throw error;
      }

      setSuccess('Admin account created/updated! You can now use the regular login page.');
    } catch (err: any) {
      setError(`Setup failed: ${err.message}`);
    }
    setLoading(false);
  };

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
            <Button 
              onClick={handleAdminLogin} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Login as Admin'}
            </Button>
            
            <Button 
              onClick={handleManualSetup} 
              variant="outline" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Setup Admin Account'}
            </Button>
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