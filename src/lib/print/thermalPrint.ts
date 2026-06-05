/**
 * Dynamic thermal-printer engine.
 *
 * Single source of truth for printing receipts, KOTs, bar tickets,
 * customer bills, pickup tickets and shift Z-reports on 58mm or 80mm
 * ESC/POS-friendly printers (with browser fallback).
 *
 * Paper width comes from Receipt Settings — never hardcode it.
 */

export type PaperWidth = '58mm' | '80mm' | '110mm' | 'A4';

export type TicketTemplate =
  | 'order'        // Customer-facing order/ticket
  | 'kot'          // Kitchen Order Ticket
  | 'bar'          // Bar ticket
  | 'bill'         // Final bill / pre-receipt
  | 'pickup'       // Takeaway pickup ticket
  | 'zreport';     // Shift Z-report

export interface TicketLine {
  qty?: number;
  name: string;
  notes?: string | null;
  amount?: number | string;
}

export interface TicketHeader {
  logoUrl?: string | null;
  businessName?: string | null;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
}

export interface TicketMeta {
  ticketNumber?: string;
  dateTime?: Date;
  table?: string | null;
  room?: string | null;
  waiter?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  pickupAt?: Date | null;
  notes?: string | null;
  badge?: string | null;
}

export interface TicketTotals {
  subtotal?: number | string;
  discount?: number | string;
  tax?: number | string;
  taxLabel?: string;
  service?: number | string;
  total?: number | string;
  paid?: number | string;
  change?: number | string;
  paymentMethod?: string;
}

export interface RenderTicketOptions {
  width: PaperWidth;
  template: TicketTemplate;
  title?: string;
  header?: TicketHeader;
  meta?: TicketMeta;
  items: TicketLine[];
  totals?: TicketTotals;
  footerText?: string;
  /** Caller-supplied formatter for money (keeps locale/currency consistent). */
  formatMoney?: (n: number | string | undefined) => string;
}

const widthSpec: Record<PaperWidth, { page: string; body: string; fontPx: number }> = {
  '58mm': { page: '58mm auto', body: '54mm', fontPx: 10 },
  '80mm': { page: '80mm auto', body: '74mm', fontPx: 11 },
  '110mm': { page: '110mm auto', body: '104mm', fontPx: 12 },
  'A4': { page: 'A4', body: '180mm', fontPx: 12 },
};

const esc = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const defaultMoney = (n: number | string | undefined): string => {
  if (n === undefined || n === null || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString();
};

/**
 * Build the ticket HTML for the given template + paper width.
 * Pure function — safe to unit test.
 */
export function buildTicketHtml(opts: RenderTicketOptions): string {
  const spec = widthSpec[opts.width] ?? widthSpec['80mm'];
  const money = opts.formatMoney ?? defaultMoney;
  const dt = opts.meta?.dateTime ?? new Date();

  const templateLabel: Record<TicketTemplate, string> = {
    order: 'ORDER TICKET',
    kot: '🍳 KITCHEN',
    bar: '🍺 BAR',
    bill: 'CUSTOMER BILL',
    pickup: '📦 TAKEAWAY',
    zreport: 'SHIFT Z-REPORT',
  };

  const showAmounts =
    opts.template === 'order' ||
    opts.template === 'bill' ||
    opts.template === 'pickup';

  const itemsHtml = opts.items
    .map((it) => {
      const qty = it.qty ?? 1;
      const right = showAmounts && it.amount !== undefined ? money(it.amount) : '';
      return `
        <div class="row">
          <span class="ln"><b>${qty}×</b> ${esc(it.name)}</span>
          ${right ? `<span>${esc(right)}</span>` : ''}
        </div>
        ${it.notes ? `<div class="note">• ${esc(it.notes)}</div>` : ''}
      `;
    })
    .join('');

  const totalsHtml = (() => {
    if (!opts.totals || !showAmounts) return '';
    const t = opts.totals;
    const rows: string[] = [];
    if (t.subtotal !== undefined) rows.push(`<div class="row"><span>Subtotal</span><span>${esc(money(t.subtotal))}</span></div>`);
    if (t.discount !== undefined) rows.push(`<div class="row"><span>Discount</span><span>-${esc(money(t.discount))}</span></div>`);
    if (t.service !== undefined) rows.push(`<div class="row"><span>Service</span><span>${esc(money(t.service))}</span></div>`);
    if (t.tax !== undefined) rows.push(`<div class="row"><span>${esc(t.taxLabel || 'Tax')}</span><span>${esc(money(t.tax))}</span></div>`);
    if (t.total !== undefined) rows.push(`<div class="row big b"><span>TOTAL</span><span>${esc(money(t.total))}</span></div>`);
    if (t.paid !== undefined) rows.push(`<div class="row"><span>Paid${t.paymentMethod ? ` (${esc(t.paymentMethod)})` : ''}</span><span>${esc(money(t.paid))}</span></div>`);
    if (t.change !== undefined) rows.push(`<div class="row b"><span>Change</span><span>${esc(money(t.change))}</span></div>`);
    return `<div class="dbl"></div>${rows.join('')}`;
  })();

  const h = opts.header || {};
  const m = opts.meta || {};

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(opts.title || templateLabel[opts.template])}</title>
<style>
  @page { margin: 0; size: ${spec.page}; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: ${spec.fontPx}px; line-height: 1.3; width: ${spec.body}; margin: 0; padding: 4mm 2mm; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  .big { font-size: ${spec.fontPx + 2}px; }
  .station { font-size: ${spec.fontPx + 6}px; letter-spacing: 1px; }
  .line { border-bottom: 1px dashed #000; margin: 4px 0; }
  .dbl { border-bottom: 2px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 4px; margin: 1px 0; }
  .ln { word-break: break-word; }
  .note { font-size: ${Math.max(spec.fontPx - 1, 9)}px; color: #444; margin-left: 8px; font-style: italic; }
  .badge { display: inline-block; padding: 1px 6px; border: 1px solid #000; border-radius: 2px; font-size: ${Math.max(spec.fontPx - 1, 9)}px; margin-top: 2px; }
  h2 { margin: 0; font-size: ${spec.fontPx + 3}px; }
  img.logo { max-height: 40px; max-width: ${spec.fontPx === 10 ? '90px' : '120px'}; margin-bottom: 2px; }
</style></head><body>
  <div class="c">
    ${h.logoUrl ? `<img class="logo" src="${esc(h.logoUrl)}"/>` : ''}
    ${h.businessName ? `<h2 class="b">${esc(h.businessName)}</h2>` : ''}
    ${h.address ? `<div>${esc(h.address)}</div>` : ''}
    ${h.phone ? `<div>Tel: ${esc(h.phone)}</div>` : ''}
    ${h.taxNumber ? `<div>TIN: ${esc(h.taxNumber)}</div>` : ''}
  </div>
  <div class="line"></div>
  <div class="c b station">${templateLabel[opts.template]}</div>
  ${m.badge ? `<div class="c"><span class="badge">${esc(m.badge)}</span></div>` : ''}
  <div class="line"></div>
  ${m.ticketNumber ? `<div><span class="b">Ticket:</span> ${esc(m.ticketNumber)}</div>` : ''}
  <div><span class="b">Date:</span> ${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</div>
  ${m.room ? `<div><span class="b">Room:</span> ${esc(m.room)}</div>` : ''}
  ${m.table ? `<div><span class="b">Table:</span> ${esc(m.table)}</div>` : ''}
  ${m.waiter ? `<div><span class="b">Waiter:</span> ${esc(m.waiter)}</div>` : ''}
  ${m.customerName ? `<div><span class="b">Guest:</span> ${esc(m.customerName)}</div>` : ''}
  ${m.customerPhone ? `<div><span class="b">Phone:</span> ${esc(m.customerPhone)}</div>` : ''}
  ${m.customerEmail ? `<div><span class="b">Email:</span> ${esc(m.customerEmail)}</div>` : ''}
  ${m.pickupAt ? `<div><span class="b">Pickup:</span> ${esc(m.pickupAt.toLocaleString())}</div>` : ''}
  ${m.notes ? `<div><span class="b">Notes:</span> ${esc(m.notes)}</div>` : ''}
  <div class="line"></div>
  ${opts.items.length ? `<div class="b">ITEMS</div>${itemsHtml}` : ''}
  ${totalsHtml}
  <div class="line"></div>
  ${opts.footerText ? `<div class="c" style="white-space:pre-line;">${esc(opts.footerText)}</div>` : ''}
  <div class="c" style="font-size:9px;color:#666;margin-top:4px;">Printed ${new Date().toLocaleString()}</div>
</body></html>`;
}

/**
 * Open a print window and print the ticket. Returns true if a window was opened.
 */
export function printTicket(opts: RenderTicketOptions): boolean {
  const html = buildTicketHtml(opts);
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => {
    try { win.print(); } catch (e) { console.error('Print failed', e); }
  }, 250);
  return true;
}

/**
 * Print into a hidden iframe (no popup). Returns true if iframe was rendered.
 * Caller is responsible for the iframe lifecycle.
 */
export function printTicketInIframe(iframe: HTMLIFrameElement | null, opts: RenderTicketOptions): boolean {
  if (!iframe) return false;
  const doc = iframe.contentDocument;
  if (!doc) return false;
  doc.open();
  doc.write(buildTicketHtml(opts));
  doc.close();
  setTimeout(() => {
    try { iframe.contentWindow?.print(); } catch (e) { console.error('iframe print failed', e); }
  }, 250);
  return true;
}

/** Map a Receipt-Settings paper_size string to a PaperWidth, with safe fallback. */
export function resolvePaperWidth(value: string | undefined | null): PaperWidth {
  switch ((value || '').toLowerCase()) {
    case '58mm': return '58mm';
    case '110mm': return '110mm';
    case 'a4': return 'A4';
    case '80mm':
    default:
      return '80mm';
  }
}