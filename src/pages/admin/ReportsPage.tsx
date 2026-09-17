import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Download,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  CreditCard,
  Wallet,
  Smartphone,
  Globe,
  HelpCircle,
  UtensilsCrossed,
  Loader2,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  CalendarRange,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { downloadCsvFile } from '@/lib/fileExport';
import { ReportsSkeleton } from '@/components/admin/Skeleton';

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'custom';

interface TopItem {
  name: string;
  category_name?: string;
  food_type?: string;
  quantity: number;
  revenue: number;
}

interface TimePoint {
  label: string;
  subLabel?: string;
  sales: number;
  orders: number;
}

interface ReportMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrActiveOrders: number;
  grossSales: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  averageOrderValue: number;
  paidAmount: number;
  unpaidAmount: number;
  partiallyPaidAmount: number;
  refundedAmount: number;
  paymentMethods: {
    cash: number;
    card: number;
    upi: number;
    online: number;
    other: number;
  };
  topItems: TopItem[];
  timePoints: TimePoint[];
}

export default function ReportsPage() {
  const { restaurant } = useAuth();
  const currencySymbol = restaurant?.currency_symbol || restaurant?.currency || 'AED';

  const [period, setPeriod] = useState<PeriodMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<TimePoint | null>(null);

  // Raw orders data for current range
  const [ordersData, setOrdersData] = useState<any[]>([]);

  // Calculate Date Range Boundaries based on active filter
  const dateRange = useMemo(() => {
    if (period === 'daily') {
      const start = new Date(`${selectedDate}T00:00:00.000`);
      const end = new Date(`${selectedDate}T23:59:59.999`);
      return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: new Date(selectedDate).toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };
    }

    if (period === 'weekly') {
      // 7-day window ending on selectedDate
      const end = new Date(`${selectedDate}T23:59:59.999`);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
      };
    }

    if (period === 'monthly') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      };
    }

    // Custom date range
    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: `${new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }, [period, selectedDate, selectedMonth, startDate, endDate]);

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    setError(null);

    try {
      let ordersList: any[] = [];

      // 1. Try nested select
      const { data: nestedData, error: nestedErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            item_name,
            quantity,
            unit_price,
            total_price,
            food_type
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', dateRange.startIso)
        .lte('created_at', dateRange.endIso)
        .order('created_at', { ascending: true });

      if (!nestedErr && nestedData) {
        ordersList = nestedData;
      } else {
        // 2. Resilient fallback: fetch orders and items separately to prevent join/schema caching errors
        const { data: rawOrders, error: rawOrdersErr } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', dateRange.startIso)
          .lte('created_at', dateRange.endIso)
          .order('created_at', { ascending: true });

        if (rawOrdersErr) throw rawOrdersErr;

        if (rawOrders && rawOrders.length > 0) {
          const orderIds = rawOrders.map((o) => o.id);
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);

          const itemsByOrderId = new Map<string, any[]>();
          (itemsData || []).forEach((it) => {
            const arr = itemsByOrderId.get(it.order_id) || [];
            arr.push(it);
            itemsByOrderId.set(it.order_id, arr);
          });

          ordersList = rawOrders.map((o) => ({
            ...o,
            order_items: itemsByOrderId.get(o.id) || [],
          }));
        } else {
          ordersList = [];
        }
      }

      setOrdersData(ordersList);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [restaurant, dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Compute Aggregates & Metrics
  const metrics: ReportMetrics = useMemo(() => {
    let totalOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let pendingOrActiveOrders = 0;

    let grossSales = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let grandTotal = 0;

    let paidAmount = 0;
    let unpaidAmount = 0;
    let partiallyPaidAmount = 0;
    let refundedAmount = 0;

    const paymentMethods = {
      cash: 0,
      card: 0,
      upi: 0,
      online: 0,
      other: 0,
    };

    const itemMap = new Map<string, TopItem>();

    // Prepare time series buckets based on period
    const timePointsMap = new Map<string, { label: string; subLabel?: string; sales: number; orders: number }>();

    if (period === 'daily') {
      // 6 time blocks for the day
      for (let h = 0; h < 24; h += 4) {
        const hEnd = h + 4;
        const key = `${String(h).padStart(2, '0')}:00`;
        const label = `${h}:00 - ${hEnd}:00`;
        timePointsMap.set(key, { label, sales: 0, orders: 0 });
      }
    }

    ordersData.forEach((order) => {
      totalOrders += 1;
      const orderSt = String(order.order_status || 'pending').toLowerCase();
      const paySt = String(order.payment_status || 'unpaid').toLowerCase();
      const payMethod = String(order.payment_method || 'cash').toLowerCase();

      const total = Number(order.grand_total || 0);
      const subtotal = Number(order.total_amount || 0);
      const discount = Number(order.discount_amount || 0);
      const tax = Number(order.tax_amount || 0);

      if (orderSt === 'cancelled') {
        cancelledOrders += 1;
      } else {
        if (orderSt === 'completed' || orderSt === 'served') {
          completedOrders += 1;
        } else {
          pendingOrActiveOrders += 1;
        }

        // Sales numbers (exclude cancelled orders)
        grossSales += subtotal;
        discountAmount += discount;
        taxAmount += tax;
        grandTotal += total;

        // Payment status accounting
        if (paySt === 'paid') {
          paidAmount += total;
        } else if (paySt === 'unpaid' || paySt === 'pending') {
          unpaidAmount += total;
        } else if (paySt === 'partially_paid') {
          partiallyPaidAmount += total;
        } else if (paySt === 'refunded') {
          refundedAmount += total;
        }

        // Payment methods accounting
        if (payMethod.includes('cash')) paymentMethods.cash += total;
        else if (payMethod.includes('card')) paymentMethods.card += total;
        else if (payMethod.includes('upi')) paymentMethods.upi += total;
        else if (payMethod.includes('online')) paymentMethods.online += total;
        else paymentMethods.other += total;

        // Aggregate top menu items
        const items = order.order_items || [];
        items.forEach((it: any) => {
          const name = String(it.item_name || 'Unknown Item');
          const qty = Number(it.quantity || 1);
          const rev = Number(it.total_price || (it.unit_price ? it.unit_price * qty : 0));
          const foodType = it.food_type;

          if (!itemMap.has(name)) {
            itemMap.set(name, {
              name,
              food_type: foodType,
              quantity: qty,
              revenue: rev,
            });
          } else {
            const existing = itemMap.get(name)!;
            existing.quantity += qty;
            existing.revenue += rev;
          }
        });

        // Time Series Bucket Allocation
        const createdAt = new Date(order.created_at);
        if (period === 'daily') {
          const hour = createdAt.getHours();
          const bucketHour = Math.floor(hour / 4) * 4;
          const bucketKey = `${String(bucketHour).padStart(2, '0')}:00`;
          if (timePointsMap.has(bucketKey)) {
            const pt = timePointsMap.get(bucketKey)!;
            pt.sales += total;
            pt.orders += 1;
          }
        } else {
          // Group by Date YYYY-MM-DD
          const dayKey = createdAt.toISOString().split('T')[0];
          const shortLabel = createdAt.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
          });

          if (!timePointsMap.has(dayKey)) {
            timePointsMap.set(dayKey, {
              label: shortLabel,
              subLabel: dayKey,
              sales: total,
              orders: 1,
            });
          } else {
            const pt = timePointsMap.get(dayKey)!;
            pt.sales += total;
            pt.orders += 1;
          }
        }
      }
    });

    const activeNonCancelled = completedOrders + pendingOrActiveOrders;
    const averageOrderValue = activeNonCancelled > 0 ? grandTotal / activeNonCancelled : 0;

    const topItems = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    const timePoints = Array.from(timePointsMap.values());

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrActiveOrders,
      grossSales,
      discountAmount,
      taxAmount,
      grandTotal,
      averageOrderValue,
      paidAmount,
      unpaidAmount,
      partiallyPaidAmount,
      refundedAmount,
      paymentMethods,
      topItems,
      timePoints,
    };
  }, [ordersData, period]);

  // Max sales in time points for bar chart scaling
  const maxSales = useMemo(() => {
    const max = Math.max(...metrics.timePoints.map((tp) => tp.sales), 1);
    return max;
  }, [metrics.timePoints]);

  // Handle CSV Download
  const handleDownloadCsv = async () => {
    if (ordersData.length === 0) {
      alert('No order data found for the selected period.');
      return;
    }

    triggerHaptic('medium');
    setExporting(true);
    setDownloadSuccess(null);

    try {
      // Build structured CSV Header & Item-level Rows
      const headers = [
        'Order ID',
        'Order Number',
        'Date',
        'Time',
        'Table Number',
        'Order Type',
        'Customer Name',
        'Customer Mobile',
        'Item Name',
        'Food Type',
        'Item Quantity',
        'Item Unit Price',
        'Item Line Total',
        'Order Subtotal',
        'Order Tax',
        'Order Discount',
        'Order Grand Total',
        'Order Status',
        'Payment Status',
        'Payment Method',
        'Payment Method Note',
        'Order Notes',
      ];

      const rows: string[][] = [];

      ordersData.forEach((order) => {
        const orderDate = new Date(order.created_at);
        const dateStr = orderDate.toISOString().split('T')[0];
        const timeStr = orderDate.toLocaleTimeString();

        const items = order.order_items && order.order_items.length > 0 ? order.order_items : [null];

        items.forEach((item: any) => {
          rows.push([
            `"${order.id}"`,
            `"#${order.order_number || ''}"`,
            `"${dateStr}"`,
            `"${timeStr}"`,
            `"${order.table_number || 'N/A'}"`,
            `"${order.order_type || 'dine_in'}"`,
            `"${(order.customer_name || 'Walk-in').replace(/"/g, '""')}"`,
            `"${order.customer_mobile || ''}"`,
            `"${(item?.item_name || 'General Order').replace(/"/g, '""')}"`,
            `"${item?.food_type || ''}"`,
            String(item?.quantity || 1),
            Number(item?.unit_price || 0).toFixed(2),
            Number(item?.total_price || 0).toFixed(2),
            Number(order.total_amount || 0).toFixed(2),
            Number(order.tax_amount || 0).toFixed(2),
            Number(order.discount_amount || 0).toFixed(2),
            Number(order.grand_total || 0).toFixed(2),
            `"${order.order_status || 'pending'}"`,
            `"${order.payment_status || 'unpaid'}"`,
            `"${order.payment_method || 'cash'}"`,
            `"${(order.payment_method_note || order.notes || '').replace(/"/g, '""')}"`,
            `"${(order.notes || '').replace(/"/g, '""')}"`,
          ]);
        });
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const filename = `restaurant-report-${period}-${selectedDate}.csv`;

      const result = await downloadCsvFile(csvContent, filename);
      triggerHaptic('success');
      setDownloadSuccess(result.message || `CSV report exported: ${filename}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('Failed to export CSV report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header & Filter Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Sales & Orders Analytics
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active Range: <strong className="text-slate-800">{dateRange.label}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                fetchReportData();
              }}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition native-press"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={exporting || loading || ordersData.length === 0}
              className="inline-flex items-center gap-2 btn-theme-primary font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 transition shadow-theme native-press disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPeriod(t.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition native-press ${
                  period === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Dynamic Date Inputs based on Period */}
          <div className="flex items-center gap-2 flex-wrap">
            {period === 'daily' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-theme-light"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Today
                </button>
              </div>
            )}

            {period === 'weekly' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Ending on:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-theme-light"
                />
              </div>
            )}

            {period === 'monthly' && (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-theme-light"
                />
              </div>
            )}

            {period === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-theme-light"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-theme-light"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading ? (
        <ReportsSkeleton />
      ) : ordersData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <CalendarRange className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Orders in Selected Period</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are no recorded orders for {dateRange.label}. Try selecting a different date or date range.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TOP KPI METRICS GRID                                                      */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Sales Revenue */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Sales</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  <span className="text-theme-primary mr-0.5 text-base font-bold">
                    {currencySymbol}
                  </span>
                  {metrics.grandTotal.toFixed(2)}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>Gross: {metrics.grossSales.toFixed(2)}</span>
                  {metrics.taxAmount > 0 && <span>• Tax: {metrics.taxAmount.toFixed(2)}</span>}
                </div>
              </div>
            </div>

            {/* Total Orders & Status Breakdown */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Orders Volume</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {metrics.totalOrders} <span className="text-xs text-slate-400 font-semibold">orders</span>
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {metrics.completedOrders} Done
                  </span>
                  {metrics.cancelledOrders > 0 && (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5">
                      <XCircle className="w-3 h-3" />
                      {metrics.cancelledOrders} Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Paid vs Unpaid Amount */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Paid Collections</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                  <span className="text-xs font-bold mr-0.5 text-slate-400">{currencySymbol}</span>
                  {metrics.paidAmount.toFixed(2)}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-rose-600">
                  {metrics.unpaidAmount > 0 && (
                    <span>Unpaid: {currencySymbol} {metrics.unpaidAmount.toFixed(2)}</span>
                  )}
                  {metrics.partiallyPaidAmount > 0 && (
                    <span>• Partial: {currencySymbol} {metrics.partiallyPaidAmount.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Avg Ticket Size</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  <span className="text-xs font-bold mr-0.5 text-slate-400">{currencySymbol}</span>
                  {metrics.averageOrderValue.toFixed(2)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Per completed/active order</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CHARTS SECTION                                                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Sales Trend Chart (2 columns on large screen) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Sales Trend Over Time
                    </h3>
                    <p className="text-xs text-slate-500">
                      {period === 'daily' ? 'Revenue by time slot' : 'Daily sales breakdown'}
                    </p>
                  </div>
                  {activeTooltip && (
                    <div className="text-right">
                      <span className="text-xs font-bold text-theme-primary">
                        {currencySymbol} {activeTooltip.sales.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-400">{activeTooltip.orders} orders</p>
                    </div>
                  )}
                </div>

                {/* Responsive SVG Bar Chart */}
                <div className="h-56 sm:h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
                  {metrics.timePoints.map((tp, idx) => {
                    const heightPercent = Math.max(8, (tp.sales / maxSales) * 100);
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        onMouseEnter={() => setActiveTooltip(tp)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onClick={() => setActiveTooltip(tp)}
                      >
                        {/* Hover Floating Bubble */}
                        <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                          {currencySymbol} {tp.sales.toFixed(0)} ({tp.orders} ord)
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
                            tp.sales > 0
                              ? 'bg-gradient-to-t from-theme-primary to-orange-400 group-hover:brightness-110 shadow-xs'
                              : 'bg-slate-100'
                          }`}
                        />

                        {/* Label */}
                        <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                          {tp.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
                <span>Hover/tap on bars to view details</span>
                <span>Peak: {currencySymbol} {maxSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  Payment Method Split
                </h3>
                <p className="text-xs text-slate-500 mb-4">Distribution by payment channel</p>

                <div className="space-y-3">
                  {[
                    { key: 'cash', label: 'Cash', icon: DollarSign, amount: metrics.paymentMethods.cash, color: 'bg-emerald-500' },
                    { key: 'upi', label: 'UPI / QR', icon: Smartphone, amount: metrics.paymentMethods.upi, color: 'bg-blue-500' },
                    { key: 'card', label: 'Card / POS', icon: CreditCard, amount: metrics.paymentMethods.card, color: 'bg-purple-500' },
                    { key: 'online', label: 'Online Gateway', icon: Globe, amount: metrics.paymentMethods.online, color: 'bg-cyan-500' },
                    { key: 'other', label: 'Other Methods', icon: HelpCircle, amount: metrics.paymentMethods.other, color: 'bg-amber-500' },
                  ].map((method) => {
                    const pct = metrics.grandTotal > 0 ? (method.amount / metrics.grandTotal) * 100 : 0;
                    const Icon = method.icon;
                    return (
                      <div key={method.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            {method.label}
                          </span>
                          <span className="font-bold text-slate-800">
                            {currencySymbol} {method.amount.toFixed(2)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full ${method.color} rounded-full transition-all duration-500`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Summary Pill */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Collected Total</span>
                <span className="font-bold text-emerald-700">
                  {currencySymbol} {metrics.paidAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP SELLING MENU ITEMS TABLE / LIST                                       */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Top-Selling Menu Items
                </h3>
                <p className="text-xs text-slate-500">
                  Items ranked by order quantity & revenue contribution
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {metrics.topItems.length} items sold
              </span>
            </div>

            {metrics.topItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No item details recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      <th className="py-2.5 px-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.topItems.map((item, idx) => {
                      const sharePct = metrics.grandTotal > 0 ? (item.revenue / metrics.grandTotal) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{item.name}</div>
                            {item.food_type && (
                              <span className="text-[10px] text-slate-400 capitalize">
                                {item.food_type}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                            {currencySymbol} {item.revenue.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-xs font-semibold text-slate-500 font-mono">
                              {sharePct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
