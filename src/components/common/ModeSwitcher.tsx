import { Button } from '@/components/ui/button';
import { useAppMode } from '@/contexts/AppModeContext';
import { Building2, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModeSwitcher() {
  const { mode, setMode } = useAppMode();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant={mode === 'pos' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('pos')}
        className={cn(
          "gap-2 transition-all",
          mode === 'pos' && "shadow-sm"
        )}
      >
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">POS</span>
      </Button>
      <Button
        variant={mode === 'hotel' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('hotel')}
        className={cn(
          "gap-2 transition-all",
          mode === 'hotel' && "shadow-sm"
        )}
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Hotel</span>
      </Button>
    </div>
  );
}
