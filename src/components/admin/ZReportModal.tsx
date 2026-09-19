// components/ZReportModal.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Printer,
  X,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Utensils,
  Wallet,
  CreditCard,
  Ban,
  Receipt,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { printIframeHtml } from '@/lib/fileExport';
import { ReceiptSkeleton } from './Skeleton';

interface ZReportModalProps {
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
}

interface TopSellingItem {
  name: string;
  quantity: number;
  totalRevenue: number;
}

interface ZReportData {
  reportDate: string;
  generatedAt: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantGst?: string;
  restaurantPhone?: string;
  totalOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  dineInOrdersCount: number;
  takeawayOrdersCount: number;
  grossSales: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  cancelledAmount: number;
  cashRevenue: number;
  cardRevenue: number;
  upiRevenue: number;
  unpaidAmount: number;
  averageOrderValue: number;
  firstOrderTime: string | null;
  lastOrderTime: string | null;
  topItems: TopSellingItem[];
}

export default function ZReportModal({ onClose, initialDate }: ZReportModalProps) {
  const { restaurant } = useAuth();
  const currencySymbol = restaurant?.currency_symbol || restaurant?.currency || '₹';

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [report, setReport] = useState<ZReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontStyle, setFontStyle] = useState<'thermal' | 'modern'>('thermal');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDayReport(selectedDate);
  }, [selectedDate, restaurant]);

  async function fetchDayReport(dateStr: string) {
    if (!restaurant) return;
    setLoading(true);

    try {
      const startOfDay = new Date(`${dateStr}T00:00:00.000`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString();

      // 1. Fetch Orders of Selected Day
      const { data: dayOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          order_status,
          payment_status,
          payment_method,
          total_amount,
          tax_amount,
          discount_amount,
          grand_total,
          created_at,
          order_items (
            item_name,
            quantity,
            total_price,
            unit_price
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const orders = dayOrders || [];

      let gross = 0;
      let discounts = 0;
      let taxes = 0;
      let grand = 0;
      let cancelledAmt = 0;
      let cash = 0;
      let card = 0;
      let upi = 0;
      let unpaid = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      let dineInCount = 0;
      let takeawayCount = 0;

      const itemSalesMap: Record<string, { quantity: number; revenue: number }> = {};

      orders.forEach((ord: any) => {
        const isCancelled = ord.order_status === 'cancelled';
        const total = Number(ord.grand_total || 0);

        if (isCancelled) {
          cancelledCount++;
          cancelledAmt += total;
          return;
        }

        completedCount++;
        gross += Number(ord.total_amount || 0);
        discounts += Number(ord.discount_amount || 0);
        taxes += Number(ord.tax_amount || 0);
        grand += total;

        const ordType = String(ord.order_type || '').toLowerCase();
        if (ordType.includes('takeaway') || ordType.includes('delivery')) {
          takeawayCount++;
        } else {
          dineInCount++;
        }

        const payStatus = String(ord.payment_status || '').toLowerCase();
        const payMethod = String(ord.payment_method || 'cash').toLowerCase();

        if (payStatus === 'pending' || payStatus === 'unpaid') {
          unpaid += total;
        } else {
          if (payMethod.includes('card')) {
            card += total;
          } else if (payMethod.includes('upi') || payMethod.includes('online') || payMethod.includes('digital')) {
            upi += total;
          } else {
            cash += total;
          }
        }

        // Aggregate top items
        (ord.order_items || []).forEach((it: any) => {
          const itemName = it.item_name || 'Item';
          const qty = Number(it.quantity || 1);
          const rev = Number(it.total_price || (qty * Number(it.unit_price || 0)));

          if (!itemSalesMap[itemName]) {
            itemSalesMap[itemName] = { quantity: 0, revenue: 0 };
          }
          itemSalesMap[itemName].quantity += qty;
          itemSalesMap[itemName].revenue += rev;
        });
      });

      const topItems: TopSellingItem[] = Object.entries(itemSalesMap)
        .map(([name, stat]) => ({
          name,
          quantity: stat.quantity,
          totalRevenue: stat.revenue,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const validOrdersCount = completedCount;
      const avgAOV = validOrdersCount > 0 ? grand / validOrdersCount : 0;

      const firstTime = orders.length > 0 ? new Date(orders[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      const lastTime = orders.length > 0 ? new Date(orders[orders.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

      const restAny = (restaurant || {}) as any;

      setReport({
        reportDate: dateStr,
        generatedAt: new Date().toLocaleString(),
        restaurantName: restAny.name || 'Restaurant',
        restaurantAddress: restAny.address || '',
        restaurantGst: restAny.gst_number || '',
        restaurantPhone: restAny.mobile || '',
        totalOrdersCount: orders.length,
        completedOrdersCount: completedCount,
        cancelledOrdersCount: cancelledCount,
        dineInOrdersCount: dineInCount,
        takeawayOrdersCount: takeawayCount,
        grossSales: gross,
        discountAmount: discounts,
        taxAmount: taxes,
        grandTotal: grand,
        cancelledAmount: cancelledAmt,
        cashRevenue: cash,
        cardRevenue: card,
        upiRevenue: upi,
        unpaidAmount: unpaid,
        averageOrderValue: avgAOV,
        firstOrderTime: firstTime,
        lastOrderTime: lastTime,
        topItems,
      });
    } catch (err) {
      console.error('Error generating Z-Report:', err);
    } finally {
      setLoading(false);
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (!report) return;
    triggerHaptic('success');

    const csvRows = [
      ['--- DAILY Z-REPORT (DAY CLOSING) ---'],
      ['Restaurant Name', report.restaurantName],
      ['Date', report.reportDate],
      ['Generated At', report.generatedAt],
      ['GST / Tax ID', report.restaurantGst || 'N/A'],
      ['Phone', report.restaurantPhone || 'N/A'],
      [''],
      ['--- SALES SUMMARY ---'],
      ['Gross Subtotal', `${currencySymbol} ${report.grossSales.toFixed(2)}`],
      ['Total Discounts', `-${currencySymbol} ${report.discountAmount.toFixed(2)}`],
      ['Total Taxes / GST', `${currencySymbol} ${report.taxAmount.toFixed(2)}`],
      ['Grand Total Revenue', `${currencySymbol} ${report.grandTotal.toFixed(2)}`],
      ['Avg Order Value (AOV)', `${currencySymbol} ${report.averageOrderValue.toFixed(2)}`],
      [''],
      ['--- TENDER RECONCILIATION ---'],
      ['Cash Collected', `${currencySymbol} ${report.cashRevenue.toFixed(2)}`],
      ['Card Payments', `${currencySymbol} ${report.cardRevenue.toFixed(2)}`],
      ['UPI / Online Payments', `${currencySymbol} ${report.upiRevenue.toFixed(2)}`],
      ['Pending / Unsettled', `${currencySymbol} ${report.unpaidAmount.toFixed(2)}`],
      [''],
      ['--- ORDER METRICS ---'],
      ['Total Orders', report.totalOrdersCount],
      ['Completed Orders', report.completedOrdersCount],
      ['Cancelled Orders', report.cancelledOrdersCount],
      ['Cancelled Loss Amount', `${currencySymbol} ${report.cancelledAmount.toFixed(2)}`],
      ['Dine-in Orders', report.dineInOrdersCount],
      ['Takeaway Orders', report.takeawayOrdersCount],
      ['First Order Time', report.firstOrderTime || 'N/A'],
      ['Last Order Time', report.lastOrderTime || 'N/A'],
      [''],
      ['--- TOP 5 SELLING ITEMS ---'],
      ['Item Name', 'Quantity Sold', 'Revenue'],
      ...report.topItems.map((it) => [it.name, it.quantity, `${currencySymbol} ${it.totalRevenue.toFixed(2)}`]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Z-Report_${report.reportDate}_${report.restaurantName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Strict 80mm Z-Report Slip
  const handlePrintZReport = () => {
    if (!printRef.current || !report) return;
    triggerHaptic('success');

    const printContents = printRef.current.innerHTML;
    const fullHtml = `
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          max-width: 80mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: ${
            fontStyle === 'thermal'
              ? "'Courier New', Courier, monospace"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          };
          font-size: 11px;
          line-height: 1.3;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          page-break-inside: avoid !important;
        }
        .print-wrapper {
          width: 74mm;
          margin: 0 auto;
          padding: 4mm 1.5mm;
          background: #ffffff;
          page-break-inside: avoid !important;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-black { font-weight: 900 !important; }
        .font-bold { font-weight: 700 !important; }
        .font-semibold { font-weight: 600 !important; }
        .font-medium { font-weight: 500 !important; }
        .uppercase { text-transform: uppercase; }
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 16px; }
        .text-\\[10px\\], .text-\\[10\\.5px\\] { font-size: 10px; }
        .text-\\[11px\\], .text-\\[11\\.5px\\] { font-size: 11px; }
        .border-t { border-top: 1px solid #000000; }
        .border-b { border-bottom: 1px solid #000000; }
        .border-t-2 { border-top: 2px solid #000000; }
        .border-b-2 { border-bottom: 2px solid #000000; }
        .border-dashed { border-style: dashed !important; }
        .border-dotted { border-style: dotted !important; }
        .border-black { border-color: #000000 !important; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .w-full { width: 100%; }
        .py-1 { padding-top: 3px; padding-bottom: 3px; }
        .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
        .my-1 { margin-top: 3px; margin-bottom: 3px; }
        .my-1\\.5 { margin-top: 4px; margin-bottom: 4px; }
        .my-2 { margin-top: 6px; margin-bottom: 6px; }
        .mt-1 { margin-top: 3px; }
        .mt-2 { margin-top: 6px; }
        .mt-3 { margin-top: 8px; }
        .pt-1 { padding-top: 3px; }
        .pt-2 { padding-top: 6px; }
        .pt-3 { padding-top: 8px; }
        .space-y-0\\.5 > * + * { margin-top: 2px; }
        .space-y-1 > * + * { margin-top: 3px; }
        .space-y-2 > * + * { margin-top: 6px; }
        .space-y-3 > * + * { margin-top: 8px; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 2.5px 0;
          font-size: 11px;
        }
        tbody tr {
          border-bottom: 1px dotted #ccc;
        }
        .no-print { display: none !important; }
        @media print {
          .no-print { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
          }
          .print-wrapper {
            page-break-inside: avoid !important;
          }
        }
      </style>
      <div class="print-wrapper">
        ${printContents}
      </div>
    `;

    printIframeHtml(fullHtml, `Daily Z-Report - ${report.reportDate}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden animate-bottom-sheet sm:animate-none pb-safe sm:pb-0">
        {/* Grab handle on mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Daily Z-Report (Day Closing)
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                End-of-day financial reconciliation & 80mm slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintZReport}
              disabled={loading || !report}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 btn-theme-primary text-white rounded-xl text-xs font-black transition shadow-theme native-press disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 80mm Slip</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition native-press"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-700">Report Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                triggerHaptic('selection');
                setSelectedDate(e.target.value);
              }}
              max={todayStr}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            {selectedDate === todayStr && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                TODAY
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setFontStyle(fontStyle === 'thermal' ? 'modern' : 'thermal');
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition native-press text-[11px]"
            >
              Font: {fontStyle === 'thermal' ? 'Thermal POS' : 'Modern Sans'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || !report}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition native-press text-[11px] shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV Export</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {loading ? (
            <div className="py-8 flex justify-center">
              <ReceiptSkeleton />
            </div>
          ) : !report ? (
            <p className="text-xs font-semibold text-slate-500 py-12">No data found for this date.</p>
          ) : (
            /* 80mm Z-Report Thermal Slip Card */
            <div
              ref={printRef}
              style={{
                fontFamily: fontStyle === 'thermal' ? "'Courier New', Courier, monospace" : 'inherit',
              }}
              className="bg-white shadow-xl rounded-2xl border border-slate-200/80 p-4 text-black w-full max-w-[340px] text-[11px] leading-tight"
            >
              {/* Slip Header */}
              <div className="text-center pb-2">
                <h1 className="text-base font-black uppercase tracking-tight">{report.restaurantName}</h1>
                {report.restaurantAddress && (
                  <p className="text-[10px] text-slate-700 mt-0.5">{report.restaurantAddress}</p>
                )}
                {report.restaurantPhone && (
                  <p className="text-[10px] text-slate-800 font-bold">Tel: {report.restaurantPhone}</p>
                )}
                {report.restaurantGst && (
                  <p className="text-[10px] font-black mt-0.5">GSTIN: {report.restaurantGst}</p>
                )}

                <div className="border-t-2 border-b-2 border-black py-1 my-1.5 font-black text-xs uppercase tracking-wider">
                  *** DAILY Z-REPORT (DAY CLOSING) ***
                </div>
                <p className="text-[10px] font-bold">
                  Date: {new Date(report.reportDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-[9px] text-slate-500">Generated: {report.generatedAt}</p>
              </div>

              {/* Operations Overview */}
              <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 space-y-0.5 font-semibold text-[10.5px]">
                <div className="flex justify-between">
                  <span>Total Orders Count:</span>
                  <span className="font-bold">{report.totalOrdersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed / Served:</span>
                  <span className="font-bold text-emerald-700">{report.completedOrdersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dine-In / Takeaway:</span>
                  <span>{report.dineInOrdersCount} / {report.takeawayOrdersCount}</span>
                </div>
                {report.cancelledOrdersCount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Cancelled Orders:</span>
                    <span>{report.cancelledOrdersCount} ({currencySymbol} {report.cancelledAmount.toFixed(2)})</span>
                  </div>
                )}
                {report.firstOrderTime && (
                  <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                    <span>First / Last Order:</span>
                    <span>{report.firstOrderTime} - {report.lastOrderTime}</span>
                  </div>
                )}
              </div>

              {/* Financial Sales Summary */}
              <div className="py-1 my-1 space-y-0.5 text-[11px]">
                <p className="font-black uppercase text-[10px] tracking-wider text-slate-800 pb-0.5">
                  [SALES SUMMARY]
                </p>
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span>{currencySymbol} {report.grossSales.toFixed(2)}</span>
                </div>
                {report.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-700 font-semibold">
                    <span>Discounts Given:</span>
                    <span>-{currencySymbol} {report.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {report.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Taxes / GST:</span>
                    <span>{currencySymbol} {report.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-black border-t-2 border-b-2 border-black py-1 my-1">
                  <span className="uppercase">NET DAY REVENUE:</span>
                  <span className="text-sm">{currencySymbol} {report.grandTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[10px] font-bold text-slate-700">
                  <span>Average Ticket (AOV):</span>
                  <span>{currencySymbol} {report.averageOrderValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash & Payment Tender Reconciliation */}
              <div className="border-t border-dashed border-black pt-1.5 my-1.5 space-y-0.5 text-[10.5px]">
                <p className="font-black uppercase text-[10px] tracking-wider text-slate-800 pb-0.5">
                  [TENDER RECONCILIATION]
                </p>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Cash in Drawer:</span>
                  <span>{currencySymbol} {report.cashRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Card Swipes:</span>
                  <span>{currencySymbol} {report.cardRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>UPI / Online / QR:</span>
                  <span>{currencySymbol} {report.upiRevenue.toFixed(2)}</span>
                </div>
                {report.unpaidAmount > 0 && (
                  <div className="flex justify-between font-bold text-amber-700">
                    <span>Unsettled / Pending:</span>
                    <span>{currencySymbol} {report.unpaidAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Top 5 Best-Selling Dishes */}
              {report.topItems.length > 0 && (
                <div className="border-t border-dashed border-black pt-1.5 my-1.5">
                  <p className="font-black uppercase text-[10px] tracking-wider text-slate-800 pb-1">
                    [TOP SELLING DISHES]
                  </p>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-black text-left">
                        <th className="pb-0.5">Item</th>
                        <th className="pb-0.5 text-center w-8">Qty</th>
                        <th className="pb-0.5 text-right w-14">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dotted divide-slate-300">
                      {report.topItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-0.5 font-bold truncate max-w-[140px]">{it.name}</td>
                          <td className="py-0.5 text-center font-bold">{it.quantity}</td>
                          <td className="py-0.5 text-right font-semibold">{currencySymbol} {it.totalRevenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures & Slip Footer */}
              <div className="border-t-2 border-black pt-3 mt-3 text-center text-[10px] space-y-4">
                <div className="flex justify-between text-[9.5px] px-2 font-bold">
                  <span>Cashier Sign: ________</span>
                  <span>Manager Sign: ________</span>
                </div>
                <p className="text-[9px] text-slate-400">
                  Dishgaze POS • End-of-Day Audit Report
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !report}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition native-press"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition native-press"
            >
              Close
            </button>
            <button
              onClick={handlePrintZReport}
              disabled={loading || !report}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 btn-theme-primary text-white rounded-xl text-xs sm:text-sm font-black transition shadow-theme native-press disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print 80mm Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
