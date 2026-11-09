import { useState, useMemo } from 'react';
import { Plus, Wallet, Pencil, Trash2, History, Search, Phone, TrendingUp, Headphones, ShoppingBag, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useStore } from '@/store';
import { useI18n } from '@/lib/i18n';
import { formatDateTime, formatDaysAgo, getChurnStatus, CHURN_STYLES, type ChurnStatus } from '@/lib/format';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CustomerProfile {
  totalSpent: number;
  orderCount: number;
  preferredStaff: string | null;
  preferredService: string | null;
  lastOrderTime: number | null;
  churnStatus: ChurnStatus;
}

type FilterType = 'all' | 'review' | 'risk';

export default function CustomersPage() {
  const { customers, orders, transactions, addCustomer, updateCustomer, deleteCustomer, rechargeCustomer, isAdmin, formatMoney } = useStore();
  const { t } = useI18n();

  const churnLabel: Record<ChurnStatus, string> = {
    active: t('活跃', 'Active'),
    review: t('需回访', 'Needs follow-up'),
    risk: t('高危流失', 'High churn risk'),
  };

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const [form, setForm] = useState({ name: '', contact: '', initialBalance: 0 });
  const [editForm, setEditForm] = useState({ id: '', name: '', contact: '' });
  const [rechargeForm, setRechargeForm] = useState({ id: '', name: '', amount: 0, note: '充值' });
  const [historyCustomer, setHistoryCustomer] = useState<{ id: string; name: string } | null>(null);

  const profiles = useMemo(() => {
    const map: Record<string, CustomerProfile> = {};
    for (const c of customers) {
      const cOrders = orders.filter((o) => o.customerId === c.id);
      const totalSpent = cOrders.reduce((s, o) => s + o.totalAmount, 0);
      const orderCount = cOrders.length;

      const staffCounts: Record<string, number> = {};
      for (const o of cOrders) {
        if (o.staffName) staffCounts[o.staffName] = (staffCounts[o.staffName] || 0) + 1;
      }
      const preferredStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const svcCounts: Record<string, number> = {};
      for (const o of cOrders) {
        for (const item of o.items) {
          svcCounts[item.serviceName] = (svcCounts[item.serviceName] || 0) + 1;
        }
      }
      const preferredService = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const lastOrderTime = cOrders.length > 0 ? Math.max(...cOrders.map((o) => o.createdAt)) : null;
      const churnStatus = getChurnStatus(lastOrderTime);

      map[c.id] = { totalSpent, orderCount, preferredStaff, preferredService, lastOrderTime, churnStatus };
    }
    return map;
  }, [customers, orders]);

  const filtered = useMemo(() => {
    let result = customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()),
    );
    if (filter !== 'all') {
      result = result.filter((c) => profiles[c.id]?.churnStatus === filter);
    }
    return result;
  }, [customers, search, filter, profiles]);

  const counts = useMemo(() => {
    let review = 0, risk = 0;
    for (const c of customers) {
      const status = profiles[c.id]?.churnStatus;
      if (status === 'review') review++;
      if (status === 'risk') risk++;
    }
    return { all: customers.length, review, risk };
  }, [customers, profiles]);

  const filterButtons: { id: FilterType; label: string; count: number; icon: typeof Activity }[] = [
    { id: 'all', label: t('全部', 'All'), count: counts.all, icon: Activity },
    { id: 'review', label: t('需回访', 'Needs follow-up'), count: counts.review, icon: Clock },
    { id: 'risk', label: t('高危流失', 'High churn risk'), count: counts.risk, icon: AlertTriangle },
  ];

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addCustomer(form.name.trim(), form.contact.trim(), form.initialBalance || 0);
    setForm({ name: '', contact: '', initialBalance: 0 });
    setShowAdd(false);
  };

  const handleEdit = () => {
    if (!editForm.name.trim()) return;
    updateCustomer(editForm.id, editForm.name.trim(), editForm.contact.trim());
    setShowEdit(false);
  };

  const handleRecharge = () => {
    if (rechargeForm.amount <= 0) return;
    rechargeCustomer(rechargeForm.id, rechargeForm.amount, rechargeForm.note || '充值');
    setShowRecharge(false);
  };

  const customerTransactions = historyCustomer
    ? transactions.filter((tx) => tx.customerId === historyCustomer.id).slice(0, 20)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('顾客管理', 'Customers')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('管理顾客信息、消费画像与防流失预警', 'Manage customer details, spending profiles and churn alerts')}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/25"
        >
          <Plus size={18} /> {t('添加顾客', 'Add customer')}
        </button>
      </div>

      {/* Churn warning summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Activity size={14} /> {t('活跃顾客', 'Active customers')}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.all - counts.review - counts.risk}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600"><Activity size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Clock size={14} /> {t('需回访', 'Needs follow-up')}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{counts.review}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><Clock size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><AlertTriangle size={14} /> {t('高危流失', 'High churn risk')}</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{counts.risk}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600"><AlertTriangle size={22} /></div>
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterButtons.map((btn) => {
          const Icon = btn.icon;
          const active = filter === btn.id;
          const colorClass = btn.id === 'review' ? 'bg-amber-500' : btn.id === 'risk' ? 'bg-rose-500' : 'bg-sky-500';
          return (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                active ? `${colorClass} text-white shadow-sm` : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {btn.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-slate-100 text-slate-400'}`}>{btn.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('搜索顾客姓名或联系方式...', 'Search by customer name or contact...')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">{customers.length === 0 ? t('还没有顾客，点击「添加顾客」开始', 'No customers yet. Click "Add customer" to start') : t('没有找到匹配的顾客', 'No matching customers found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const p = profiles[c.id];
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                    {c.contact && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Phone size={12} /> {c.contact}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${CHURN_STYLES[p.churnStatus]}`}>
                    {churnLabel[p.churnStatus]}
                  </span>
                </div>

                {/* Churn status detail */}
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                  {p.lastOrderTime ? (
                    <span>{t('最后下单：', 'Last order: ')}{formatDaysAgo(p.lastOrderTime)}</span>
                  ) : (
                    <span>{t('暂无下单记录', 'No orders yet')}</span>
                  )}
                  {p.lastOrderTime && (
                    <span className="text-slate-300">·</span>
                  )}
                  {p.lastOrderTime && p.churnStatus === 'review' && (
                    <span className="text-amber-500">{t('建议主动关怀', 'Suggested: reach out proactively')}</span>
                  )}
                  {p.lastOrderTime && p.churnStatus === 'risk' && (
                    <span className="text-rose-500">{t('建议二次激活', 'Suggested: reactivation offer')}</span>
                  )}
                </div>

                {/* Consumption profile */}
                {p.orderCount > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><TrendingUp size={12} /> {t('累计消费', 'Total spent')}</span>
                      <span className="font-semibold text-slate-700">{formatMoney(p.totalSpent)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><ShoppingBag size={12} /> {t('下单次数', 'Orders')}</span>
                      <span className="font-semibold text-slate-700">{p.orderCount}{t(' 次', '')}</span>
                    </div>
                    {p.preferredStaff && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1"><Headphones size={12} /> {t('偏好客服', 'Preferred staff')}</span>
                        <span className="font-medium text-slate-600">{p.preferredStaff}</span>
                      </div>
                    )}
                    {p.preferredService && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1"><ShoppingBag size={12} /> {t('偏好项目', 'Preferred service')}</span>
                        <span className="font-medium text-slate-600">{p.preferredService}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance */}
                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-slate-400">{t('当前余额', 'Balance')}</p>
                  <p className={`text-xl font-bold ${c.balance > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{formatMoney(c.balance)}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setRechargeForm({ id: c.id, name: c.name, amount: 0, note: '充值' }); setShowRecharge(true); }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Wallet size={14} /> {t('充值', 'Top up')}
                  </button>
                  <button
                    onClick={() => { setHistoryCustomer({ id: c.id, name: c.name }); setShowHistory(true); }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-sky-50 text-sky-600 text-xs font-medium rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    <History size={14} /> {t('流水', 'History')}
                  </button>
                  {isAdmin ? (
                    <>
                      <button
                        onClick={() => { setEditForm({ id: c.id, name: c.name, contact: c.contact }); setShowEdit(true); }}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-300 px-2" title={t('需管理员权限', 'Admin permission required')}>{t('需管理员', 'Admin only')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('添加顾客', 'Add customer')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('顾客姓名 *', 'Customer name *')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('输入顾客姓名', 'Enter customer name')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('联系方式', 'Contact')}</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder={t('手机号 / 微信 / QQ', 'Phone / WeChat / QQ')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('预存金额', 'Prepaid amount')}</label>
            <input
              type="number"
              min={0}
              value={form.initialBalance || ''}
              onChange={(e) => setForm({ ...form, initialBalance: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button onClick={handleAdd} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">
            {t('添加', 'Add')}
          </button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('编辑顾客', 'Edit customer')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('顾客姓名 *', 'Customer name *')}</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('联系方式', 'Contact')}</label>
            <input
              type="text"
              value={editForm.contact}
              onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button onClick={handleEdit} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">
            {t('保存', 'Save')}
          </button>
        </div>
      </Modal>

      {/* Recharge modal */}
      <Modal open={showRecharge} onClose={() => setShowRecharge(false)} title={t(`充值 · ${rechargeForm.name}`, `Top up · ${rechargeForm.name}`)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('充值金额 *', 'Top-up amount *')}</label>
            <input
              type="number"
              min={0}
              value={rechargeForm.amount || ''}
              onChange={(e) => setRechargeForm({ ...rechargeForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder={t('输入充值金额', 'Enter top-up amount')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('备注', 'Note')}</label>
            <input
              type="text"
              value={rechargeForm.note}
              onChange={(e) => setRechargeForm({ ...rechargeForm, note: e.target.value })}
              placeholder={t('充值', 'Top up')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button onClick={handleRecharge} className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
            {t('确认充值', 'Confirm top-up')}
          </button>
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title={t(`流水记录 · ${historyCustomer?.name}`, `Transaction history · ${historyCustomer?.name}`)}>
        {customerTransactions.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">{t('暂无流水记录', 'No transactions yet')}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {customerTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      tx.type === '充值' ? 'bg-emerald-100 text-emerald-600' :
                      tx.type === '消费' ? 'bg-rose-100 text-rose-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>{tx.type}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(tx.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tx.note}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${tx.type === '充值' || tx.type === '退款' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {tx.type === '消费' ? '-' : '+'}{formatMoney(tx.amount)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{t('余额 ', 'Balance ')}{formatMoney(tx.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteCustomer(confirmDelete)}
        title={t('删除顾客', 'Delete customer')}
        message={t(
          '确定删除该顾客吗？相关的订单记录将保留，但余额数据将被清除。此操作不可撤销。',
          'Delete this customer? Related order records will be kept, but the balance data will be cleared. This action cannot be undone.',
        )}
        confirmText={t('删除', 'Delete')}
        danger
      />
    </div>
  );
}
