// components/OrderPrint.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Printer,
  X,
  Loader2,
  Plus,
  Trash2,
  Receipt,
  ChefHat,
  FileText,
  Search,
  Share2,
  Download,
  CheckCircle,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { shareImageFile, downloadImageFile, printIframeHtml } from '@/lib/fileExport';
import { Capacitor } from '@capacitor/core';
import { ReceiptSkeleton } from './Skeleton';

interface OrderPrintProps {
  orderId: string | number;
  onClose: () => void;
}

interface OrderItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  food_type?: string;
  notes?: string;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_mobile: string;
  table_number: string;
  order_type: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  notes: string;
  created_at: string;
  restaurant?: {
    name: string;
    address: string;
    city: string;
    phone_code: string;
    mobile: string;
    email: string;
    gst_number: string;
  };
  items: OrderItem[];
}

type PrintMode = '80mm' | 'kot' | '8inch';
type FontStyle = 'thermal' | 'modern';

export default function OrderPrint({ orderId, onClose }: OrderPrintProps) {
  const { restaurant: authRestaurant } = useAuth();
  const currencySymbol = authRestaurant?.currency_symbol || authRestaurant?.currency || '₹';
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('80mm');
  const [fontStyle, setFontStyle] = useState<FontStyle>('thermal');
  const [showAddItem, setShowAddItem] = useState(false);
  const [menuItemsList, setMenuItemsList] = useState<Array<{ id: string; name: string; price: number; food_type: string }>>([]);
  const [newItemForm, setNewItemForm] = useState({
    item_name: '',
    quantity: 1,
    unit_price: 0,
    food_type: 'veg',
    notes: '',
  });
  const [savingItem, setSavingItem] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrderData();
    fetchMenuItems();
  }, [orderId]);

  async function fetchMenuItems() {
    if (!authRestaurant) return;
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, price, food_type')
        .eq('restaurant_id', authRestaurant.id)
        .eq('is_available', true)
        .order('name');
      if (data) setMenuItemsList(data);
    } catch (e) {
      console.warn('Error fetching menu items for receipt add:', e);
    }
  }

  async function fetchOrderData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Order Details with restaurant info and order_items
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurant_id (
            name,
            address,
            city,
            phone_code,
            mobile,
            email,
            gst_number
          ),
          order_items (
            *
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const raw: any = orderData;
      let rawItems = (raw.order_items || raw.items || []) as any[];

      // Fallback: If relation didn't return items, query directly by order_id
      if (!rawItems || rawItems.length === 0) {
        const { data: directItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        if (directItems && directItems.length > 0) {
          rawItems = directItems;
        }
      }

      // Check if any item is missing its name and has menu_item_id
      const missingNameItemIds = rawItems
        .filter((it: any) => !(it.item_name || it.name || it.title) && it.menu_item_id)
        .map((it: any) => it.menu_item_id);

      const menuMap: Record<string, string> = {};
      if (missingNameItemIds.length > 0) {
        const { data: menuList } = await supabase
          .from('menu_items')
          .select('id, name')
          .in('id', missingNameItemIds);
        if (menuList) {
          menuList.forEach((m: any) => {
            menuMap[m.id] = m.name;
          });
        }
      }

      // Map items reliably resolving name from item_name, name, title, or menu_item_id
      const items: OrderItem[] = rawItems.map((it: any) => {
        const resolvedName =
          it.item_name ||
          it.name ||
          (it.menu_item_id ? menuMap[it.menu_item_id] : '') ||
          it.title ||
          it.item ||
          'Menu Item';

        return {
          id: it.id,
          item_name: resolvedName,
          quantity: Number(it.quantity || it.qty || 1),
          unit_price: Number(it.unit_price || it.price || it.rate || 0),
          total_price: Number(
            it.total_price ||
            it.total ||
            (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0))
          ),
          food_type: it.food_type || 'veg',
          notes: it.notes || it.special_instructions || '',
        };
      });

      setOrder({
        ...raw,
        order_number: String(raw.order_number || raw.id?.slice?.(0, 6) || 'N/A'),
        customer_name: String(raw.customer_name || 'Walk-in'),
        customer_mobile: String(raw.customer_mobile || ''),
        table_number: String(raw.table_number || 'Takeaway'),
        order_type: String(raw.order_type || 'dine_in'),
        order_status: String(raw.order_status || 'completed'),
        payment_status: String(raw.payment_status || 'paid'),
        payment_method: String(raw.payment_method || 'Cash'),
        total_amount: Number(raw.total_amount || 0),
        tax_amount: Number(raw.tax_amount || 0),
        discount_amount: Number(raw.discount_amount || 0),
        grand_total: Number(raw.grand_total || 0),
        notes: String(raw.notes || ''),
        created_at: String(raw.created_at || new Date().toISOString()),
        restaurant: raw.restaurant || authRestaurant,
        items,
      });
    } catch (err) {
      console.error('Error fetching order for print:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }

  // Handle Adding Item to Receipt & Order in Database
  async function handleAddItemToOrder() {
    if (!order || !newItemForm.item_name.trim()) return;
    triggerHaptic('success');
    setSavingItem(true);

    try {
      const qty = Math.max(1, Number(newItemForm.quantity) || 1);
      const price = Math.max(0, Number(newItemForm.unit_price) || 0);
      const lineTotal = qty * price;

      // 1. Insert into order_items table
      const { data: insertedItem, error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          item_name: newItemForm.item_name.trim(),
          quantity: qty,
          unit_price: price,
          total_price: lineTotal,
          food_type: newItemForm.food_type,
          notes: newItemForm.notes.trim() || null,
        })
        .select()
        .single();

      if (itemErr) {
        console.warn('Direct insert returned error, inserting without select:', itemErr);
      }

      // 2. Recalculate Order Subtotal & Grand Total
      const updatedItems = [
        ...order.items,
        insertedItem || {
          item_name: newItemForm.item_name.trim(),
          quantity: qty,
          unit_price: price,
          total_price: lineTotal,
          food_type: newItemForm.food_type,
          notes: newItemForm.notes.trim(),
        },
      ];

      const newSubtotal = updatedItems.reduce((sum, it) => sum + it.total_price, 0);
      const taxRate = order.total_amount > 0 ? order.tax_amount / order.total_amount : 0.05;
      const newTax = Number((newSubtotal * taxRate).toFixed(2));
      const newGrandTotal = Number((newSubtotal + newTax - (order.discount_amount || 0)).toFixed(2));

      // 3. Update orders table
      await supabase
        .from('orders')
        .update({
          total_amount: newSubtotal,
          tax_amount: newTax,
          grand_total: newGrandTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      setOrder({
        ...order,
        items: updatedItems,
        total_amount: newSubtotal,
        tax_amount: newTax,
        grand_total: newGrandTotal,
      });

      setShowAddItem(false);
      setNewItemForm({
        item_name: '',
        quantity: 1,
        unit_price: 0,
        food_type: 'veg',
        notes: '',
      });
    } catch (err) {
      console.error('Error adding item to order:', err);
      alert('Failed to add item to order. Please try again.');
    } finally {
      setSavingItem(false);
    }
  }

  // Handle Remove Item
  async function handleRemoveItem(itemIndex: number) {
    if (!order) return;
    const targetItem = order.items[itemIndex];
    triggerHaptic('alert');

    try {
      if (targetItem?.id) {
        await supabase.from('order_items').delete().eq('id', targetItem.id);
      }

      const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);
      const newSubtotal = updatedItems.reduce((sum, it) => sum + it.total_price, 0);
      const taxRate = order.total_amount > 0 ? order.tax_amount / order.total_amount : 0.05;
      const newTax = Number((newSubtotal * taxRate).toFixed(2));
      const newGrandTotal = Math.max(0, Number((newSubtotal + newTax - (order.discount_amount || 0)).toFixed(2)));

      await supabase
        .from('orders')
        .update({
          total_amount: newSubtotal,
          tax_amount: newTax,
          grand_total: newGrandTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      setOrder({
        ...order,
        items: updatedItems,
        total_amount: newSubtotal,
        tax_amount: newTax,
        grand_total: newGrandTotal,
      });
    } catch (err) {
      console.error('Error removing item from order:', err);
    }
  }

  // Single-Page Strict 80mm Thermal & A4 In-App Print Trigger
  const handlePrint = () => {
    triggerHaptic('success');
    if (!printRef.current) return;

    const is80mm = printMode === '80mm' || printMode === 'kot';
    const isThermalFont = fontStyle === 'thermal';
    const printContents = printRef.current.innerHTML;

    const fullHtml = `
      <style>
        @page {
          size: ${is80mm ? '80mm auto' : 'A4 portrait'};
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
          width: ${is80mm ? '80mm' : '100%'} !important;
          max-width: ${is80mm ? '80mm' : '100%'} !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: ${
            isThermalFont
              ? "'Courier New', Courier, monospace"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
          };
          font-size: ${is80mm ? '11px' : '13px'};
          line-height: 1.3;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          page-break-inside: avoid !important;
        }
        .print-wrapper {
          width: ${is80mm ? '74mm' : '92%'};
          margin: 0 auto;
          padding: ${is80mm ? '4mm 1.5mm' : '10mm'};
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
        .italic { font-style: italic; }
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 16px; }
        .text-\\[9\\.5px\\], .text-\\[10px\\], .text-\\[10\\.5px\\] { font-size: 10px; }
        .text-\\[11px\\], .text-\\[11\\.5px\\] { font-size: 11px; }
        .border-t { border-top: 1px solid #000000; }
        .border-b { border-bottom: 1px solid #000000; }
        .border-b-2 { border-bottom: 2px solid #000000; }
        .border-dashed { border-style: dashed !important; }
        .border-dotted { border-style: dotted !important; }
        .border-black { border-color: #000000 !important; }
        .border-slate-300 { border-color: #cccccc !important; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .align-top { vertical-align: top; }
        .w-full { width: 100%; }
        .py-1 { padding-top: 3px; padding-bottom: 3px; }
        .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
        .my-1 { margin-top: 3px; margin-bottom: 3px; }
        .my-1\\.5 { margin-top: 4px; margin-bottom: 4px; }
        .my-2 { margin-top: 6px; margin-bottom: 6px; }
        .mt-0\\.5 { margin-top: 2px; }
        .mt-1 { margin-top: 3px; }
        .mt-1\\.5 { margin-top: 4px; }
        .mt-2 { margin-top: 6px; }
        .pt-0\\.5 { padding-top: 2px; }
        .pt-1\\.5 { padding-top: 4px; }
        .pt-2 { padding-top: 6px; }
        .pb-1\\.5 { padding-bottom: 4px; }
        .pb-2 { padding-bottom: 6px; }
        .space-y-0\\.5 > * + * { margin-top: 2px; }
        .space-y-1 > * + * { margin-top: 3px; }
        .space-y-2 > * + * { margin-top: 6px; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 2.5px 0;
          font-size: ${is80mm ? '11px' : '12px'};
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

    printIframeHtml(fullHtml, `Receipt #${order?.order_number || ''}`);
  };

  // Direct High-Resolution Exact Preview Download (PNG at 300 DPI)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const handleDownloadReceipt = async () => {
    if (!printRef.current || !order) return;
    triggerHaptic('medium');
    setDownloadingReceipt(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const dataUrl = await toPng(printRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Ultra crisp 300 DPI high resolution
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
        quality: 1,
      });

      const modeLabel = printMode === 'kot' ? 'KOT' : printMode === '8inch' ? 'A4' : '80mm';
      const fileName = `${modeLabel}-Order-${order.order_number || order.id}.png`;
      await downloadImageFile(dataUrl, fileName);
      triggerHaptic('success');
    } catch (err) {
      console.error('Error downloading receipt:', err);
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Thermal Share / Android Print Flow
  const [sharingReceipt, setSharingReceipt] = useState(false);
  const handleShareReceipt = async () => {
    if (!printRef.current || !order) return;
    triggerHaptic('medium');
    setSharingReceipt(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(printRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
        quality: 1,
      });

      const fileName = `receipt-${order.order_number}.png`;
      await shareImageFile(dataUrl, fileName, `Bill #${order.order_number}`);
      triggerHaptic('success');
    } catch (err) {
      console.error('Error sharing receipt:', err);
    } finally {
      setSharingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-backdrop">
        <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
              <div className="w-28 h-4 rounded-md bg-slate-100 animate-pulse" />
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ReceiptSkeleton />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
          <p className="text-sm font-bold text-rose-600 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition native-press"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isThermal = fontStyle === 'thermal';
  const restName = order.restaurant?.name || authRestaurant?.name || 'Restaurant';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden animate-bottom-sheet sm:animate-none pb-safe sm:pb-0">
        
        {/* Grab bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Bill #{order.order_number}
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                Table: {order.table_number || 'Walk-in'} • {order.items.length} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt || sharingReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition native-press shadow-xs disabled:opacity-50"
              title="Download exact bill preview as high-res PNG"
            >
              {downloadingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={handleShareReceipt}
              disabled={downloadingReceipt || sharingReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition native-press border border-slate-200 disabled:opacity-50"
              title="Share or send to thermal printer app"
            >
              {sharingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5 text-theme-primary" />}
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={downloadingReceipt || sharingReceipt}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 btn-theme-primary text-white rounded-xl text-xs sm:text-sm font-black transition shadow-theme native-press disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              type="button"
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

        {/* Print Configuration Controls Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {/* Format Tabs */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setPrintMode('80mm');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition native-press ${
                printMode === '80mm'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>80mm POS Roll</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setPrintMode('kot');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition native-press ${
                printMode === 'kot'
                  ? 'bg-white text-theme-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen KOT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setPrintMode('8inch');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition native-press ${
                printMode === '8inch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>8-Inch / A4</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setFontStyle(fontStyle === 'thermal' ? 'modern' : 'thermal');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition native-press text-[11px]"
              title="Toggle Font"
            >
              {fontStyle === 'thermal' ? '🖨️ POS Font' : '📄 Sans Font'}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowAddItem(!showAddItem);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-black hover:bg-emerald-100 transition native-press text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Add Item Inline Panel */}
        {showAddItem && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3.5 sm:p-4 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                Add Item to this Receipt
              </h4>
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="text-amber-800 hover:text-amber-950 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Menu Selection Chips */}
            {menuItemsList.length > 0 && (
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {menuItemsList.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setNewItemForm({
                          item_name: m.name,
                          quantity: 1,
                          unit_price: m.price,
                          food_type: m.food_type || 'veg',
                          notes: '',
                        });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-950 font-bold shrink-0 hover:bg-amber-100 transition native-press shadow-2xs"
                    >
                      {m.name} ({currencySymbol} {m.price})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Item name (e.g. Garlic Naan)"
                  value={newItemForm.item_name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, item_name: e.target.value })}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <input
                  type="number"
                  placeholder="Price"
                  min="0"
                  step="0.5"
                  value={newItemForm.unit_price || ''}
                  onChange={(e) => setNewItemForm({ ...newItemForm, unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newItemForm.quantity}
                  onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-14 bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs font-bold text-center focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddItemToOrder}
                  disabled={savingItem || !newItemForm.item_name.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-1.5 px-3 rounded-xl transition native-press disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                >
                  {savingItem ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Page Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100 flex justify-center">
          <div
            ref={printRef}
            style={{
              fontFamily: isThermal ? "'Courier New', Courier, monospace" : 'inherit',
            }}
            className={`bg-white shadow-xl rounded-2xl border border-slate-200/80 p-4 text-black transition-all ${
              printMode === '80mm' || printMode === 'kot'
                ? 'w-full max-w-[320px] text-[11.5px]'
                : 'w-full max-w-[540px] text-xs'
            }`}
          >
            {/* KOT MODE (Kitchen Order Ticket) */}
            {printMode === 'kot' ? (
              <div>
                <div className="text-center pb-1.5">
                  <h2 className="text-lg font-black uppercase tracking-wider">K.O.T.</h2>
                  <p className="text-xs font-bold">KITCHEN ORDER TICKET</p>
                  <p className="text-[10px] text-slate-600">{restName}</p>
                </div>

                <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 font-bold text-xs space-y-0.5">
                  <div className="flex justify-between text-sm">
                    <span>TABLE: <strong className="text-base">{order.table_number || 'Walk-in'}</strong></span>
                    <span>#{order.order_number}</span>
                  </div>
                  <div className="flex justify-between text-[10.5px]">
                    <span>Type: {order.order_type.toUpperCase()}</span>
                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {order.customer_name && (
                    <div className="text-[10.5px] text-slate-700">Guest: {order.customer_name}</div>
                  )}
                </div>

                {/* KOT Itemized Checklist */}
                <div className="my-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-black text-[10px] uppercase">
                        <th className="py-1 w-10 text-center">QTY</th>
                        <th className="py-1">MENU ITEM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-300 text-xs">
                      {order.items.map((it, idx) => (
                        <tr key={idx} className="font-bold">
                          <td className="py-1.5 text-center text-sm font-black align-top">
                            [{it.quantity}]
                          </td>
                          <td className="py-1.5 align-top">
                            <div className="text-xs font-black">{it.item_name}</div>
                            {it.notes && (
                              <div className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.5 rounded mt-0.5 inline-block">
                                Note: {it.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <div className="border-t border-black pt-1.5 mt-1.5">
                    <p className="text-[10px] font-black uppercase text-rose-600">Chef Instructions:</p>
                    <p className="text-[11px] font-bold">{order.notes}</p>
                  </div>
                )}

                <div className="border-t border-dashed border-black pt-1.5 mt-2 text-center text-[10px] text-slate-500">
                  --- END OF KOT ---
                </div>
              </div>
            ) : (
              /* Single Page 80mm & 8-Inch Standard Customer Bill */
              <div>
                {/* Header */}
                <div className="text-center pb-2">
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">{restName}</h1>
                  {order.restaurant?.address && (
                    <p className="text-[10.5px] text-slate-700 mt-0.5">{order.restaurant.address}</p>
                  )}
                  {order.restaurant?.city && (
                    <p className="text-[10.5px] text-slate-700">{order.restaurant.city}</p>
                  )}
                  {order.restaurant?.mobile && (
                    <p className="text-[10.5px] text-slate-800 font-bold">Tel: {order.restaurant.mobile}</p>
                  )}
                  {order.restaurant?.gst_number && (
                    <p className="text-[10.5px] font-black mt-0.5">GSTIN: {order.restaurant.gst_number}</p>
                  )}
                </div>

                {/* Order Metadata Bar */}
                <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 text-[10.5px] space-y-0.5 font-semibold">
                  <div className="flex justify-between">
                    <span>Order: <strong>#{order.order_number}</strong></span>
                    <span>Table: <strong className="text-xs">{order.table_number || 'Takeaway'}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {new Date(order.created_at).toLocaleDateString()}</span>
                    <span>Time: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type: {order.order_type.toUpperCase()}</span>
                    <span>Pay: {order.payment_method?.toUpperCase() || 'CASH'}</span>
                  </div>
                  {order.customer_name && (
                    <div className="flex justify-between pt-0.5 border-t border-dotted border-slate-300">
                      <span>Customer: {order.customer_name}</span>
                      {order.customer_mobile && <span>{order.customer_mobile}</span>}
                    </div>
                  )}
                </div>

                {/* Itemized Table */}
                <div className="my-1.5">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-black text-[9.5px] uppercase font-black">
                        <th className="py-1">Item Description</th>
                        <th className="py-1 text-center w-8">Qty</th>
                        <th className="py-1 text-right w-12">Rate</th>
                        <th className="py-1 text-right w-14">Total</th>
                        <th className="py-1 text-right w-5 no-print"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dotted divide-slate-300">
                      {order.items.map((it, idx) => (
                        <tr key={idx} className="group">
                          <td className="py-1 font-bold align-top">
                            <div className="text-black">{it.item_name}</div>
                            {it.notes && (
                              <div className="text-[9.5px] text-slate-500 italic">({it.notes})</div>
                            )}
                          </td>
                          <td className="py-1 text-center font-bold align-top">{it.quantity}</td>
                          <td className="py-1 text-right font-medium align-top">{it.unit_price.toFixed(2)}</td>
                          <td className="py-1 text-right font-bold align-top">{it.total_price.toFixed(2)}</td>
                          <td className="py-1 text-right no-print align-top">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-300 hover:text-red-600 transition p-0.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Totals */}
                <div className="border-t border-dashed border-black pt-1.5 my-1.5 space-y-0.5 text-[11px]">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>{currencySymbol} {order.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>

                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>GST / Tax</span>
                      <span>{currencySymbol} {order.tax_amount.toFixed(2)}</span>
                    </div>
                  )}

                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Discount</span>
                      <span>-{currencySymbol} {order.discount_amount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs font-black border-t border-b-2 border-black py-1 my-1">
                    <span className="uppercase">Grand Total</span>
                    <span className="text-sm">{currencySymbol} {order.grand_total?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex justify-between text-[10px] font-bold text-slate-700 pt-0.5">
                    <span>Payment Status:</span>
                    <span className="uppercase">{order.payment_status || 'PAID'}</span>
                  </div>
                </div>

                {/* Single Page Footer */}
                <div className="text-center pt-2 text-[10px] text-slate-700 border-t border-dashed border-black mt-2">
                  <p className="font-bold">Thank you for dining with us!</p>
                  <p className="text-[9.5px] text-slate-500 mt-0.5">Please visit again</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Strict 1-Page Layout ({printMode.toUpperCase()})
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition native-press"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt || sharingReceipt}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition native-press shadow-xs disabled:opacity-50"
            >
              {downloadingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download {printMode === 'kot' ? 'KOT' : 'Bill'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareReceipt}
              disabled={downloadingReceipt || sharingReceipt}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition native-press border border-slate-200 disabled:opacity-50"
            >
              {sharingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5 text-theme-primary" />}
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={downloadingReceipt || sharingReceipt}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 btn-theme-primary text-white rounded-xl text-xs sm:text-sm font-black transition shadow-theme native-press disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print {printMode === 'kot' ? 'KOT' : 'Bill'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}