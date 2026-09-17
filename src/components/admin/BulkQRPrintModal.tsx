import { useState, useCallback } from 'react';
import {
  Printer,
  X,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
  QrCode,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import {
  generateQRCardDataUrl,
  getBulkQRPrintHtml,
} from '@/lib/qrCanvasGenerator';
import { printIframeHtml } from '@/lib/fileExport';
import { triggerHaptic } from '@/lib/haptics';

export interface BulkTableItem {
  id: string | number;
  table_number: string;
  table_name?: string;
  qr_token?: string;
  is_active?: boolean;
}

interface BulkQRPrintModalProps {
  tables: BulkTableItem[];
  restaurantName?: string;
  logoUrl?: string | null;
  getTableQRUrl: (token: string) => string;
  onClose: () => void;
}

export function BulkQRPrintModal({
  tables,
  restaurantName = 'Smart Restaurant',
  logoUrl,
  getTableQRUrl,
  onClose,
}: BulkQRPrintModalProps) {
  // Filter tables that have QR tokens
  const validTables = tables.filter((t) => t.qr_token && t.qr_token.trim() !== '');

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    () => new Set(validTables.map((t) => t.id))
  );
  const [layout, setLayout] = useState<'4perA4' | '6perA4' | '1perPage'>('4perA4');
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const toggleSelect = (id: string | number) => {
    triggerHaptic('selection');
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    triggerHaptic('selection');
    if (selectedIds.size === validTables.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validTables.map((t) => t.id)));
    }
  };

  const handlePrint = useCallback(async () => {
    const selectedTables = validTables.filter((t) => selectedIds.has(t.id));
    if (selectedTables.length === 0) return;

    triggerHaptic('medium');
    setPrinting(true);
    setProgress({ current: 0, total: selectedTables.length });

    try {
      const renderedCards: Array<{
        cardDataUrl: string;
        tableNumber: string;
        tableName?: string;
      }> = [];

      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        setProgress({ current: i + 1, total: selectedTables.length });

        const qrValue = getTableQRUrl(table.qr_token!);
        const cardDataUrl = await generateQRCardDataUrl({
          tableNumber: String(table.table_number),
          tableName: table.table_name,
          qrValue,
          restaurantName,
          logoUrl,
        });

        renderedCards.push({
          cardDataUrl,
          tableNumber: String(table.table_number),
          tableName: table.table_name,
        });
      }

      const bulkHtml = getBulkQRPrintHtml(renderedCards, layout);
      printIframeHtml(bulkHtml, `${restaurantName} - Table QR Sheets`);
      triggerHaptic('success');
      onClose();
    } catch (err) {
      console.error('Bulk QR print failed:', err);
      alert('Failed to generate print sheets. Please try again.');
    } finally {
      setPrinting(false);
      setProgress(null);
    }
  }, [validTables, selectedIds, getTableQRUrl, restaurantName, logoUrl, layout, onClose]);

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-bottom-sheet sm:animate-none pb-safe sm:pb-0">
        {/* Grab bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-theme-light flex items-center justify-center text-theme-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Print All Table QRs
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {validTables.length} tables with QR codes ready to print
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition native-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Layout Selection */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">
              1. Choose Print Layout
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setLayout('4perA4');
                }}
                className={`p-3 rounded-2xl border text-center transition native-press flex flex-col items-center gap-1.5 ${
                  layout === '4perA4'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-black shadow-xs ring-1 ring-theme-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <LayoutGrid className="w-5 h-5 text-theme-primary" />
                <span className="text-xs leading-tight">4 Cards / A4</span>
                <span className="text-[10px] text-slate-400 font-normal">Standard Standee</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setLayout('6perA4');
                }}
                className={`p-3 rounded-2xl border text-center transition native-press flex flex-col items-center gap-1.5 ${
                  layout === '6perA4'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-black shadow-xs ring-1 ring-theme-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <LayoutGrid className="w-5 h-5 text-cyan-600" />
                <span className="text-xs leading-tight">6 Cards / A4</span>
                <span className="text-[10px] text-slate-400 font-normal">Economy Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setLayout('1perPage');
                }}
                className={`p-3 rounded-2xl border text-center transition native-press flex flex-col items-center gap-1.5 ${
                  layout === '1perPage'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-black shadow-xs ring-1 ring-theme-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-xs leading-tight">1 Full Page / Table</span>
                <span className="text-[10px] text-slate-400 font-normal">Large Format</span>
              </button>
            </div>
          </div>

          {/* Table Selection Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                2. Select Tables to Print ({selectedCount} / {validTables.length})
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-bold text-theme-primary hover:underline"
              >
                {selectedIds.size === validTables.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/50">
              {validTables.map((table) => {
                const isSelected = selectedIds.has(table.id);
                return (
                  <button
                    key={String(table.id)}
                    type="button"
                    onClick={() => toggleSelect(table.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition native-press ${
                      isSelected
                        ? 'bg-white border-theme-primary shadow-xs font-bold text-slate-900'
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-theme-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate">Table {table.table_number}</p>
                      {table.table_name && (
                        <p className="text-[10px] text-slate-400 truncate">{table.table_name}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={printing || selectedCount === 0}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl btn-theme-primary text-xs sm:text-sm font-black text-white shadow-theme transition native-press disabled:opacity-50"
          >
            {printing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Rendering ({progress?.current || 0}/{progress?.total || 0})…
                </span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Print {selectedCount} Table QRs</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
