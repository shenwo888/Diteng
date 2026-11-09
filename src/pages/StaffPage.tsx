import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Headphones, TrendingUp, Coins } from 'lucide-react';
import { useStore } from '@/store';
import { filterByTimeRange, type TimeRange } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function StaffPage() {
  const { staff, orders, addStaff, updateStaff, deleteStaff, isAdmin, formatMoney } = useStore();
  const { t } = useI18n();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [form, setForm] = useState({ name: '', commissionRate: 10 });
  const [editForm, setEditForm] = useState({ id: '', name: '', commissionRate: 10 });

  const rangeLabels: Record<TimeRange, string> = {
    today: t('今天', 'Today'),
    week: t('本周', 'This week'),
    month: t('本月', 'This month'),
    year: t('今年', 'This year'),
    all: t('全部', 'All'),
  };

  const filteredOrders = useMemo(() => filterByTimeRange(orders, timeRange), [orders, timeRange]);

  const staffStats = useMemo(() => {
    return staff.map((s) => {
      const sOrders = filteredOrders.filter((o) => o.staffId === s.id);
      const orderCount = sOrders.length;
      const revenue = sOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const commission = revenue * (s.commissionRate / 100);
      return { staff: s, orderCount, revenue, commission };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [staff, filteredOrders]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCommission = staffStats.reduce((s, x) => s + x.commission, 0);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addStaff(form.name.trim(), form.commissionRate || 0);
    setForm({ name: '', commissionRate: 10 });
    setShowAdd(false);
  };

  const handleEdit = () => {
    if (!editForm.name.trim()) return;
    updateStaff(editForm.id, editForm.name.trim(), editForm.commissionRate || 0);
    setShowEdit(false);
  };

  const rangeButtons: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('客服业绩', 'Staff performance')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('客服管理与提成分润统计', 'Manage staff and track commission earnings')}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-500/25"
        >
          <Plus size={18} /> {t('添加客服', 'Add staff')}
        </button>
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t('经手总营业额', 'Total revenue handled')}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(totalRevenue)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-600"><TrendingUp size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t('总提成金额', 'Total commission')}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(totalCommission)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><Coins size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t('客服总数', 'Total staff')}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{staff.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600"><Headphones size={22} /></div>
          </div>
        </div>
      </div>

      {/* Staff stats table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('客服分润统计', 'Staff commission summary')}</h2>
        </div>
        {staffStats.length === 0 ? (
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
                  <th className="px-4 py-3 text-center font-semibold">{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffStats.map((x) => (
                  <tr key={x.staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                          {x.staff.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700">{x.staff.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{x.staff.commissionRate}%</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t(`${x.orderCount} 单`, `${x.orderCount} orders`)}</td>
                    <td className="px-4 py-3 text-right font-medium text-sky-600">{formatMoney(x.revenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">{formatMoney(x.commission)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => { setEditForm({ id: x.staff.id, name: x.staff.name, commissionRate: x.staff.commissionRate }); setShowEdit(true); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(x.staff.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-300" title={t('需管理员权限', 'Admin access required')}>{t('需管理员权限', 'Admin access required')}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('添加客服', 'Add staff')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('客服姓名 *', 'Staff name *')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('输入客服姓名', 'Enter staff name')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('提成比例 (%)', 'Commission rate (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-slate-400 mt-1">{t('例如输入 10 表示 10% 提成', 'For example, enter 10 for a 10% commission')}</p>
          </div>
          <button onClick={handleAdd} className="w-full py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors">
            {t('添加', 'Add')}
          </button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('编辑客服', 'Edit staff')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('客服姓名 *', 'Staff name *')}</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('提成比例 (%)', 'Commission rate (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={editForm.commissionRate}
              onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button onClick={handleEdit} className="w-full py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors">
            {t('保存', 'Save')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteStaff(confirmDelete)}
        title={t('删除客服', 'Delete staff')}
        message={t('确定删除该客服吗？历史订单记录不受影响。此操作不可撤销。', 'Delete this staff member? Past orders are kept. This cannot be undone.')}
        confirmText={t('删除', 'Delete')}
        danger
      />
    </div>
  );
}
