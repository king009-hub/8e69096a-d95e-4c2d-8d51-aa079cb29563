import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { CustomerLoan, LoanItem, LoanPayment } from '@/types/loans';

interface CompanyInfo {
  company_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
}

interface LoanReceiptOptions {
  loan: CustomerLoan;
  items: LoanItem[];
  payments: LoanPayment[];
  companyInfo?: CompanyInfo | null;
  currencySymbol?: string;
}

function fmt(amount: number, symbol: string): string {
  if (symbol === 'RF') {
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateLoanReceiptPdf({
  loan,
  items,
  payments,
  companyInfo,
  currencySymbol = 'RF',
}: LoanReceiptOptions): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  const primary: [number, number, number] = [139, 92, 246]; // Purple for loans
  const dark: [number, number, number] = [31, 41, 55];
  const gray: [number, number, number] = [107, 114, 128];

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, pw, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo?.company_name || 'RETAIL SYSTEM', 20, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const parts: string[] = [];
  if (companyInfo?.address) parts.push(companyInfo.address);
  if (companyInfo?.phone) parts.push(`Tel: ${companyInfo.phone}`);
  doc.text(parts.join('  |  ') || '', 20, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LOAN STATEMENT', pw - 20, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${loan.loan_number}`, pw - 20, 28, { align: 'right' });

  doc.setTextColor(...dark);

  // Loan info box
  let y = 50;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, y, pw - 40, 35, 3, 3, 'F');

  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text('Customer', 30, y);
  doc.text('Date Issued', 90, y);
  doc.text('Due Date', 140, y);

  y += 8;
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(loan.customer?.name || 'Unknown', 30, y);
  doc.text(format(new Date(loan.created_at), 'MMM dd, yyyy'), 90, y);
  doc.text(loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'No due date', 140, y);

  // Customer phone
  if (loan.customer?.phone) {
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(`Phone: ${loan.customer.phone}`, 30, y);
  }

  // Status badge
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const statusColors: Record<string, [number, number, number]> = {
    active: [37, 99, 235],
    completed: [34, 197, 94],
    overdue: [239, 68, 68],
    cancelled: [107, 114, 128],
  };
  const statusColor = statusColors[loan.status] || gray;
  doc.setTextColor(...statusColor);
  doc.text(`Status: ${loan.status.toUpperCase()}`, 140, y);

  // Interest rate
  if (loan.interest_rate && loan.interest_rate > 0) {
    doc.setTextColor(...gray);
    doc.text(`Interest Rate: ${loan.interest_rate}%`, pw - 20, y, { align: 'right' });
  }

  // Loan items table (if any)
  y += 15;
  if (items.length > 0) {
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Loan Items', 20, y);
    y += 5;

    const itemData = items.map(item => [
      item.product?.name || 'Item',
      item.quantity.toString(),
      fmt(item.unit_price, currencySymbol),
      fmt(item.total_price, currencySymbol),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: itemData,
      theme: 'striped',
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: dark },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Loan summary box
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(20, y, pw - 40, 35, 3, 3, 'F');

  const sumY = y + 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setTextColor(...gray);
  doc.text('Total Amount:', 30, sumY);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(loan.total_amount, currencySymbol), 100, sumY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 197, 94);
  doc.text('Paid:', 30, sumY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(loan.paid_amount, currencySymbol), 100, sumY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(239, 68, 68);
  doc.text('Remaining:', 30, sumY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(loan.remaining_amount, currencySymbol), 100, sumY + 20);

  // Grand remaining on right side
  doc.setFontSize(16);
  doc.setTextColor(...primary);
  doc.text('BALANCE DUE', pw - 25, sumY + 5, { align: 'right' });
  doc.text(fmt(loan.remaining_amount, currencySymbol), pw - 25, sumY + 18, { align: 'right' });

  y = y + 45;

  // Payment history
  if (payments.length > 0) {
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment History', 20, y);
    y += 5;

    const paymentData = payments.map(p => [
      format(new Date(p.payment_date), 'MMM dd, yyyy HH:mm'),
      fmt(p.amount, currencySymbol),
      p.payment_method.toUpperCase(),
      p.reference_number || '-',
      p.notes || '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Amount', 'Method', 'Reference', 'Notes']],
      body: paymentData,
      theme: 'striped',
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: dark },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
      },
      margin: { left: 20, right: 20 },
    });
  }

  // Notes
  if (loan.notes) {
    const notesY = payments.length > 0
      ? (doc as any).lastAutoTable.finalY + 12
      : y + 10;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Notes: ${loan.notes}`, 20, notesY);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 10, pw - 20, footerY - 10);

  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a loan statement. Please make payments before the due date.', pw / 2, footerY, { align: 'center' });
  if (companyInfo?.email) {
    doc.text(companyInfo.email, pw / 2, footerY + 5, { align: 'center' });
  }
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pw / 2, footerY + 12, { align: 'center' });

  return doc;
}

export function printLoanReceipt(options: LoanReceiptOptions) {
  const doc = generateLoanReceiptPdf(options);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

export function downloadLoanReceipt(options: LoanReceiptOptions) {
  const doc = generateLoanReceiptPdf(options);
  doc.save(`Loan-Statement-${options.loan.loan_number}.pdf`);
}
