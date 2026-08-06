import React from 'react';
import { Drawer } from '../components/Drawer';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ExternalLink } from '../icons';

export interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNum?: string;
  memberName?: string;
  amount?: number;
  date?: string;
  status?: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = React.memo(({
  isOpen,
  onClose,
  invoiceNum = 'INV-2024-001',
  memberName = 'Marcus Vance',
  amount = 249,
  date = 'Jul 01, 2024',
  status = 'Paid',
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Invoice ${invoiceNum}`} side="right">
      <div className="flex flex-col gap-6 select-none pb-8">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-white/10">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-mono">{invoiceNum}</span>
            <h3 className="text-base font-extrabold text-white">{memberName}</h3>
          </div>
          <Badge variant="success" size="sm">{status}</Badge>
        </div>

        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">VIP Unlimited Membership (Monthly)</span>
            <span className="font-mono font-bold text-white">$249.00</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Sales Tax (8.875%)</span>
            <span className="font-mono font-bold text-slate-300">$0.00 (Included)</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-sm pt-2">
            <span className="text-white">Total Charged:</span>
            <span className="font-mono text-emerald-400">${amount}.00</span>
          </div>
        </div>

        <Button variant="primary" size="md" leftIcon={<ExternalLink className="w-4 h-4" />} onClick={onClose} className="w-full">
          Download PDF Receipt
        </Button>
      </div>
    </Drawer>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
