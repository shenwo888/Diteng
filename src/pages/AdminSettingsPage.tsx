import { useState } from 'react';
import { Settings, Plus, Pencil, Trash2, Tag, ShoppingBag, Gift, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle, Ticket } from 'lucide-react';
import { useStore } from '@/store';
import type { CouponKind } from '@/types';
import { CURRENCY_OPTIONS } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AdminSettingsPage() {
  const {
    services, serviceTags, giftItems, isAdmin, formatMoney, currency, setCurrency, coupons, addCoupon, deleteCoupon,
    unlockAdmin, lockAdmin, changeAdminPassword,
    addService, updateService, deleteService,
    addServiceTag, updateServiceTag, deleteServiceTag,
    addGiftItem, updateGiftItem, deleteGiftItem,
  } = useStore();
  const { t } = useI18n();

  const [passwordInput, setPasswordInput] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const [showAddSvc, setShowAddSvc] = useState(false);
  const [showEditSvc, setShowEditSvc] = useState(false);
  const [svcForm, setSvcForm] = useState({ id: '', name: '', pricePerHour: 0, pricePerHalfHour: 0 });

  const [showAddTag, setShowAddTag] = useState(false);
  const [showEditTag, setShowEditTag] = useState(false);
  const [tagForm, setTagForm] = useState({ id: '', name: '', surcharge: 0 });

  const [confirmDeleteSvc, setConfirmDeleteSvc] = useState<string | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);
  const [confirmDeleteGift, setConfirmDeleteGift] = useState<string | null>(null);

  const [showAddGift, setShowAddGift] = useState(false);
  const [showEditGift, setShowEditGift] = useState(false);
  const [giftForm, setGiftForm] = useState({ id: '', name: '', defaultValue: 0 });

  const [showCouponAdd, setShowCouponAdd] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', kind: 'percent' as CouponKind, value: 0, kolName: '' });
  const [couponError, setCouponError] = useState('');
  const [confirmDeleteCoupon, setConfirmDeleteCoupon] = useState<string | null>(null);

  const [showPwdChange, setShowPwdChange] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: '', new: '' });
  const [pwdChangeResult, setPwdChangeResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleUnlock = () => {
    if (unlockAdmin(passwordInput)) {
      setPasswordInput('');
      setPwdError(false);
    } else {
      setPwdError(true);
    }
  };

  const handleAddSvc = () => {
    if (!svcForm.name.trim()) return;
    addService(svcForm.name.trim(), svcForm.pricePerHour || 0, svcForm.pricePerHalfHour || 0);
    setSvcForm({ id: '', name: '', pricePerHour: 0, pricePerHalfHour: 0 });
    setShowAddSvc(false);
  };

  const handleEditSvc = () => {
    if (!svcForm.name.trim()) return;
    updateService(svcForm.id, svcForm.name.trim(), svcForm.pricePerHour || 0, svcForm.pricePerHalfHour || 0);
    setShowEditSvc(false);
  };

  const handleAddTag = () => {
    if (!tagForm.name.trim()) return;
    addServiceTag(tagForm.name.trim(), tagForm.surcharge || 0);
    setTagForm({ id: '', name: '', surcharge: 0 });
    setShowAddTag(false);
  };

  const handleEditTag = () => {
    if (!tagForm.name.trim()) return;
    updateServiceTag(tagForm.id, tagForm.name.trim(), tagForm.surcharge || 0);
    setShowEditTag(false);
  };

  const handlePwdChange = () => {
    const ok = changeAdminPassword(pwdForm.old, pwdForm.new);
    if (ok) {
      setPwdChangeResult({ ok: true, msg: t('密码修改成功', 'Password changed successfully') });
      setPwdForm({ old: '', new: '' });
      setTimeout(() => { setPwdChangeResult(null); setShowPwdChange(false); }, 2000);
    } else {
      setPwdChangeResult({ ok: false, msg: t('旧密码错误或新密码太短（至少4位）', 'Old password is wrong or new password is too short (min. 4 characters)') });
    }
  };

  const handleAddCoupon = () => {
    const result = addCoupon(couponForm.code, couponForm.kind, couponForm.value || 0, couponForm.kolName);
    if (!result.success) {
      setCouponError(result.error ?? t('添加失败', 'Failed to add'));
      return;
    }
    setShowCouponAdd(false);
  };

  const handleAddGift = () => {
    if (!giftForm.name.trim()) return;
    addGiftItem(giftForm.name.trim(), giftForm.defaultValue || 0);
    setGiftForm({ id: '', name: '', defaultValue: 0 });
    setShowAddGift(false);
  };

  const handleEditGift = () => {
    if (!giftForm.name.trim()) return;
    updateGiftItem(giftForm.id, giftForm.name.trim(), giftForm.defaultValue || 0);
    setShowEditGift(false);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400';
  const labelClass = 'block text-sm font-medium text-slate-600 mb-1';

  // ---- Locked view ----
  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('管理者设置', 'Admin settings')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('输入管理员密码以进入设置页面', 'Enter the admin password to open settings')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <Lock size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{t('需要管理员权限', 'Admin access required')}</p>
              <p className="text-xs text-slate-400">{t('普通客服仅可新增订单', 'Regular staff can only create orders')}</p>
            </div>
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPwdError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder={t('输入管理员密码', 'Enter admin password')}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${pwdError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
          />
          {pwdError && <p className="text-xs text-rose-500 mt-2">{t('密码错误，请重试', 'Wrong password, please try again')}</p>}
          <button
            onClick={handleUnlock}
            className="w-full mt-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {t('解锁', 'Unlock')}
          </button>
          <p className="text-xs text-slate-400 mt-3 text-center">{t('默认初始密码：888888', 'Default initial password: 888888')}</p>
        </div>
      </div>
    );
  }

  // ---- Unlocked view ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings size={24} className="text-slate-600" /> {t('管理者设置', 'Admin settings')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t('配置服务项目、附加标签与系统参数', 'Configure services, add-on tags and system options')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPwdChange(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <KeyRound size={16} /> {t('修改密码', 'Change password')}
          </button>
          <button
            onClick={lockAdmin}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
          >
            <Unlock size={16} /> {t('退出管理', 'Exit admin')}
          </button>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('货币设置', 'Currency')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('全系统金额统一使用所选货币符号显示', 'All amounts across the system use the selected currency symbol')}</p>
        </div>
        <div className="px-6 py-4 flex flex-wrap items-center gap-2">
          {CURRENCY_OPTIONS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setCurrency(symbol)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currency === symbol ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Ticket size={18} className="text-emerald-500" /> {t('优惠码管理', 'Coupon codes')}</h2>
          <button
            onClick={() => { setCouponForm({ code: '', kind: 'percent', value: 0, kolName: '' }); setCouponError(''); setShowCouponAdd(true); }}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus size={16} /> {t('添加优惠码', 'Add coupon')}
          </button>
        </div>
        {coupons.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无优惠码', 'No coupon codes yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('优惠码', 'Code')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('优惠方式', 'Discount')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('归属 KOL', 'KOL')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono font-medium text-slate-700">{c.code}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {c.kind === 'percent' ? t(`${c.value}% 折扣`, `${c.value}% off`) : t(`减 ${formatMoney(c.value)}`, `Minus ${formatMoney(c.value)}`)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.kolName || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setConfirmDeleteCoupon(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><ShoppingBag size={18} className="text-sky-500" /> {t('服务项目管理', 'Service items')}</h2>
          <button onClick={() => { setSvcForm({ id: '', name: '', pricePerHour: 0, pricePerHalfHour: 0 }); setShowAddSvc(true); }} className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium">
            <Plus size={16} /> {t('添加项目', 'Add item')}
          </button>
        </div>
        {services.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无服务项目', 'No service items yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('项目名称', 'Item name')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('1小时单价', 'Price per hour')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('半小时单价', 'Price per half hour')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{s.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(s.pricePerHour)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(s.pricePerHalfHour)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSvcForm({ id: s.id, name: s.name, pricePerHour: s.pricePerHour, pricePerHalfHour: s.pricePerHalfHour }); setShowEditSvc(true); }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSvc(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Tags */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Tag size={18} className="text-amber-500" /> {t('附加服务标签', 'Add-on tags')}</h2>
          <button onClick={() => { setTagForm({ id: '', name: '', surcharge: 0 }); setShowAddTag(true); }} className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium">
            <Plus size={16} /> {t('添加标签', 'Add tag')}
          </button>
        </div>
        {serviceTags.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无附加标签', 'No add-on tags yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('标签名称', 'Tag name')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('加价金额', 'Surcharge')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {serviceTags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        <Tag size={10} /> {tag.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">+ {formatMoney(tag.surcharge)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setTagForm({ id: tag.id, name: tag.name, surcharge: tag.surcharge }); setShowEditTag(true); }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTag(tag.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gift Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Gift size={18} className="text-rose-500" /> {t('礼物列表管理', 'Gift items')}</h2>
          <button onClick={() => { setGiftForm({ id: '', name: '', defaultValue: 0 }); setShowAddGift(true); }} className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium">
            <Plus size={16} /> {t('添加礼物', 'Add gift')}
          </button>
        </div>
        {giftItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('暂无礼物项目', 'No gift items yet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('礼物名称', 'Gift name')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('默认价值', 'Default value')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {giftItems.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium">
                        <Gift size={10} /> {g.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(g.defaultValue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setGiftForm({ id: g.id, name: g.name, defaultValue: g.defaultValue }); setShowEditGift(true); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGift(g.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Service Modals */}
      <Modal open={showAddSvc} onClose={() => setShowAddSvc(false)} title={t('添加服务项目', 'Add service item')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('项目名称 *', 'Item name *')}</label>
            <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
              placeholder={t('如：娱乐、技术、语音通话', 'e.g. Entertainment, Skill, Voice call')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('1小时单价', 'Price per hour')} ({currency})</label>
            <input type="number" min={0} step={1} value={svcForm.pricePerHour || ''} onChange={(e) => setSvcForm({ ...svcForm, pricePerHour: parseFloat(e.target.value) || 0 })}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('半小时单价', 'Price per half hour')} ({currency})</label>
            <input type="number" min={0} step={1} value={svcForm.pricePerHalfHour || ''} onChange={(e) => setSvcForm({ ...svcForm, pricePerHalfHour: parseFloat(e.target.value) || 0 })}
              className={inputClass} />
          </div>
          <button onClick={handleAddSvc} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">{t('添加', 'Add')}</button>
        </div>
      </Modal>

      <Modal open={showEditSvc} onClose={() => setShowEditSvc(false)} title={t('编辑服务项目', 'Edit service item')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('项目名称 *', 'Item name *')}</label>
            <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('1小时单价', 'Price per hour')} ({currency})</label>
            <input type="number" min={0} step={1} value={svcForm.pricePerHour || ''} onChange={(e) => setSvcForm({ ...svcForm, pricePerHour: parseFloat(e.target.value) || 0 })}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('半小时单价', 'Price per half hour')} ({currency})</label>
            <input type="number" min={0} step={1} value={svcForm.pricePerHalfHour || ''} onChange={(e) => setSvcForm({ ...svcForm, pricePerHalfHour: parseFloat(e.target.value) || 0 })}
              className={inputClass} />
          </div>
          <button onClick={handleEditSvc} className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">{t('保存', 'Save')}</button>
        </div>
      </Modal>

      {/* Add/Edit Tag Modals */}
      <Modal open={showAddTag} onClose={() => setShowAddTag(false)} title={t('添加附加标签', 'Add add-on tag')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('标签名称 *', 'Tag name *')}</label>
            <input type="text" value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              placeholder={t('如：优质、头牌、独家', 'e.g. Premium, Top pick, Exclusive')} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className={labelClass}>{t('加价金额', 'Surcharge')} ({currency})</label>
            <input type="number" min={0} step={1} value={tagForm.surcharge || ''} onChange={(e) => setTagForm({ ...tagForm, surcharge: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button onClick={handleAddTag} className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">{t('添加', 'Add')}</button>
        </div>
      </Modal>

      <Modal open={showEditTag} onClose={() => setShowEditTag(false)} title={t('编辑标签', 'Edit tag')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('标签名称 *', 'Tag name *')}</label>
            <input type="text" value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className={labelClass}>{t('加价金额', 'Surcharge')} ({currency})</label>
            <input type="number" min={0} step={1} value={tagForm.surcharge || ''} onChange={(e) => setTagForm({ ...tagForm, surcharge: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button onClick={handleEditTag} className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">{t('保存', 'Save')}</button>
        </div>
      </Modal>

      {/* Add/Edit Gift Modals */}
      <Modal open={showAddGift} onClose={() => setShowAddGift(false)} title={t('添加礼物', 'Add gift')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('礼物名称 *', 'Gift name *')}</label>
            <input type="text" value={giftForm.name} onChange={(e) => setGiftForm({ ...giftForm, name: e.target.value })}
              placeholder={t('如：告白气球、跑车、皇冠', 'e.g. Balloon, Sports car, Crown')} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
          <div>
            <label className={labelClass}>{t('默认价值', 'Default value')} ({currency})</label>
            <input type="number" min={0} step={1} value={giftForm.defaultValue || ''} onChange={(e) => setGiftForm({ ...giftForm, defaultValue: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
          <button onClick={handleAddGift} className="w-full py-2.5 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors">{t('添加', 'Add')}</button>
        </div>
      </Modal>

      <Modal open={showEditGift} onClose={() => setShowEditGift(false)} title={t('编辑礼物', 'Edit gift')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('礼物名称 *', 'Gift name *')}</label>
            <input type="text" value={giftForm.name} onChange={(e) => setGiftForm({ ...giftForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
          <div>
            <label className={labelClass}>{t('默认价值', 'Default value')} ({currency})</label>
            <input type="number" min={0} step={1} value={giftForm.defaultValue || ''} onChange={(e) => setGiftForm({ ...giftForm, defaultValue: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
          <button onClick={handleEditGift} className="w-full py-2.5 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors">{t('保存', 'Save')}</button>
        </div>
      </Modal>

      <Modal open={showCouponAdd} onClose={() => setShowCouponAdd(false)} title={t('添加优惠码', 'Add coupon')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('优惠码 *', 'Coupon code *')}</label>
            <input type="text" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
              placeholder={t('如：VIP10', 'e.g. VIP10')} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className={labelClass}>{t('优惠方式', 'Discount type')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCouponForm({ ...couponForm, kind: 'percent', value: 0 })}
                className={`py-2 rounded-lg text-sm font-medium ${couponForm.kind === 'percent' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('折扣率', 'Percentage off')}</button>
              <button type="button" onClick={() => setCouponForm({ ...couponForm, kind: 'fixed', value: 0 })}
                className={`py-2 rounded-lg text-sm font-medium ${couponForm.kind === 'fixed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('固定减免', 'Fixed amount off')}</button>
            </div>
          </div>
          <div>
            <label className={labelClass}>
              {couponForm.kind === 'percent' ? t('折扣率 (%)', 'Discount (%)') : `${t('减免金额', 'Amount off')} (${currency})`}
            </label>
            <input type="number" min={0} value={couponForm.value || ''} onChange={(e) => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className={labelClass}>{t('归属 KOL', 'KOL')}</label>
            <input type="text" value={couponForm.kolName} onChange={(e) => setCouponForm({ ...couponForm, kolName: e.target.value })}
              placeholder={t('KOL 名称（可选）', 'KOL name (optional)')} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          {couponError && <p className="text-xs text-rose-500">{couponError}</p>}
          <button onClick={handleAddCoupon} className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">{t('添加', 'Add')}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDeleteCoupon} onClose={() => setConfirmDeleteCoupon(null)}
        onConfirm={() => confirmDeleteCoupon && deleteCoupon(confirmDeleteCoupon)}
        title={t('删除优惠码', 'Delete coupon')} message={t('确定删除该优惠码吗？已产生的历史订单不受影响。', 'Delete this coupon? Past orders are not affected.')} confirmText={t('删除', 'Delete')} danger />

      {/* Password Change Modal */}
      <Modal open={showPwdChange} onClose={() => { setShowPwdChange(false); setPwdChangeResult(null); }} title={t('修改管理员密码', 'Change admin password')}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('旧密码', 'Old password')}</label>
            <input type="password" value={pwdForm.old} onChange={(e) => setPwdForm({ ...pwdForm, old: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className={labelClass}>{t('新密码（至少4位）', 'New password (min. 4 characters)')}</label>
            <input type="password" value={pwdForm.new} onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          {pwdChangeResult && (
            <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${pwdChangeResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {pwdChangeResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {pwdChangeResult.msg}
            </div>
          )}
          <button onClick={handlePwdChange} className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">{t('确认修改', 'Confirm change')}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDeleteSvc} onClose={() => setConfirmDeleteSvc(null)} onConfirm={() => confirmDeleteSvc && deleteService(confirmDeleteSvc)}
        title={t('删除服务项目', 'Delete service item')} message={t('确定删除该服务项目吗？此操作不可撤销。', 'Delete this service item? This cannot be undone.')} confirmText={t('删除', 'Delete')} danger />
      <ConfirmDialog open={!!confirmDeleteTag} onClose={() => setConfirmDeleteTag(null)} onConfirm={() => confirmDeleteTag && deleteServiceTag(confirmDeleteTag)}
        title={t('删除标签', 'Delete tag')} message={t('确定删除该附加标签吗？此操作不可撤销。', 'Delete this add-on tag? This cannot be undone.')} confirmText={t('删除', 'Delete')} danger />
      <ConfirmDialog open={!!confirmDeleteGift} onClose={() => setConfirmDeleteGift(null)} onConfirm={() => confirmDeleteGift && deleteGiftItem(confirmDeleteGift)}
        title={t('删除礼物', 'Delete gift')} message={t('确定删除该礼物吗？此操作不可撤销。', 'Delete this gift? This cannot be undone.')} confirmText={t('删除', 'Delete')} danger />
    </div>
  );
}
