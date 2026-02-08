import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Sale, SaleItem } from '@/types/inventory';

interface CompanyInfo {
  company_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  logo_url?: string;
}

interface SaleReceiptOptions {
  sale: Sale;
  items: SaleItem[];
  companyInfo?: CompanyInfo | null;
  currencySymbol?: string;
  taxName?: string;
}

function formatAmount(amount: number, symbol: string): string {
  if (symbol === 'RF') {
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateSaleReceiptPdf({
  sale,
  items,
  companyInfo,
  currencySymbol = 'RF',
  taxName = 'Tax',
}: SaleReceiptOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const primaryColor: [number, number, number] = [37, 99, 235];
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];

  // Header band
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo?.company_name || 'RETAIL SYSTEM', 20, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const subParts: string[] = [];
  if (companyInfo?.address) subParts.push(companyInfo.address);
  if (companyInfo?.phone) subParts.push(`Tel: ${companyInfo.phone}`);
  doc.text(subParts.join('  |  ') || '', 20, 30);

  // Receipt label
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', pageWidth - 20, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${sale.sale_number}`, pageWidth - 20, 28, { align: 'right' });

  // Reset
  doc.setTextColor(...darkColor);

  // Info box
  let y = 50;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, y, pageWidth - 40, 28, 3, 3, 'F');

  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text('Date', 30, y);
  doc.text('Customer', 80, y);
  doc.text('Payment', 140, y);

  y += 8;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(format(new Date(sale.sale_date), 'MMM dd, yyyy HH:mm'), 30, y);
  doc.text(sale.customer_name || 'Walk-in Customer', 80, y);

  // Parse payment method
  let paymentDisplay = sale.payment_method;
  let splitPayments: Array<{ method: string; amount: number }> = [];
  try {
    const parsed = JSON.parse(sale.payment_method);
    if (Array.isArray(parsed)) {
      splitPayments = parsed;
      paymentDisplay = 'Split Payment';
    }
  } catch {
    // Single payment method
  }
  doc.text(paymentDisplay.toUpperCase(), 140, y);

  // Customer phone & TIN
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (sale.customer_phone) {
    doc.setTextColor(...grayColor);
    doc.text(`Phone: ${sale.customer_phone}`, 80, y);
  }
  if (companyInfo?.tax_number) {
    doc.text(`TIN: ${companyInfo.tax_number}`, 140, y);
  }

  // Items table
  y += 15;
  const tableData = items.map(item => [
    item.product?.name || 'Unknown Product',
    item.quantity.toString(),
    formatAmount(item.unit_price, currencySymbol),
    formatAmount(item.total_price, currencySymbol),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: darkColor },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || y + 50;

  // Totals
  let totY = finalY + 12;
  const totX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.setTextColor(...grayColor);
  doc.text('Subtotal:', totX, totY);
  doc.setTextColor(...darkColor);
  doc.text(formatAmount(sale.total_amount, currencySymbol), pageWidth - 20, totY, { align: 'right' });

  // Discount
  if (sale.discount > 0) {
    totY += 8;
    doc.setTextColor(239, 68, 68);
    doc.text('Discount:', totX, totY);
    doc.text(`-${formatAmount(sale.discount, currencySymbol)}`, pageWidth - 20, totY, { align: 'right' });
  }

  // Tax
  if (sale.tax_amount && sale.tax_amount > 0) {
    totY += 8;
    doc.setTextColor(...grayColor);
    doc.text(`${taxName}:`, totX, totY);
    doc.setTextColor(...darkColor);
    doc.text(formatAmount(sale.tax_amount, currencySymbol), pageWidth - 20, totY, { align: 'right' });
  }

  // Line
  totY += 5;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totX - 10, totY, pageWidth - 20, totY);

  // Grand total
  totY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', totX, totY);
  doc.text(formatAmount(sale.final_amount, currencySymbol), pageWidth - 20, totY, { align: 'right' });

  // Split payments breakdown
  if (splitPayments.length > 1) {
    totY += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Payment Breakdown:', 20, totY);
    totY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const p of splitPayments) {
      doc.setTextColor(...grayColor);
      doc.text(`${p.method.toUpperCase()}:`, 25, totY);
      doc.setTextColor(...darkColor);
      doc.text(formatAmount(p.amount, currencySymbol), 90, totY);
      totY += 6;
    }
  }

  // PAID stamp
  totY += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('PAID', pageWidth / 2, totY, { align: 'center' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  if (companyInfo?.email) {
    doc.text(companyInfo.email, pageWidth / 2, footerY + 5, { align: 'center' });
  }
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 12, { align: 'center' });

  return doc;
}

export function printSaleReceipt(options: SaleReceiptOptions) {
  const doc = generateSaleReceiptPdf(options);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

export function downloadSaleReceipt(options: SaleReceiptOptions) {
  const doc = generateSaleReceiptPdf(options);
  doc.save(`Receipt-${options.sale.sale_number}.pdf`);
}
