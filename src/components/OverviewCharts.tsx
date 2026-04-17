import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

interface OverviewChartsProps {
  data: any[];
}

export const OverviewCharts: React.FC<OverviewChartsProps> = ({ data }) => {
  // Simple check for data
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500 glass-panel rounded-3xl">
        Not enough data yet. Start logging to see trends!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calories Trend */}
      <div className="glass-panel p-6 rounded-[32px] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Calories Trend</h3>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Last 7 Days</span>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area 
                type="monotone" 
                dataKey="total_calories" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCalories)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protein Intake */}
      <div className="glass-panel p-6 rounded-[32px] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Protein Intake (g)</h3>
          <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">Weekly Overview</span>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Bar 
                dataKey="total_protein" 
                fill="#3b82f6" 
                radius={[6, 6, 0, 0]}
                barSize={32}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.total_protein > 150 ? '#3b82f6' : '#60a5fa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
