import { useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Gift, Clock, Gamepad2, Crown, Headphones, Banknote } from 'lucide-react';
import { useStore } from '@/store';
import { formatDateTime, filterByTimeRange, type TimeRange } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { useI18n } from '@/lib/i18n';

export default function DashboardPage() {
  const { customers, companions, orders, transactions, staff, formatMoney } = useStore();
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const filteredOrders = useMemo(() => filterByTimeRange(orders, timeRange), [orders, timeRange]);
  const filteredTransactions = useMemo(() => filterByTimeRange(transactions, timeRange), [transactions, timeRange]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalRecharge = filteredTransactions.filter((t) => t.type === '充值').reduce((s, t) => s + t.amount, 0);
    const totalBalance = customers.reduce((s, c) => s + c.balance, 0);
    const totalGiftValue = filteredOrders.reduce((s, o) => s + o.gifts.reduce((gs, g) => gs + g.value, 0), 0);
    const totalHours = filteredOrders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.hours, 0), 0);

    const companionStats = companions.map((comp) => {
      const compOrders = filteredOrders.filter((o) => o.items.some((i) => i.companionId === comp.id));
      const orderCount = compOrders.length;
      const hours = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === comp.id).reduce((is, i) => is + i.hours, 0), 0);
      const revenue = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === comp.id).reduce((is, i) => is + i.amount, 0), 0);
      const giftValue = filteredOrders.reduce((s, o) => s + o.gifts.filter((g) => g.companionId === comp.id).reduce((gs, g) => gs + g.value, 0), 0);
      const salary = revenue * (comp.serviceRate / 100) + giftValue * (comp.giftRate / 100);
      return { companion: comp, orderCount, hours, revenue, giftValue, salary };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalCompanionSalary = companionStats.reduce((s, x) => s + x.salary, 0);

    const staffStats = staff.map((s) => {
      const sOrders = filteredOrders.filter((o) => o.staffId === s.id);
      const orderCount = sOrders.length;
      const revenue = sOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const commission = revenue * (s.commissionRate / 100);
      return { staff: s, orderCount, revenue, commission };
    }).sort((a, b) => b.revenue - a.revenue);

    return { totalRevenue, totalRecharge, totalBalance, totalGiftValue, totalHours, companionStats, staffStats, totalCompanionSalary };
  }, [customers, companions, staff, filteredOrders, filteredTransactions]);

  const recentOrders = filteredOrders.slice(0, 5);
  const rangeButtons: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];
  const rangeLabels: Record<TimeRange, string> = {
    today: t('今天', 'Today'),
    week: t('本周', 'This week'),
    month: t('本月', 'This month'),
    year: t('今年', 'This year'),
    all: t('全部', 'All'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('数据看板', 'Dashboard')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('营业总览与陪玩业绩统计', 'Revenue overview and companion performance')}</p>
        </div>
      </div>

      {/* Time range filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {rangeButtons.map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              timeRange === r ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('总营业额', 'Total revenue')} value={stats.totalRevenue} color="bg-sky-100 text-sky-600" icon={<TrendingUp size={22} />} />
        <StatCard label={t('总充值', 'Total recharge')} value={stats.totalRecharge} color="bg-emerald-100 text-emerald-600" icon={<Wallet size={22} />} />
        <StatCard label={t('剩余总余额', 'Total remaining balance')} value={stats.totalBalance} color="bg-amber-100 text-amber-600" icon={<TrendingDown size={22} />} />
        <StatCard label={t('总工时（小时）', 'Total hours')} value={stats.totalHours} color="bg-violet-100 text-violet-600" icon={<Clock size={22} />} isCurrency={false} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('总订单数', 'Total orders')} value={filteredOrders.length} color="bg-indigo-100 text-indigo-600" icon={<Gamepad2 size={22} />} isCurrency={false} />
        <StatCard label={t('顾客总数', 'Total customers')} value={customers.length} color="bg-teal-100 text-teal-600" icon={<Users size={22} />} isCurrency={false} />
        <StatCard label={t('礼物总价值', 'Total gift value')} value={stats.totalGiftValue} color="bg-rose-100 text-rose-600" icon={<Gift size={22} />} />
      </div>

      {/* Total companion salary highlight card */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 shadow-lg shadow-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-50 text-sm font-medium flex items-center gap-2"><Banknote size={18} /> {t('本期应付陪玩总薪资', 'Companion salaries payable this period')}</p>
            <p className="text-white text-3xl font-bold mt-2">{formatMoney(stats.totalCompanionSalary)}</p>
          </div>
          <div className="hidden sm:block">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wallet size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Companion Performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('陪玩个人业绩', 'Companion performance')}</h2>
        </div>
        {stats.companionStats.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无陪玩数据', 'No companion data yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('陪玩', 'Companion')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('接单数', 'Orders')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('总工时', 'Hours')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('创造业绩', 'Revenue')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('收到礼物', 'Gifts received')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('应付薪资', 'Salary payable')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.companionStats.map((s, idx) => (
                  <tr key={s.companion.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && stats.companionStats.length > 1 && (
                          <Crown size={16} className="text-amber-500" />
                        )}
                        <span className="font-medium text-slate-700">{s.companion.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{t(`${s.orderCount} 单`, `${s.orderCount} orders`)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.hours.toFixed(1)} h</td>
                    <td className="px-4 py-3 text-right font-medium text-sky-600">{formatMoney(s.revenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-rose-500">{formatMoney(s.giftValue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{formatMoney(s.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Headphones size={18} className="text-indigo-500" /> {t('客服业绩概览', 'Staff performance')}</h2>
        </div>
        {stats.staffStats.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无客服数据', 'No staff data yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('客服', 'Staff')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('提成比例', 'Commission rate')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('处理订单', 'Orders handled')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('经手营业额', 'Revenue handled')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('应得提成', 'Commission earned')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.staffStats.map((x) => (
                  <tr key={x.staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-700">{x.staff.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{x.staff.commissionRate}%</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t(`${x.orderCount} 单`, `${x.orderCount} orders`)}</td>
                    <td className="px-4 py-3 text-right font-medium text-sky-600">{formatMoney(x.revenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">{formatMoney(x.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('最近订单', 'Recent orders')}</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无订单记录', 'No orders yet')}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentOrders.map((o) => {
              const compNames = o.items.map((i) => companions.find((c) => c.id === i.companionId)?.name).filter(Boolean).join('、');
              return (
                <div key={o.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-700">{o.customerName}</span>
                      {o.staffName && (
                        <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{o.staffName}</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {compNames} · {t(`${o.items.length}项`, `${o.items.length} items`)}{o.gifts.length > 0 ? ` · ${t(`礼物${o.gifts.length}件`, `${o.gifts.length} gifts`)}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-sky-600 ml-4 shrink-0">{formatMoney(o.totalAmount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
