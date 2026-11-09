import { useState, useMemo } from 'react';
import { Plus, Trash2, Gift, ShoppingBag, User, Users, CheckCircle2, AlertCircle, Headphones, CreditCard, Wallet, Search, Tag, ChevronDown } from 'lucide-react';
import { useStore, calcDiscount } from '@/store';
import { uid } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { PaymentMethod } from '@/types';

interface OrderItemDraft {
  key: string;
  companionId: string;
  serviceId: string;
  hours: number;
  tagIds: string[];
}

interface GiftDraft {
  key: string;
  name: string;
  value: number;
  companionId: string;
}

export default function NewOrderPage() {
  const { customers, companions, staff, services, serviceTags, giftItems, createOrder, addCompanion, computeItemPrice, formatMoney, coupons } = useStore();
  const { t } = useI18n();

  const [customerId, setCustomerId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('预存扣款');
  const [items, setItems] = useState<OrderItemDraft[]>([
    { key: uid(), companionId: '', serviceId: '', hours: 1, tagIds: [] },
  ]);
  const [hasGift, setHasGift] = useState(false);
  const [gifts, setGifts] = useState<GiftDraft[]>([
    { key: uid(), name: '', value: 0, companionId: '' },
  ]);
  const [note, setNote] = useState('');
  const [newCompanionName, setNewCompanionName] = useState('');
  const [showAddCompanion, setShowAddCompanion] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const itemAmounts = items.map((i) => i.serviceId ? computeItemPrice(i.serviceId, i.hours, i.tagIds) : 0);
  const itemsTotal = itemAmounts.reduce((s, a) => s + a, 0);
  const giftsTotal = hasGift ? gifts.reduce((s, g) => s + (g.value || 0), 0) : 0;
  const appliedCoupon = couponCode.trim() ? coupons.find((c) => c.code === couponCode.trim().toUpperCase()) ?? null : null;
  const discountAmount = appliedCoupon ? calcDiscount(itemsTotal, appliedCoupon) : 0;
  const totalAmount = itemsTotal - discountAmount + giftsTotal;
  const isPrepay = paymentMethod === '预存扣款';

  const addItem = () => setItems((p) => [...p, { key: uid(), companionId: '', serviceId: '', hours: 1, tagIds: [] }]);
  const removeItem = (key: string) => setItems((p) => p.filter((i) => i.key !== key));
  const updateItem = (key: string, field: keyof OrderItemDraft, value: any) =>
    setItems((p) => p.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  const toggleTag = (key: string, tagId: string) =>
    setItems((p) => p.map((i) => {
      if (i.key !== key) return i;
      const has = i.tagIds.includes(tagId);
      return { ...i, tagIds: has ? i.tagIds.filter((t) => t !== tagId) : [...i.tagIds, tagId] };
    }));

  const addGift = () => setGifts((p) => [...p, { key: uid(), name: '', value: 0, companionId: '' }]);
  const removeGift = (key: string) => setGifts((p) => p.filter((g) => g.key !== key));
  const updateGift = (key: string, field: keyof GiftDraft, value: any) =>
    setGifts((p) => p.map((g) => (g.key === key ? { ...g, [field]: value } : g)));

  const handleAddCompanion = () => {
    if (!newCompanionName.trim()) return;
    const c = addCompanion(newCompanionName.trim());
    setNewCompanionName('');
    setShowAddCompanion(false);
    setItems((p) => {
      const firstEmpty = p.findIndex((i) => !i.companionId);
      if (firstEmpty >= 0) return p.map((i, idx) => (idx === firstEmpty ? { ...i, companionId: c.id } : i));
      return p;
    });
  };

  const handleSubmit = () => {
    if (!customerId || !staffId) {
      setResult({ success: false, error: t('请选择处理客服与顾客', 'Please select a staff member and a customer') });
      return;
    }
    const validItems = items.filter((i) => i.companionId && i.serviceId && i.hours > 0);
    const validGifts = hasGift ? gifts.filter((g) => g.name && g.companionId && g.value > 0) : [];
    if (validItems.length === 0 && validGifts.length === 0) {
      setResult({ success: false, error: t('请至少添加一项陪玩服务项目或礼物', 'Please add at least one companion service or gift') });
      return;
    }

    const resolvedStaff = staff.find((x) => x.id === staffId);

    const res = createOrder(
      customerId,
      staffId,
      resolvedStaff?.name ?? '',
      paymentMethod,
      validItems.map((i) => {
        const svc = services.find((s) => s.id === i.serviceId);
        return {
          companionId: i.companionId,
          serviceName: svc?.name ?? '',
          hours: i.hours,
          amount: computeItemPrice(i.serviceId, i.hours, i.tagIds),
          tagIds: i.tagIds,
        };
      }),
      validGifts.map((g) => ({ name: g.name, value: g.value, companionId: g.companionId })),
      note,
      couponCode,
    );
    setResult(res);
    if (res.success) {
      setCustomerId('');
      setStaffId('');
      setCustomerSearch('');
      setItems([{ key: uid(), companionId: '', serviceId: '', hours: 1, tagIds: [] }]);
      setHasGift(false);
      setGifts([{ key: uid(), name: '', value: 0, companionId: '' }]);
      setNote('');
      setCouponCode('');
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('记单 / 记账', 'New order')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('选择顾客、客服、陪玩，自动计费并提交', 'Choose customer, staff and companion; pricing is calculated automatically')}</p>
      </div>

      {result && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {result.success ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
          <span className="text-sm font-medium">{result.success ? t('订单提交成功！', 'Order submitted!') : result.error}</span>
        </div>
      )}

      {/* Customer selection with search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <User size={16} className="text-sky-500" /> {t('选择顾客', 'Select customer')}
        </label>
        {customers.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">{t('请先在「顾客管理」中添加顾客', 'Add customers in Customer Management first')}</p>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerList(true);
                  if (customerId) setCustomerId('');
                }}
                onFocus={() => setShowCustomerList(true)}
                placeholder={t('搜索顾客姓名或联系方式...', 'Search by customer name or contact...')}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {showCustomerList && !customerId && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                {filteredCustomers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">{t('未找到匹配的顾客', 'No matching customers')}</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setShowCustomerList(false); }}
                      className="w-full px-4 py-2.5 text-left hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <span className="font-medium text-slate-700 text-sm">{c.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{t('余额', 'Balance')} {formatMoney(c.balance)}</span>
                      {c.contact && <span className="text-xs text-slate-400 ml-2">{c.contact}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedCustomer && isPrepay && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-slate-500">{t('当前余额：', 'Current balance:')}</span>
                <span className={`font-semibold ${selectedCustomer.balance >= totalAmount ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatMoney(selectedCustomer.balance)}
                </span>
                {totalAmount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCustomer.balance >= totalAmount ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {selectedCustomer.balance >= totalAmount ? t('余额充足', 'Sufficient') : t('余额不足', 'Insufficient')}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Staff selection - dropdown only */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <Headphones size={16} className="text-indigo-500" /> {t('处理客服', 'Staff')} <span className="text-rose-400 text-xs">{t('*必选', '*Required')}</span>
        </label>
        {staff.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">{t('请先在「客服业绩」中添加客服人员', 'Add staff in Staff Performance first')}</p>
        ) : (
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{t('-- 选择客服 --', '-- Select staff --')}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{t('（提成 ', ' (commission ')}{s.commissionRate}{t('%）', '%)')}</option>
            ))}
          </select>
        )}
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <CreditCard size={16} className="text-emerald-500" /> {t('支付方式', 'Payment method')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod('预存扣款')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${isPrepay ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <Wallet size={20} className={isPrepay ? 'text-emerald-600' : 'text-slate-400'} />
            <p className={`font-medium text-sm mt-2 ${isPrepay ? 'text-emerald-700' : 'text-slate-600'}`}>{t('预存扣款', 'Prepaid balance')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('从顾客余额中扣除', 'Deducted from customer balance')}</p>
          </button>
          <button
            onClick={() => setPaymentMethod('现金/即时转账')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${!isPrepay ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <CreditCard size={20} className={!isPrepay ? 'text-sky-600' : 'text-slate-400'} />
            <p className={`font-medium text-sm mt-2 ${!isPrepay ? 'text-sky-700' : 'text-slate-600'}`}>{t('现金/即时转账', 'Cash / instant transfer')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('当场付清，不扣余额', 'Paid on the spot, balance not deducted')}</p>
          </button>
        </div>
      </div>

      {/* Coupon */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <Tag size={16} className="text-amber-500" /> {t('优惠码（可选）', 'Coupon code (optional)')}
        </label>
        <input
          type="text"
          list="coupon-options"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder={t('输入或选择优惠码', 'Enter or choose a coupon code')}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <datalist id="coupon-options">
          {coupons.map((c) => (
            <option key={c.id} value={c.code}>{c.kolName ? `KOL: ${c.kolName}` : ''}</option>
          ))}
        </datalist>
        {appliedCoupon && (
          <p className="text-xs text-emerald-600 mt-2">
            {t('已优惠 ', 'Saved ')}{formatMoney(discountAmount)}{t('（', ' (')}{appliedCoupon.kind === 'percent' ? `${appliedCoupon.value}%` : formatMoney(appliedCoupon.value)}{t('）', ')')}
          </p>
        )}
      </div>

      {/* Order items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShoppingBag size={16} className="text-sky-500" /> {t('订单详情', 'Order details')}
          </label>
          <button onClick={addItem} className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium">
            <Plus size={16} /> {t('添加项目', 'Add item')}
          </button>
        </div>

        {showAddCompanion ? (
          <div className="mb-4 flex gap-2 items-center bg-sky-50 p-3 rounded-lg">
            <input
              type="text"
              value={newCompanionName}
              onChange={(e) => setNewCompanionName(e.target.value)}
              placeholder={t('输入陪玩姓名', 'Enter companion name')}
              className="flex-1 px-3 py-2 rounded-lg border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCompanion()}
            />
            <button onClick={handleAddCompanion} className="px-3 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600">{t('添加', 'Add')}</button>
            <button onClick={() => setShowAddCompanion(false)} className="px-3 py-2 text-slate-500 text-sm hover:text-slate-700">{t('取消', 'Cancel')}</button>
          </div>
        ) : (
          <button onClick={() => setShowAddCompanion(true)} className="mb-4 flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium">
            <Plus size={14} /> {t('快速添加陪玩', 'Quick add companion')}
          </button>
        )}

        <div className="space-y-3">
          {items.map((item, idx) => {
            const amount = itemAmounts[idx];
            return (
              <div key={item.key} className="bg-slate-50 p-3 rounded-lg space-y-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-4">
                    <select
                      value={item.companionId}
                      onChange={(e) => updateItem(item.key, 'companionId', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="">{t('选择陪玩', 'Select companion')}</option>
                      {companions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-7 sm:col-span-4">
                    <select
                      value={item.serviceId}
                      onChange={(e) => updateItem(item.key, 'serviceId', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="">{t('选择服务', 'Select service')}</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={item.hours || ''}
                      onChange={(e) => updateItem(item.key, 'hours', parseFloat(e.target.value) || 0)}
                      placeholder={t('时长', 'Hours')}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-2">
                    <span className="text-sm font-bold text-sky-600">{formatMoney(amount)}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.key)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Tag selection */}
                {item.serviceId && serviceTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {serviceTags.map((tag) => {
                      const active = item.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(item.key, tag.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            active ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          <Tag size={10} /> {tag.name} +{tag.surcharge}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
          {itemsTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{t('服务项目小计', 'Services subtotal')}</span>
              <span className="font-medium text-slate-600">{formatMoney(itemsTotal)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">{t('优惠折扣', 'Discount')}</span>
              <span className="font-medium text-emerald-600">- {formatMoney(discountAmount)}</span>
            </div>
          )}
          {hasGift && giftsTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-rose-400">{t('礼物小计', 'Gifts subtotal')}</span>
              <span className="font-medium text-rose-500">{formatMoney(giftsTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">{t('订单总金额', 'Order total')}</span>
            <span className="text-xl font-bold text-sky-600">{formatMoney(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Gift section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={hasGift}
            onChange={(e) => setHasGift(e.target.checked)}
            className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400"
          />
          <Gift size={16} className="text-rose-400" /> {t('顾客送了礼物', 'Customer gave a gift')}
        </label>

        {hasGift && (
          <div className="space-y-3">
            {gifts.map((gift) => (
              <div key={gift.key} className="grid grid-cols-12 gap-2 items-center bg-rose-50/50 p-3 rounded-lg">
                <div className="col-span-12 sm:col-span-4">
                  <select
                    value={gift.name}
                    onChange={(e) => {
                      const selected = giftItems.find((g) => g.name === e.target.value);
                      updateGift(gift.key, 'name', e.target.value);
                      if (selected) updateGift(gift.key, 'value', selected.defaultValue);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">{t('选择礼物', 'Select gift')}</option>
                    {giftItems.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}（{formatMoney(g.defaultValue)}）</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 sm:col-span-4">
                  <select
                    value={gift.companionId}
                    onChange={(e) => updateGift(gift.key, 'companionId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">{t('送给谁', 'Given to')}</option>
                    {companions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <input
                    type="number"
                    min={0}
                    value={gift.value || ''}
                    onChange={(e) => updateGift(gift.key, 'value', parseFloat(e.target.value) || 0)}
                    placeholder={t('价值', 'Value')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {gifts.length > 1 && (
                    <button onClick={() => removeGift(gift.key)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addGift} className="flex items-center gap-1 text-sm text-rose-500 hover:text-rose-600 font-medium">
              <Plus size={14} /> {t('添加礼物', 'Add gift')}
            </button>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <Users size={16} className="text-slate-400" /> {t('备注（可选）', 'Note (optional)')}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t('可填写订单备注信息...', 'Add order notes...')}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:from-sky-600 hover:to-sky-700 transition-all"
      >
        {t('提交订单', 'Submit order')} · {formatMoney(totalAmount)}
      </button>
    </div>
  );
}
