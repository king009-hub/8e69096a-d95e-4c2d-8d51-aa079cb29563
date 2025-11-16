import { CartItem } from "@/types/inventory";
import { useSettingsContext } from "@/contexts/SettingsContext";
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
  const { receiptSettings, companyProfile, getCurrencySymbol, formatDate } = useSettingsContext();
  
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

    const paperSize = receiptSettings.paper_size === 'a4' ? '210mm 297mm' : '80mm auto';

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${saleNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${paperSize}; }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              margin: 0; 
              padding: 8px; 
              width: ${receiptSettings.paper_size === 'a4' ? '190mm' : '72mm'}; 
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
            .logo { max-width: 100px; margin: 5px auto; }
          </style>
        </head>
        <body>
          <div class="header center bold">
            ${receiptSettings.show_logo && companyProfile?.logo_url ? 
              `<img src="${companyProfile.logo_url}" class="logo" alt="Logo" />` : ''}
            ${companyProfile?.company_name || 'RETAIL SYSTEM'}<br>
            ${companyProfile?.address || 'Your Business Address'}<br>
            ${companyProfile?.phone ? `Tel: ${companyProfile.phone}<br>` : ''}
            ${companyProfile?.email ? `Email: ${companyProfile.email}<br>` : ''}
            ${companyProfile?.tax_number ? `Tax No: ${companyProfile.tax_number}<br>` : ''}
            ${receiptSettings.header_text ? `<div style="margin-top:5px;">${receiptSettings.header_text}</div>` : ''}
          </div>
          <div class="line"></div>
          
          <div>Receipt #: ${saleNumber}</div>
          <div>Date: ${formatDate(saleDate)}</div>
          <div>Time: ${new Date(saleDate).toLocaleTimeString()}</div>
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
              <span>${item.quantity} x ${getCurrencySymbol()}${item.unit_price.toFixed(2)}</span>
              <span class="item-price">${getCurrencySymbol()}${(item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="double-line"></div>
          
          <div class="total-row">
            <span>SUBTOTAL:</span>
            <span>${getCurrencySymbol()}${subtotal.toFixed(2)}</span>
          </div>
          
          ${discount > 0 ? `
            <div class="total-row">
              <span>DISCOUNT:</span>
              <span>-${getCurrencySymbol()}${discount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${taxAmount > 0 ? `
            <div class="total-row">
              <span>${taxName}:</span>
              <span>${getCurrencySymbol()}${taxAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="double-line"></div>
          
          <div class="total-row" style="font-size: 14px;">
            <span>TOTAL:</span>
            <span>${getCurrencySymbol()}${total.toFixed(2)}</span>
          </div>
          
          <div class="line"></div>
          
          ${splitPayments && splitPayments.length > 0 ? `
            <div class="bold">Payment Methods:</div>
            ${splitPayments.map(p => `
              <div class="item-row">
                <span>${p.method}:</span>
                <span>${getCurrencySymbol()}${p.amount.toFixed(2)}</span>
              </div>
            `).join('')}
          ` : `
            <div>Payment Method: ${paymentMethod}</div>
          `}
          
          <div class="center" style="margin-top: 10px;">
            <img src="${qrCodeDataURL}" alt="QR Code" />
          </div>
          
          <div class="footer center">
            ${receiptSettings.footer_text || 'Thank you for your business!<br>Please come again!'}
            <br>
            <div style="margin-top: 5px; font-size: 9px;">
              Powered by Perfect Retail System
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  };

  // Auto-trigger print when component mounts
  printReceipt();

  return null;
};