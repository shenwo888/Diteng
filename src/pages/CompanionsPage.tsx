import { useState } from 'react';
import { Plus, Pencil, Trash2, Gamepad2, Gift, Clock, TrendingUp, Percent } from 'lucide-react';
import { useStore } from '@/store';
import { useI18n } from '@/lib/i18n';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function CompanionsPage() {
  const { companions, orders, addCompanion, updateCompanion, deleteCompanion, isAdmin, formatMoney } = useStore();
  const { t } = useI18n();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: '', serviceRate: 70, giftRate: 80 });
  const [editForm, setEditForm] = useState({ id: '', name: '', serviceRate: 70, giftRate: 80 });

  const handleAdd = () => {
    if (!addForm.name.trim()) return;
    addCompanion(addForm.name.trim(), addForm.serviceRate || 0, addForm.giftRate || 0);
    setAddForm({ name: '', serviceRate: 70, giftRate: 80 });
    setShowAdd(false);
  };

  const handleEdit = () => {
    if (!editForm.name.trim()) return;
    updateCompanion(editForm.id, editForm.name.trim(), editForm.serviceRate || 0, editForm.giftRate || 0);
    setShowEdit(false);
  };

  const getStats = (companionId: string) => {
    const compOrders = orders.filter((o) => o.items.some((i) => i.companionId === companionId));
    const orderCount = compOrders.length;
    const hours = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === companionId).reduce((is, i) => is + i.hours, 0), 0);
    const revenue = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === companionId).reduce((is, i) => is + i.amount, 0), 0);
    const giftValue = orders.reduce((s, o) => s + o.gifts.filter((g) => g.companionId === companionId).reduce((gs, g) => gs + g.value, 0), 0);
    return { orderCount, hours, revenue, giftValue };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('陪玩管理', 'Companions')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('管理陪玩人员、分成比例与查看个人业绩', 'Manage companions, commission rates and individual performance')}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/25"
        >
          <Plus size={18} /> {t('添加陪玩', 'Add companion')}
        </button>
      </div>

      {companions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <Gamepad2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">{t('还没有陪玩人员，点击「添加陪玩」开始', 'No companions yet. Click "Add companion" to start.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companions.map((c) => {
            const s = getStats(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{c.name}</h3>
                      <p className="text-xs text-slate-400">{t('加入于', 'Joined')} {new Date(c.createdAt).toLocaleDateString(t('zh-CN', 'en-US'))}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => { setEditForm({ id: c.id, name: c.name, serviceRate: c.serviceRate, giftRate: c.giftRate }); setShowEdit(true); }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-300 self-center" title={t('需管理员权限', 'Admin access required')}>{t('需管理员权限', 'Admin access required')}</span>
                    )}
                  </div>
                </div>

                {/* Commission rates */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 flex items-center gap-1.5 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                    <Percent size={12} className="text-indigo-500" />
                    <span className="text-xs text-indigo-500">{t('服务', 'Service')}</span>
                    <span className="text-sm font-bold text-indigo-700 ml-auto">{c.serviceRate}%</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 bg-rose-50 rounded-lg px-2.5 py-1.5">
                    <Gift size={12} className="text-rose-400" />
                    <span className="text-xs text-rose-400">{t('礼物', 'Gifts')}</span>
                    <span className="text-sm font-bold text-rose-600 ml-auto">{c.giftRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-sky-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 text-xs text-sky-500"><Gamepad2 size={12} /> {t('接单', 'Orders')}</div>
                    <p className="font-bold text-slate-700 mt-0.5">{t(`${s.orderCount} 单`, `${s.orderCount} orders`)}</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 text-xs text-violet-500"><Clock size={12} /> {t('工时', 'Hours')}</div>
                    <p className="font-bold text-slate-700 mt-0.5">{s.hours.toFixed(1)} h</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 text-xs text-emerald-500"><TrendingUp size={12} /> {t('业绩', 'Revenue')}</div>
                    <p className="font-bold text-slate-700 mt-0.5">{formatMoney(s.revenue)}</p>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 text-xs text-rose-500"><Gift size={12} /> {t('礼物', 'Gifts')}</div>
                    <p className="font-bold text-slate-700 mt-0.5">{formatMoney(s.giftValue)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('添加陪玩', 'Add companion')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('陪玩姓名 *', 'Companion name *')}</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder={t('输入陪玩姓名', 'Enter companion name')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('订单服务费分润比例 (%)', 'Service fee share (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={addForm.serviceRate}
              onChange={(e) => setAddForm({ ...addForm, serviceRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <p className="text-xs text-slate-400 mt-1">{t('默认 70%，即陪玩拿服务费收入的 70%', 'Default 70%, meaning the companion keeps 70% of service fee income')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('礼物分成比例 (%)', 'Gift share (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={addForm.giftRate}
              onChange={(e) => setAddForm({ ...addForm, giftRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <p className="text-xs text-slate-400 mt-1">{t('默认 80%，即陪玩拿礼物收入的 80%', 'Default 80%, meaning the companion keeps 80% of gift income')}</p>
          </div>
          <button onClick={handleAdd} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">
            {t('添加', 'Add')}
          </button>
        </div>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('编辑陪玩', 'Edit companion')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('陪玩姓名 *', 'Companion name *')}</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('订单服务费分润比例 (%)', 'Service fee share (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={editForm.serviceRate}
              onChange={(e) => setEditForm({ ...editForm, serviceRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('礼物分成比例 (%)', 'Gift share (%)')}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={editForm.giftRate}
              onChange={(e) => setEditForm({ ...editForm, giftRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button onClick={handleEdit} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">
            {t('保存', 'Save')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteCompanion(confirmDelete)}
        title={t('删除陪玩', 'Delete companion')}
        message={t('确定删除该陪玩吗？历史订单记录不受影响，但将无法按此人筛选。此操作不可撤销。', 'Delete this companion? Past orders are kept, but you won\'t be able to filter by this person. This cannot be undone.')}
        confirmText={t('删除', 'Delete')}
        danger
      />
    </div>
  );
}
