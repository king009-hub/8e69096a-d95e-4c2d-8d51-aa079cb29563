import { HotelCartItem } from "@/hooks/useHotelPOS";
import { HotelInfo, HotelBooking } from "@/types/hotel";
import { useSettingsContext } from "@/contexts/SettingsContext";
import QRCode from 'qrcode';

interface SplitPayment {
  method: string;
  amount: number;
}

interface HotelReceiptPrintProps {
  invoiceNumber: string;
  items: HotelCartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  splitPayments?: SplitPayment[];
  paidAmount?: number;
  changeAmount?: number;
  hotelInfo: HotelInfo | null;
  booking?: HotelBooking | null;
  isRoomCharge?: boolean;
  saleDate: Date;
}

export const HotelReceiptPrint = ({
  invoiceNumber,
  items,
  subtotal,
  discount,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  paymentMethod,
  splitPayments,
  paidAmount,
  changeAmount,
  hotelInfo,
  booking,
  isRoomCharge = false,
  saleDate
}: HotelReceiptPrintProps) => {
  const { receiptSettings, formatDate } = useSettingsContext();

  const printReceipt = async () => {
    // Generate QR code with receipt data
    const qrData = JSON.stringify({
      invoiceNumber,
      total,
      date: saleDate.toISOString(),
      guest: booking?.guest ? `${booking.guest.first_name} ${booking.guest.last_name}` : 'Walk-in Guest',
      room: booking?.room?.room_number || null
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const paperSize = receiptSettings?.paper_size === 'a4' ? '210mm 297mm' : '80mm auto';
    const paperWidth = receiptSettings?.paper_size === 'a4' ? '190mm' : '72mm';

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${invoiceNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${paperSize}; }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              margin: 0; 
              padding: 10px; 
              width: ${paperWidth}; 
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            .double-line { border-bottom: 2px solid #000; margin: 6px 0; }
            .item-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 2px 0; 
              word-wrap: break-word;
            }
            .item-name { 
              flex: 1; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              white-space: nowrap; 
              margin-right: 8px; 
            }
            .item-price { text-align: right; white-space: nowrap; }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              font-weight: bold; 
            }
            .header { margin-bottom: 8px; }
            .footer { margin-top: 10px; font-size: 10px; }
            .logo { max-width: 120px; max-height: 60px; margin: 5px auto; display: block; }
            .guest-info { margin: 8px 0; padding: 6px; background: #f5f5f5; border-radius: 4px; }
            .room-badge { 
              display: inline-block; 
              background: #000; 
              color: #fff; 
              padding: 2px 8px; 
              border-radius: 3px; 
              font-weight: bold; 
              margin-top: 4px;
            }
            .charge-type {
              display: inline-block;
              background: ${isRoomCharge ? '#2563eb' : '#16a34a'};
              color: #fff;
              padding: 2px 8px;
              border-radius: 3px;
              font-size: 10px;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header center">
            ${hotelInfo?.logo_url ? 
              `<img src="${hotelInfo.logo_url}" class="logo" alt="Hotel Logo" />` : ''}
            <div class="bold" style="font-size: 14px; margin-top: 5px;">
              ${hotelInfo?.name || 'HOTEL'}
            </div>
            ${hotelInfo?.address ? `<div>${hotelInfo.address}</div>` : ''}
            ${hotelInfo?.phone ? `<div>Tel: ${hotelInfo.phone}</div>` : ''}
            ${hotelInfo?.email ? `<div>${hotelInfo.email}</div>` : ''}
          </div>
          
          <div class="line"></div>
          
          <div class="center bold" style="font-size: 13px; margin: 5px 0;">
            SERVICE RECEIPT
          </div>
          <div class="center">
            <span class="charge-type">${isRoomCharge ? 'ROOM CHARGE' : 'DIRECT PAYMENT'}</span>
          </div>
          
          <div class="line"></div>
          
          <div>
            <div><strong>Invoice:</strong> ${invoiceNumber}</div>
            <div><strong>Date:</strong> ${formatDate(saleDate.toISOString())}</div>
            <div><strong>Time:</strong> ${saleDate.toLocaleTimeString()}</div>
          </div>
          
          ${booking ? `
            <div class="guest-info">
              <div><strong>Guest:</strong> ${booking.guest?.first_name || ''} ${booking.guest?.last_name || ''}</div>
              ${booking.guest?.phone ? `<div><strong>Phone:</strong> ${booking.guest.phone}</div>` : ''}
              <div>
                <span class="room-badge">Room ${booking.room?.room_number || 'N/A'}</span>
                ${booking.room?.room_type ? `<span style="margin-left: 5px; font-size: 10px;">${booking.room.room_type.toUpperCase()}</span>` : ''}
              </div>
              <div style="font-size: 10px; margin-top: 4px;">
                <strong>Booking:</strong> ${booking.booking_reference || 'N/A'}
              </div>
            </div>
          ` : `
            <div class="guest-info">
              <div><strong>Guest:</strong> Walk-in Customer</div>
            </div>
          `}
          
          <div class="line"></div>
          
          <div class="bold" style="margin-bottom: 4px;">ITEMS:</div>
          
          ${items.map(item => `
            <div class="item-row">
              <span class="item-name">${item.service.name}</span>
            </div>
            <div class="item-row" style="font-size: 10px; color: #666;">
              <span>${item.quantity} x ${item.unit_price.toFixed(2)}</span>
              <span class="item-price">${(item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="double-line"></div>
          
          <div class="item-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          ${discountAmount > 0 ? `
            <div class="item-row" style="color: #16a34a;">
              <span>Discount (${discount}%):</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="item-row">
            <span>GST (${taxRate}%):</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          
          <div class="double-line"></div>
          
          <div class="total-row" style="font-size: 14px;">
            <span>TOTAL:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          <div class="line"></div>
          
          ${isRoomCharge ? `
            <div class="center" style="margin: 8px 0;">
              <div class="bold">Charged to Room ${booking?.room?.room_number || ''}</div>
              <div style="font-size: 10px;">To be settled at checkout</div>
            </div>
          ` : `
            ${splitPayments && splitPayments.length > 1 ? `
              <div class="bold" style="margin-bottom: 4px;">PAYMENT BREAKDOWN:</div>
              ${splitPayments.map(p => `
                <div class="item-row">
                  <span>${p.method.replace('_', ' ').toUpperCase()}:</span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              `).join('')}
            ` : `
              <div class="item-row">
                <span>Payment Method:</span>
                <span>${paymentMethod.replace('_', ' ').toUpperCase()}</span>
              </div>
            `}
            
            ${paidAmount && paidAmount > 0 ? `
              <div class="item-row">
                <span>Amount Received:</span>
                <span>${paidAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            
            ${changeAmount && changeAmount > 0 ? `
              <div class="item-row bold" style="color: #16a34a;">
                <span>Change:</span>
                <span>${changeAmount.toFixed(2)}</span>
              </div>
            ` : ''}
          `}
          
          <div class="center" style="margin-top: 12px;">
            <img src="${qrCodeDataURL}" alt="QR Code" style="width: 80px; height: 80px;" />
          </div>
          
          <div class="footer center">
            <div class="line"></div>
            <div style="margin: 8px 0;">
              ${receiptSettings?.footer_text || 'Thank you for choosing us!'}
            </div>
            <div style="font-size: 9px; color: #666;">
              ${hotelInfo?.name || 'Hotel'} - Where comfort meets elegance
            </div>
            <div style="font-size: 8px; color: #999; margin-top: 5px;">
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
    }
  };

  // Auto-trigger print when component mounts
  printReceipt();

  return null;
};
