import { useEffect, useRef } from 'react';
import { printTicketInIframe, resolvePaperWidth } from '@/lib/print/thermalPrint';
import { useSettingsContext } from '@/contexts/SettingsContext';

interface KOTItem {
  name: string;
  quantity: number;
  notes?: string | null;
}

interface KOTData {
  orderNumber: string;
  station: 'kitchen' | 'bar';
  tableNumber?: string | null;
  roomNumber?: string | null;
  waiterName?: string;
  items: KOTItem[];
  orderNotes?: string;
  timestamp: Date;
}

interface KOTPrintProps {
  data: KOTData | null;
  onPrintComplete?: () => void;
}

// Categories that go to each station
export const KITCHEN_CATEGORIES = ['food', 'hotel'];
export const BAR_CATEGORIES = ['beverages', 'minibar'];

// Helper to determine station from category
export function getStationForCategory(category: string): 'kitchen' | 'bar' | 'other' {
  if (KITCHEN_CATEGORIES.includes(category)) return 'kitchen';
  if (BAR_CATEGORIES.includes(category)) return 'bar';
  return 'other';
}

export function KOTPrint({ data, onPrintComplete }: KOTPrintProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { receiptSettings } = useSettingsContext();

  useEffect(() => {
    if (!data || !data.items.length) return;
    printTicketInIframe(iframeRef.current, {
      width: resolvePaperWidth(receiptSettings.paper_size),
      template: data.station === 'bar' ? 'bar' : 'kot',
      meta: {
        ticketNumber: data.orderNumber,
        dateTime: data.timestamp,
        room: data.roomNumber,
        table: data.tableNumber,
        waiter: data.waiterName,
        notes: data.orderNotes,
      },
      items: data.items.map((it) => ({
        qty: it.quantity,
        name: it.name,
        notes: it.notes,
      })),
      footerText: '--- KOT ---',
    });
    setTimeout(() => onPrintComplete?.(), 600);
  }, [data, onPrintComplete, receiptSettings.paper_size]);

  if (!data) return null;

  return (
    <iframe
      ref={iframeRef}
      style={{ display: 'none', width: 0, height: 0 }}
      title="KOT Print"
    />
  );
}
