import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Check } from '../icons';

export interface ShoppingItem {
  id: string;
  name: string;
  category: 'Proteins' | 'Carbs' | 'Fats & Produce';
  checked: boolean;
}

export interface ShoppingListProps {
  initialItems?: ShoppingItem[];
  className?: string;
}

export const ShoppingList: React.FC<ShoppingListProps> = React.memo(({
  initialItems = [
    { id: '1', name: 'Boneless Skinless Chicken Breast (1kg)', category: 'Proteins', checked: true },
    { id: '2', name: 'Whey Protein Isolate Vanilla (2kg)', category: 'Proteins', checked: true },
    { id: '3', name: 'Wild Catch Salmon Fillets (500g)', category: 'Proteins', checked: false },
    { id: '4', name: 'Rolled Oats & Organic Quinoa', category: 'Carbs', checked: false },
    { id: '5', name: 'Sweet Potatoes & Avocados', category: 'Fats & Produce', checked: false },
  ],
  className,
}) => {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
  };

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Grocery & Meal Prep List</span>
        <Badge variant="neutral" size="sm">{items.filter((i) => i.checked).length} / {items.length} Bought</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
              item.checked ? 'bg-slate-950/40 border-white/5 opacity-60' : 'bg-slate-900 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-800 border-white/20'
              }`}>
                {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className={`text-xs font-semibold ${item.checked ? 'line-through text-slate-500' : 'text-white'}`}>
                {item.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

ShoppingList.displayName = 'ShoppingList';
