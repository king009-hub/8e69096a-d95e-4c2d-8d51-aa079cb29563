import { CartItem } from "@/types/inventory";
import QRCode from 'qrcode';

interface ReceiptPrintProps {
  saleNumber: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  taxAmount?: number;
  taxName?: string;
  total: number;
  paymentMethod: string;
  splitPayments?: Array<{ method: string; amount: number }>;
  tinNumber?: string;
  receiptPhone?: string;
  saleDate: string;
}

export const ReceiptPrint = ({
  saleNumber,
  customerName,
  customerPhone,
  items,
  subtotal,
  discount,
  taxAmount = 0,
  taxName = "Tax",
  total,
  paymentMethod,
  splitPayments,
  tinNumber,
  receiptPhone,
  saleDate
}: ReceiptPrintProps) => {
  
  const printReceipt = async () => {
    // Generate QR code with receipt data
    const qrData = JSON.stringify({
      saleNumber,
      total,
      date: saleDate,
      customer: customerName || 'Walk-in Customer'
    });
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${saleNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              margin: 0; 
              padding: 8px; 
              width: 72mm; 
              line-height: 1.2;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 3px 0; }
            .double-line { border-bottom: 2px solid #000; margin: 3px 0; }
            .item-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 1px 0; 
              word-wrap: break-word;
            }
            .item-name { 
              flex: 1; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              white-space: nowrap; 
              margin-right: 5px; 
            }
            .item-price { text-align: right; }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 2px 0; 
              font-weight: bold; 
            }
            .header { margin-bottom: 5px; }
            .footer { margin-top: 8px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header center bold">
            PERFECT RETAIL SYSTEM<br>
            Your Business Address<br>
            City, State 12345<br>
            Tel: (555) 123-4567
          </div>
          <div class="line"></div>
          
          <div>Receipt #: ${saleNumber}</div>
          <div>Date: ${new Date(saleDate).toLocaleDateString()}</div>
          <div>Time: ${new Date(saleDate).toLocaleTimeString()}</div>
          <div>Cashier: Admin</div>
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
          ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
          ${tinNumber ? `<div>TIN: ${tinNumber}</div>` : ''}
          ${receiptPhone ? `<div>Receipt Phone: ${receiptPhone}</div>` : ''}
          
          <div class="line"></div>
          
          ${items.map(item => `
            <div class="item-row">
              <span class="item-name">${item.product.name}</span>
            </div>
            <div class="item-row">
              <span>${item.quantity} x $${item.unit_price.toFixed(2)}</span>
              <span class="item-price">$${(item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="item-row">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div class="item-row">
            <span>Discount:</span>
            <span>-$${discount.toFixed(2)}</span>
          </div>
          ` : ''}
          ${taxAmount > 0 ? `
          <div class="item-row">
            <span>${taxName}:</span>
            <span>$${taxAmount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="double-line"></div>
          <div class="total-row">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          ${splitPayments && splitPayments.length > 0 ? `
            <div class="bold" style="margin-top: 4px;">Payment Details:</div>
            ${splitPayments.map(p => `
              <div class="item-row">
                <span>${p.method.toUpperCase()}:</span>
                <span>$${p.amount.toFixed(2)}</span>
              </div>
            `).join('')}
          ` : `
            <div class="item-row">
              <span>Payment (${paymentMethod.toUpperCase()}):</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          `}
          
          <div class="line"></div>
          <div class="center footer">
            Thank you for your purchase!<br>
            Please come again<br><br>
            <div style="margin: 10px 0;">
              <img src="${qrCodeDataURL}" alt="Receipt QR Code" style="width: 60px; height: 60px; margin: 0 auto; display: block;" />
              <div style="font-size: 8px; margin-top: 3px;">Scan for receipt details</div>
            </div>
            Visit us at www.perfectretail.com<br>
            Return policy: 30 days with receipt<br>
            Customer service: support@perfectretail.com
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  return { printReceipt };
};