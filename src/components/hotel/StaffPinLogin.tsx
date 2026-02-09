import { useState, useRef, useEffect } from 'react';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Lock, Delete, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function StaffPinLogin() {
  const { loginWithPin } = useStaffSession();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    const result = await loginWithPin(pin);
    setIsLoading(false);

    if (!result.success) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
      toast.error(result.error || 'Invalid PIN');
    } else {
      toast.success('Welcome!');
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className={`w-full max-w-sm shadow-2xl transition-transform ${shake ? 'animate-shake' : ''}`}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-4 bg-primary/10 rounded-full w-fit">
            <Hotel className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Staff Login</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter your PIN to continue</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PIN dots display */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-primary border-primary scale-110'
                    : 'border-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <Button
                key={digit}
                variant="outline"
                className="h-14 text-xl font-semibold hover:bg-primary/10"
                onClick={() => handleDigit(digit)}
                disabled={isLoading}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 text-sm"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-14 text-xl font-semibold hover:bg-primary/10"
              onClick={() => handleDigit('0')}
              disabled={isLoading}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit button */}
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={pin.length < 4 || isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
