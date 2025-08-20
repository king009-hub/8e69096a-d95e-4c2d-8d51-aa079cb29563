import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { AlertCircle, Fingerprint, Shield } from 'lucide-react';

export default function Auth() {
  const { user } = useAuth();
  const { 
    registerBiometric, 
    authenticateWithBiometric, 
    isBiometricRegistered, 
    isWebAuthnSupported,
    loading: biometricLoading 
  } = useWebAuthn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  // Check WebAuthn support on mount
  useEffect(() => {
    const checkWebAuthnSupport = async () => {
      const supported = await isWebAuthnSupported();
      setWebAuthnSupported(supported);
    };
    checkWebAuthnSupport();
  }, [isWebAuthnSupported]);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else {
        setError(error.message);
      }
      console.error('Sign in error:', error);
    }
    setLoading(false);
  };

  const handleBiometricSignIn = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    const success = await authenticateWithBiometric(email);
    if (success) {
      // Attempt to sign in with the stored password for this demo
      const credentials = JSON.parse(localStorage.getItem('webauthn_credentials') || '{}');
      const userCredential = credentials[email];
      
      if (userCredential && userCredential.storedPassword) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: userCredential.storedPassword,
        });
        
        if (error) {
          setError('Fingerprint verified but login failed. Please use regular sign in.');
        }
      } else {
        setError('Fingerprint verified! Please complete setup by signing in with password once.');
      }
    }
  };

  const handleRegisterBiometric = async () => {
    if (!email || !password) {
      setError('Please enter both email and password first');
      return;
    }

    // First verify the credentials work
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Please verify your email and password are correct before registering fingerprint');
      return;
    }

    // Sign out temporarily to continue with registration
    await supabase.auth.signOut();

    const success = await registerBiometric(email);
    if (success) {
      // Store the password securely for future fingerprint logins
      const credentials = JSON.parse(localStorage.getItem('webauthn_credentials') || '{}');
      if (credentials[email]) {
        credentials[email].storedPassword = password;
        localStorage.setItem('webauthn_credentials', JSON.stringify(credentials));
      }
      setError('Fingerprint registered successfully! You can now use it to sign in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message.includes('weak password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(`Signup failed: ${error.message}`);
      }
      console.error('Sign up error:', error);
    } else if (data.user && !data.session) {
      setError('Account created! Please check your email to confirm your account.');
    } else if (data.session) {
      // User is automatically signed in (email confirmation disabled)
      // Clear form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setError('Account created successfully! You will be redirected automatically.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Sign in to access your inventory management system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                 {webAuthnSupported && (
                   <div className="space-y-2">
                     <div className="flex gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         className="flex-1"
                         onClick={handleBiometricSignIn}
                         disabled={loading || biometricLoading || !isBiometricRegistered(email)}
                       >
                         <Fingerprint className="w-4 h-4 mr-2" />
                         {biometricLoading ? 'Authenticating...' : 'Sign In with Fingerprint'}
                       </Button>
                       
                       {!isBiometricRegistered(email) && email && password && (
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={handleRegisterBiometric}
                           disabled={loading || biometricLoading}
                           title="Register fingerprint"
                         >
                           <Shield className="w-4 h-4" />
                         </Button>
                       )}
                     </div>
                     
                     {email && !isBiometricRegistered(email) && (
                       <p className="text-xs text-muted-foreground text-center">
                         {password ? 'Click the shield to register fingerprint' : 'Enter password first to enable fingerprint registration'}
                       </p>
                     )}
                     
                     {email && isBiometricRegistered(email) && (
                       <p className="text-xs text-success text-center">
                         ✓ Fingerprint registered for this account
                       </p>
                     )}
                   </div>
                 )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                 {webAuthnSupported && email && password && firstName && lastName && (
                   <div className="space-y-2">
                     <Button
                       type="button"
                       variant="outline"
                       className="w-full"
                       onClick={async () => {
                         // First create the account
                         const { error } = await supabase.auth.signUp({
                           email,
                           password,
                           options: {
                             data: {
                               first_name: firstName,
                               last_name: lastName,
                             },
                           },
                         });
                         
                         if (!error) {
                           // Then register fingerprint
                           await handleRegisterBiometric();
                           setError('Account created and fingerprint registered!');
                         }
                       }}
                       disabled={loading || biometricLoading}
                     >
                       <Fingerprint className="w-4 h-4 mr-2" />
                       {biometricLoading ? 'Setting up...' : 'Sign Up with Fingerprint'}
                     </Button>
                     <div className="text-center text-xs text-muted-foreground">or</div>
                   </div>
                 )}
                 
                 <Button type="submit" className="w-full" disabled={loading}>
                   {loading ? 'Creating account...' : 'Sign Up'}
                 </Button>
               </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="mt-4 text-center">
            <Button variant="link" size="sm" onClick={() => window.location.href = '/admin-setup'}>
              Admin Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}