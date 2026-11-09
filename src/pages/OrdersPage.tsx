import { useState, useMemo } from 'react';
import { Search, Trash2, Gift, Clock, Receipt, Headphones, Wallet, CreditCard, Tag, Download } from 'lucide-react';
import { useStore } from '@/store';
import { formatDateTime, filterByTimeRange, TIME_RANGE_LABELS, type TimeRange } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { useI18n } from '@/lib/i18n';
import ConfirmDialog from '@/components/ConfirmDialog';

const TIME_RANGE_LABELS_EN: Record<TimeRange, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All',
};

export default function OrdersPage() {
  const { orders, companions, serviceTags, deleteOrder, isAdmin, formatMoney } = useStore();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const timeFiltered = useMemo(() => filterByTimeRange(orders, timeRange), [orders, timeRange]);

  const filtered = timeFiltered.filter((o) => {
    const q = search.toLowerCase();
    return o.customerName.toLowerCase().includes(q) ||
      o.staffName?.toLowerCase().includes(q) ||
      o.items.some((i) => companions.find((c) => c.id === i.companionId)?.name.toLowerCase().includes(q));
  });

  const rangeButtons: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];

  const exportOrders = () => {
    const header = ['订单时间', '顾客', '客服', '付款方式', '项目小计', '优惠码', '优惠金额', '应付总额', '陪玩项目', '礼物', '备注'];
    const rows = filtered.map((o) => [
      formatDateTime(o.createdAt),
      o.customerName,
      o.staffName || '',
      o.paymentMethod,
      o.subtotal.toFixed(2),
      o.couponCode || '',
      o.discountAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.items.map((i) => `${companions.find((c) => c.id === i.companionId)?.name || '未知'}-${i.serviceName}-${i.hours}h`).join('; '),
      o.gifts.map((g) => `${g.name}(${g.value.toFixed(2)})`).join('; '),
      o.note,
    ]);
    downloadCSV(`订单流水_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('订单流水', 'Order History')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('所有历史订单记录', 'All past orders')}</p>
        </div>
        {isAdmin && filtered.length > 0 && (
          <button
            onClick={exportOrders}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0"
          >
            <Download size={16} /> {t('导出数据 (CSV)', 'Export CSV')}
          </button>
        )}
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
            {t(TIME_RANGE_LABELS[r], TIME_RANGE_LABELS_EN[r])}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('搜索顾客、陪玩或客服...', 'Search customer, companion, or staff...')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">{orders.length === 0 ? t('还没有订单，去「记单/记账」创建第一笔', 'No orders yet, create the first one in New Order') : t('没有找到匹配的订单', 'No matching orders found')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isExpanded = expanded === o.id;
            const compNames = o.items.map((i) => companions.find((c) => c.id === i.companionId)?.name).filter(Boolean);
            const isPrepay = o.paymentMethod === '预存扣款';
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : o.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{o.customerName}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {compNames.slice(0, 3).map((n, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-sky-50 text-sky-600 rounded-full">{n}</span>
                        ))}
                        {compNames.length > 3 && <span className="text-xs text-slate-400">+{compNames.length - 3}</span>}
                        {o.staffName && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center gap-1">
                            <Headphones size={10} /> {o.staffName}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isPrepay ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {isPrepay ? <Wallet size={10} /> : <CreditCard size={10} />} {o.paymentMethod}
                        </span>
                        <span className="text-xs text-slate-400">{o.items.length}项 · {o.items.reduce((s, i) => s + i.hours, 0)}h</span>
                        {o.gifts.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full flex items-center gap-1">
                            <Gift size={10} /> {o.gifts.length}件
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg text-sky-600">{formatMoney(o.totalAmount)}</p>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(o.id); }}
                          className="text-xs text-slate-400 hover:text-rose-500 mt-1 inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} /> 删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                    {o.items.map((i) => {
                      const comp = companions.find((c) => c.id === i.companionId);
                      const itemTags = (i.tagIds || []).map((tid) => serviceTags.find((t) => t.id === tid)).filter(Boolean);
                      return (
                        <div key={i.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200">{i.serviceName}</span>
                            <span className="text-slate-700">{comp?.name || '未知'}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-0.5"><Clock size={10} /> {i.hours}h</span>
                            {itemTags.map((t) => (
                              <span key={t!.id} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full flex items-center gap-0.5">
                                <Tag size={8} /> {t!.name} +{t!.surcharge}
                              </span>
                            ))}
                          </div>
                          <span className="font-medium text-slate-700">{formatMoney(i.amount)}</span>
                        </div>
                      );
                    })}
                    {o.gifts.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-rose-400 mb-2 flex items-center gap-1"><Gift size={12} /> 礼物记录</p>
                        {o.gifts.map((g) => {
                          const comp = companions.find((c) => c.id === g.companionId);
                          return (
                            <div key={g.id} className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-600">{g.name} → {comp?.name || '未知'}</span>
                              <span className="font-medium text-rose-500">{formatMoney(g.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {o.note && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-500">备注：{o.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteOrder(confirmDelete)}
        title="删除订单"
        message={confirmDelete && orders.find((o) => o.id === confirmDelete)?.paymentMethod === '预存扣款'
          ? "删除预存扣款订单将自动退还顾客对应的消费金额。此操作不可撤销。"
          : "确定删除该订单吗？此操作不可撤销。"}
        confirmText="删除"
        danger
      />
    </div>
  );
}
