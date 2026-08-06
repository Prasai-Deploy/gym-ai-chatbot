import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ChevronRight } from '../icons';

export interface InvoiceRecord {
  id: string;
  invoiceNum: string;
  memberName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
}

export interface InvoicesTableProps {
  invoices?: InvoiceRecord[];
  onSelectInvoice?: (id: string) => void;
  className?: string;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = React.memo(({
  invoices = [
    { id: 'inv1', invoiceNum: 'INV-2024-001', memberName: 'Marcus Vance', amount: 249, date: 'Jul 01, 2024', status: 'Paid' },
    { id: 'inv2', invoiceNum: 'INV-2024-002', memberName: 'Sarah Jenkins', amount: 125, date: 'Jul 01, 2024', status: 'Paid' },
    { id: 'inv3', invoiceNum: 'INV-2024-003', memberName: 'Lucas Torrez', amount: 249, date: 'Jul 02, 2024', status: 'Failed' },
    { id: 'inv4', invoiceNum: 'INV-2024-004', memberName: 'David Miller', amount: 79, date: 'Jul 03, 2024', status: 'Paid' },
  ],
  onSelectInvoice,
  className,
}) => {
  return (
    <Card variant="default" className={`p-0 overflow-hidden select-none ${className}`}>
      <div className="p-4 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Financial Invoices & Payment Ledger</span>
        <Badge variant="neutral" size="sm">{invoices.length} Recent Invoices</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Invoice #</th>
              <th className="p-4">Member Name</th>
              <th className="p-4">Billing Date</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4 text-right">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSelectInvoice?.(inv.id)}>
                <td className="p-4 font-mono font-bold text-white">{inv.invoiceNum}</td>
                <td className="p-4 font-semibold text-slate-200">{inv.memberName}</td>
                <td className="p-4 text-slate-400 font-mono">{inv.date}</td>
                <td className="p-4 font-mono font-extrabold text-emerald-400">${inv.amount}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Failed' ? 'danger' : 'warning'} size="sm">
                      {inv.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

InvoicesTable.displayName = 'InvoicesTable';
