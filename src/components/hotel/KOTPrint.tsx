import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!data || !data.items.length) return;

    const printKOT = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const doc = iframe.contentDocument;
      if (!doc) return;

      const stationLabel = data.station === 'kitchen' ? '🍳 KITCHEN' : '🍺 BAR';
      const time = data.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const date = data.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page { margin: 2mm; size: 80mm auto; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 76mm;
              padding: 2mm;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .station {
              font-size: 20px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .order-num {
              font-size: 16px;
              font-weight: bold;
              margin: 4px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              margin: 4px 0;
            }
            .item {
              margin: 6px 0;
            }
            .item-name {
              font-size: 14px;
              font-weight: bold;
              display: flex;
              gap: 6px;
            }
            .item-qty {
              font-size: 16px;
              font-weight: bold;
              min-width: 30px;
            }
            .item-notes {
              font-size: 11px;
              font-style: italic;
              margin-left: 36px;
              color: #333;
            }
            .order-notes {
              background: #f0f0f0;
              padding: 4px;
              margin: 4px 0;
              font-size: 11px;
              border: 1px solid #ccc;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              margin-top: 4px;
              border-top: 1px dashed #000;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="station">${stationLabel}</div>
            <div class="order-num">${data.orderNumber}</div>
            <div class="info-row">
              <span>${date} ${time}</span>
              <span>${data.roomNumber ? 'Room ' + data.roomNumber : data.tableNumber ? 'Table ' + data.tableNumber : 'Walk-in'}</span>
            </div>
            ${data.waiterName ? `<div class="info-row"><span>Waiter: ${data.waiterName}</span></div>` : ''}
          </div>
          
          <div class="items">
            ${data.items.map(item => `
              <div class="item">
                <div class="item-name">
                  <span class="item-qty">${item.quantity}×</span>
                  <span>${item.name}</span>
                </div>
                ${item.notes ? `<div class="item-notes">⚠ ${item.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>

          ${data.orderNotes ? `<div class="order-notes"><strong>NOTE:</strong> ${data.orderNotes}</div>` : ''}
          
          <div class="footer">
            --- KOT ---
          </div>
        </body>
        </html>
      `;

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('KOT print failed:', e);
        }
        onPrintComplete?.();
      }, 300);
    };

    printKOT();
  }, [data, onPrintComplete]);

  if (!data) return null;

  return (
    <iframe
      ref={iframeRef}
      style={{ display: 'none', width: 0, height: 0 }}
      title="KOT Print"
    />
  );
}
