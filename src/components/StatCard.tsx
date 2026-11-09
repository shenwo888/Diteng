import { type ReactNode } from 'react';
import { useStore } from '@/store';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  isCurrency?: boolean;
}

export default function StatCard({ label, value, icon, color, isCurrency = true }: StatCardProps) {
  const { formatMoney } = useStore();
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {isCurrency ? formatMoney(value) : value.toLocaleString()}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatCardList({ stats }: { stats: StatCardProps[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
    </div>
  );
}
