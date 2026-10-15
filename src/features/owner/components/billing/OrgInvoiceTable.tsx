import React, { useState } from 'react';
import { FileText, Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { OrgInvoice } from '../../../../api/orgBillingApi';
import { InvoiceDetailModal } from './InvoiceDetailModal';

interface Props {
  invoices: OrgInvoice[];
  isLoading?: boolean;
}

export const OrgInvoiceTable: React.FC<Props> = ({ invoices, isLoading }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<OrgInvoice | null>(null);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Unpaid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="org-invoices-section" className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">Invoices & Payment Receipts</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditable payment history and generated receipts for gym software licenses
        </p>
      </div>

      <div className="rounded-3xl bg-[#0a0d14] border border-white/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">No Invoices Issued Yet</span>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Receipts will appear here automatically when software subscription payments are confirmed.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#06080e] border-b border-white/[0.04] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Document #</th>
                  <th className="py-3.5 px-5">Type</th>
                  <th className="py-3.5 px-5">Issue Date</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 font-mono text-xs text-white font-medium">
                      {inv.invoice_number}
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                        {inv.type === 'tax_invoice' ? 'Tax Invoice' : 'Receipt'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-400">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="py-4 px-5 font-bold text-white">
                      {(inv.amount_paise / 100).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </td>
                    <td className="py-4 px-5">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
