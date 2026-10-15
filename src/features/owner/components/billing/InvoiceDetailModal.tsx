import React from 'react';
import { X, FileText, CheckCircle2, Calendar, Hash, IndianRupee, Info } from 'lucide-react';
import { OrgInvoice } from '../../../../api/orgBillingApi';

interface Props {
  invoice: OrgInvoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<Props> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const amountRupees = (invoice.amount_paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl bg-[#0b0e16] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="invoice-modal-title" className="text-base font-bold text-white">
                {invoice.type === 'tax_invoice' ? 'Tax Invoice' : 'Payment Receipt'}
              </h3>
              <span className="text-xs font-mono text-slate-400">{invoice.invoice_number}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.04]">
            <span className="text-[11px] text-slate-500 font-medium block">Issue Date</span>
            <span className="text-slate-200 font-semibold block mt-1">
              {formatDate(invoice.issued_at)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.04]">
            <span className="text-[11px] text-slate-500 font-medium block">Payment Status</span>
            <span className="text-emerald-400 font-bold block mt-1 capitalize flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {invoice.status}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.04]">
            <span className="text-[11px] text-slate-500 font-medium block">Payment ID</span>
            <span className="text-slate-300 font-mono text-[11px] block mt-1 truncate">
              {invoice.razorpay_payment_id || 'Direct Provider Reference'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.04]">
            <span className="text-[11px] text-slate-500 font-medium block">Document Type</span>
            <span className="text-slate-300 font-semibold block mt-1 uppercase text-[11px]">
              {invoice.type === 'tax_invoice' ? 'Tax Invoice' : 'Payment Receipt (Pre-Tax)'}
            </span>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</h4>
          <div className="rounded-2xl bg-[#06080e] border border-white/[0.04] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {invoice.line_items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-semibold block">{item.description}</span>
                    <span className="text-[11px] text-slate-500">Qty: {item.quantity}</span>
                  </div>
                  <span className="text-white font-bold">
                    {(item.amount_paise / 100).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Total Amount</span>
              <span className="text-base font-black text-orange-400">{amountRupees}</span>
            </div>
          </div>
        </div>

        {/* Tax Note */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {invoice.tax_details?.note ||
              'Formally issued as a payment receipt. GSTIN and tax compliance breakdowns remain unconfigured pending approved tax review.'}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
