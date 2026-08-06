import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { DollarSign, Check } from '../icons';

export interface POSItem {
  id: string;
  name: string;
  price: number;
}

export interface POSPanelProps {
  onProcessCheckout?: (total: number) => void;
  className?: string;
}

export const POSPanel: React.FC<POSPanelProps> = React.memo(({
  onProcessCheckout,
  className,
}) => {
  const [cart, setCart] = useState<POSItem[]>([]);

  const availableItems: POSItem[] = [
    { id: '1', name: '1-Day Guest Pass', price: 25 },
    { id: '2', name: 'Whey Protein Isolate Shake', price: 6 },
    { id: '3', name: 'STRIVA Workout Towel', price: 15 },
    { id: '4', name: '1-on-1 PT Express Session', price: 60 },
  ];

  const handleAddToCart = (item: POSItem) => {
    setCart((prev) => [...prev, item]);
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Front Desk POS Terminal</span>
        </div>
        <Badge variant="primary" size="sm">{cart.length} Cart Items</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {availableItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAddToCart(item)}
            className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-amber-400 transition-all flex flex-col items-center justify-center text-center gap-1"
          >
            <span className="text-xs font-bold text-white leading-tight">{item.name}</span>
            <span className="text-xs font-mono font-extrabold text-amber-400">${item.price}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-white/10 text-xs">
        <span className="text-slate-400 font-semibold">Total Order Amount:</span>
        <span className="text-lg font-black font-mono text-emerald-400">${cartTotal}.00</span>
      </div>

      <Button
        variant="primary"
        size="md"
        leftIcon={<Check className="w-4 h-4 stroke-[3]" />}
        onClick={() => {
          if (onProcessCheckout) onProcessCheckout(cartTotal);
          setCart([]);
        }}
        disabled={cart.length === 0}
      >
        Charge Customer Card / POS Terminal (${cartTotal})
      </Button>
    </Card>
  );
});

POSPanel.displayName = 'POSPanel';
