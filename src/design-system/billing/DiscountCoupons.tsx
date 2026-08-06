import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface CouponItem {
  code: string;
  discount: string;
  usesCount: number;
}

export interface DiscountCouponsProps {
  coupons?: CouponItem[];
  onCreateCoupon?: () => void;
  className?: string;
}

export const DiscountCoupons: React.FC<DiscountCouponsProps> = React.memo(({
  coupons = [
    { code: 'SUMMER25', discount: '25% Off First 3 Months', usesCount: 42 },
    { code: 'VIPHERO', discount: '$50 Off VIP Upgrade', usesCount: 18 },
  ],
  onCreateCoupon,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Promotional Coupons & Discounts</span>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5 text-amber-400" />} onClick={onCreateCoupon}>
          Create Coupon
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {coupons.map((c, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-mono font-extrabold text-amber-400">{c.code}</span>
              <span className="text-[10px] text-slate-400">{c.discount}</span>
            </div>
            <Badge variant="primary" size="sm">{c.usesCount} Redeemed</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

DiscountCoupons.displayName = 'DiscountCoupons';
