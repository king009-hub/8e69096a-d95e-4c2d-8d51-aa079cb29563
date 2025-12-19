import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { HotelInvoice, HotelBooking } from '@/types/hotel';

interface InvoiceItem {
  id: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface HotelInfoData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number;
}

export function generateHotelInvoicePdf(
  invoice: HotelInvoice & { items?: InvoiceItem[] },
  booking?: HotelBooking,
  hotelInfo?: HotelInfoData
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];

  // Header with hotel branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Hotel name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(hotelInfo?.name || 'Grand Hotel', 20, 22);
  
  // Hotel tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Luxury Accommodation & Services', 20, 32);

  // Invoice title on right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, 22, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, pageWidth - 20, 32, { align: 'right' });

  // Reset text color
  doc.setTextColor(...darkColor);

  // Invoice details box
  let yPos = 55;
  
  // Left side - Hotel contact
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text('From:', 20, yPos);
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  yPos += 6;
  doc.text(hotelInfo?.name || 'Grand Hotel', 20, yPos);
  if (hotelInfo?.address) {
    yPos += 5;
    doc.setFontSize(9);
    doc.text(hotelInfo.address, 20, yPos);
  }
  if (hotelInfo?.phone) {
    yPos += 5;
    doc.text(`Tel: ${hotelInfo.phone}`, 20, yPos);
  }
  if (hotelInfo?.email) {
    yPos += 5;
    doc.text(`Email: ${hotelInfo.email}`, 20, yPos);
  }

  // Right side - Guest details
  yPos = 55;
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text('Bill To:', pageWidth - 80, yPos);
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  yPos += 6;
  
  const guestName = invoice.guest 
    ? `${invoice.guest.first_name} ${invoice.guest.last_name}` 
    : 'Guest';
  doc.text(guestName, pageWidth - 80, yPos);
  
  if (invoice.guest?.phone) {
    yPos += 5;
    doc.setFontSize(9);
    doc.text(`Phone: ${invoice.guest.phone}`, pageWidth - 80, yPos);
  }
  if (invoice.guest?.email) {
    yPos += 5;
    doc.text(`Email: ${invoice.guest.email}`, pageWidth - 80, yPos);
  }

  // Invoice info box
  yPos = 95;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');
  
  yPos += 10;
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  
  // Invoice date
  doc.text('Invoice Date', 30, yPos);
  doc.text('Booking Ref', 80, yPos);
  doc.text('Check-in', 130, yPos);
  doc.text('Check-out', 165, yPos);
  
  yPos += 8;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(invoice.created_at), 'MMM dd, yyyy'), 30, yPos);
  doc.text(booking?.booking_reference || invoice.booking?.booking_reference || '-', 80, yPos);
  
  if (booking) {
    doc.text(format(new Date(booking.check_in_date), 'MMM dd'), 130, yPos);
    doc.text(format(new Date(booking.check_out_date), 'MMM dd'), 165, yPos);
  } else {
    doc.text('-', 130, yPos);
    doc.text('-', 165, yPos);
  }

  // Room info if available
  if (booking?.room) {
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(`Room ${booking.room.room_number} - ${booking.room.room_type.charAt(0).toUpperCase() + booking.room.room_type.slice(1)}`, 20, yPos);
  }

  // Items table
  yPos += 15;
  
  const tableData = (invoice.items || []).map(item => [
    item.description,
    item.item_type?.charAt(0).toUpperCase() + item.item_type?.slice(1) || 'Service',
    item.quantity.toString(),
    `$${Number(item.unit_price).toFixed(2)}`,
    `$${Number(item.total_price).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Type', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

  // Totals section
  let totalsY = finalY + 15;
  const totalsX = pageWidth - 80;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  
  // Subtotal
  doc.text('Subtotal:', totalsX, totalsY);
  doc.setTextColor(...darkColor);
  doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  
  // Tax
  totalsY += 8;
  doc.setTextColor(...grayColor);
  doc.text(`Tax (${hotelInfo?.tax_rate || 18}%):`, totalsX, totalsY);
  doc.setTextColor(...darkColor);
  doc.text(`$${Number(invoice.tax_amount).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  
  // Discount if any
  if (Number(invoice.discount_amount) > 0) {
    totalsY += 8;
    doc.setTextColor(34, 197, 94); // Green
    doc.text('Discount:', totalsX, totalsY);
    doc.text(`-$${Number(invoice.discount_amount).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  }
  
  // Total line
  totalsY += 5;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 10, totalsY, pageWidth - 20, totalsY);
  
  // Grand total
  totalsY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', totalsX, totalsY);
  doc.text(`$${Number(invoice.total_amount).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });

  // Payment status
  totalsY += 12;
  doc.setFontSize(10);
  const status = invoice.payment_status || 'pending';
  if (status === 'paid') {
    doc.setTextColor(34, 197, 94);
    doc.text('PAID', pageWidth - 20, totalsY, { align: 'right' });
  } else if (status === 'partial') {
    doc.setTextColor(234, 179, 8);
    doc.text('PARTIAL PAYMENT', pageWidth - 20, totalsY, { align: 'right' });
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text('PAYMENT PENDING', pageWidth - 20, totalsY, { align: 'right' });
  }

  if (invoice.payment_method) {
    totalsY += 6;
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(`Payment Method: ${invoice.payment_method.replace('_', ' ').toUpperCase()}`, pageWidth - 20, totalsY, { align: 'right' });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for staying with us!', pageWidth / 2, footerY, { align: 'center' });
  doc.text('We hope to see you again soon.', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 12, { align: 'center' });

  return doc;
}

export function printHotelInvoice(
  invoice: HotelInvoice & { items?: InvoiceItem[] },
  booking?: HotelBooking,
  hotelInfo?: HotelInfoData
) {
  const doc = generateHotelInvoicePdf(invoice, booking, hotelInfo);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

export function downloadHotelInvoice(
  invoice: HotelInvoice & { items?: InvoiceItem[] },
  booking?: HotelBooking,
  hotelInfo?: HotelInfoData
) {
  const doc = generateHotelInvoicePdf(invoice, booking, hotelInfo);
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
