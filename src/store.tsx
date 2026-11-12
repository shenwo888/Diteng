import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  Customer, Companion, Staff, ServiceItem, ServiceTag, GiftItem, Coupon, CouponKind, Order, OrderItem,
  Transaction, GiftRecord, PaymentMethod, PayrollArchive, CurrencySymbol,
} from '@/types';
import { formatAmount, uid } from '@/lib/format';
import * as db from '@/lib/db';

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: 'svc-entertainment', name: '娱乐', pricePerHour: 20, pricePerHalfHour: 12 },
  { id: 'svc-tech', name: '技术', pricePerHour: 25, pricePerHalfHour: 15 },
  { id: 'svc-text', name: '文字', pricePerHour: 15, pricePerHalfHour: 8 },
  { id: 'svc-voice-msg', name: '语音条', pricePerHour: 18, pricePerHalfHour: 10 },
  { id: 'svc-voice-call', name: '语音通话', pricePerHour: 22, pricePerHalfHour: 13 },
  { id: 'svc-video', name: '视频通话', pricePerHour: 30, pricePerHalfHour: 18 },
  { id: 'svc-virtual', name: '虚拟恋人', pricePerHour: 28, pricePerHalfHour: 16 },
  { id: 'svc-sleep', name: '挂睡', pricePerHour: 10, pricePerHalfHour: 6 },
  { id: 'svc-coax', name: '哄睡', pricePerHour: 12, pricePerHalfHour: 7 },
  { id: 'svc-wake', name: '叫醒', pricePerHour: 8, pricePerHalfHour: 5 },
  { id: 'svc-treehole', name: '情绪树洞', pricePerHour: 15, pricePerHalfHour: 9 },
  { id: 'svc-punching', name: '受气包', pricePerHour: 15, pricePerHalfHour: 9 },
  { id: 'svc-avatar', name: '头像', pricePerHour: 10, pricePerHalfHour: 6 },
];

const DEFAULT_TAGS: ServiceTag[] = [
  { id: 'tag-premium', name: '优质', surcharge: 2 },
  { id: 'tag-top', name: '头牌', surcharge: 3 },
  { id: 'tag-exclusive', name: '独家', surcharge: 3 },
  { id: 'tag-sweet', name: '甜蜜单', surcharge: 4 },
  { id: 'tag-night', name: '夜单', surcharge: 4 },
];

const DEFAULT_GIFT_ITEMS: GiftItem[] = [
  { id: 'gift-balloon', name: '告白气球', defaultValue: 520 },
  { id: 'gift-sports-car', name: '跑车', defaultValue: 1314 },
  { id: 'gift-rocket', name: '火箭', defaultValue: 1000 },
  { id: 'gift-castle', name: '城堡', defaultValue: 3000 },
  { id: 'gift-crown', name: '皇冠', defaultValue: 1999 },
  { id: 'gift-ring', name: '钻戒', defaultValue: 999 },
  { id: 'gift-lollipop', name: '棒棒糖', defaultValue: 10 },
  { id: 'gift-rose', name: '玫瑰花', defaultValue: 99 },
];

type Result = { success: boolean; error?: string };

interface StoreContextType {
  ready: boolean;
  loadError: string | null;
  reload: () => void;
  syncError: string | null;
  dismissSyncError: () => void;

  customers: Customer[];
  companions: Companion[];
  staff: Staff[];
  services: ServiceItem[];
  serviceTags: ServiceTag[];
  giftItems: GiftItem[];
  coupons: Coupon[];
  orders: Order[];
  transactions: Transaction[];

  currency: CurrencySymbol;
  setCurrency: (symbol: CurrencySymbol) => void;
  formatMoney: (n: number) => string;

  isAdmin: boolean;
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin: () => void;
  changeAdminPassword: (oldPwd: string, newPwd: string) => Promise<boolean>;

  addCustomer: (name: string, contact: string, initialBalance?: number) => Customer;
  updateCustomer: (id: string, name: string, contact: string) => void;
  deleteCustomer: (id: string) => void;
  rechargeCustomer: (id: string, amount: number, note?: string) => void;

  addCompanion: (name: string, serviceRate?: number, giftRate?: number) => Companion;
  updateCompanion: (id: string, name: string, serviceRate: number, giftRate: number) => void;
  deleteCompanion: (id: string) => void;

  addStaff: (name: string, commissionRate: number) => Staff;
  updateStaff: (id: string, name: string, commissionRate: number) => void;
  deleteStaff: (id: string) => void;

  addService: (name: string, pricePerHour: number, pricePerHalfHour: number) => void;
  updateService: (id: string, name: string, pricePerHour: number, pricePerHalfHour: number) => void;
  deleteService: (id: string) => void;

  addServiceTag: (name: string, surcharge: number) => void;
  updateServiceTag: (id: string, name: string, surcharge: number) => void;
  deleteServiceTag: (id: string) => void;

  addGiftItem: (name: string, defaultValue: number) => void;
  updateGiftItem: (id: string, name: string, defaultValue: number) => void;
  deleteGiftItem: (id: string) => void;

  addCoupon: (code: string, kind: CouponKind, value: number, kolName: string) => Result;
  deleteCoupon: (id: string) => void;

  computeItemPrice: (serviceId: string, hours: number, tagIds: string[]) => number;

  createOrder: (
    customerId: string,
    staffId: string,
    staffName: string,
    paymentMethod: PaymentMethod,
    items: { companionId: string; serviceName: string; hours: number; amount: number; tagIds: string[] }[],
    gifts: { name: string; value: number; companionId: string }[],
    note: string,
    couponCode: string,
  ) => Result;

  deleteOrder: (id: string) => void;

  payrollArchives: PayrollArchive[];
  archivePayroll: (archive: PayrollArchive) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function calcPrice(hours: number, pricePerHour: number, pricePerHalfHour: number, tagSurcharge: number): number {
  if (hours <= 0) return 0;
  const wholeHours = Math.floor(hours);
  const hasHalf = hours - wholeHours >= 0.5;
  const base = wholeHours * pricePerHour + (hasHalf ? pricePerHalfHour : 0);
  return base + tagSurcharge;
}

export function calcDiscount(subtotal: number, coupon: Coupon): number {
  const raw = coupon.kind === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.round(Math.min(raw, subtotal) * 100) / 100;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceTags, setServiceTags] = useState<ServiceTag[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [payrollArchives, setPayrollArchives] = useState<PayrollArchive[]>([]);
  const [currency, setCurrencyState] = useState<CurrencySymbol>('RM');
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await db.loadAppData();
        if (!data.seeded) {
          await db.seedDefaults(DEFAULT_SERVICES, DEFAULT_TAGS, DEFAULT_GIFT_ITEMS);
          data.services = DEFAULT_SERVICES;
          data.serviceTags = DEFAULT_TAGS;
          data.giftItems = DEFAULT_GIFT_ITEMS;
        }
        if (cancelled) return;
        setCustomers(data.customers);
        setCompanions(data.companions);
        setStaff(data.staff);
        setServices(data.services);
        setServiceTags(data.serviceTags);
        setGiftItems(data.giftItems);
        setCoupons(data.coupons);
        setOrders(data.orders);
        setTransactions(data.transactions);
        setPayrollArchives(data.payrollArchives);
        if (data.currency) setCurrencyState(data.currency);
        setLoadError(null);
        setReady(true);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : '未知错误');
      }
    })();
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const persist = (op: Promise<void>) => {
    op.catch((e: Error) => setSyncError(`数据保存失败：${e.message}`));
  };

  const formatMoney = (n: number) => formatAmount(n, currency);

  const setCurrency = (symbol: CurrencySymbol) => {
    setCurrencyState(symbol);
    persist(db.saveCurrency(symbol));
  };

  const unlockAdmin = async (password: string): Promise<boolean> => {
    const ok = await db.verifyAdminPassword(password);
    if (ok) setIsAdmin(true);
    return ok;
  };

  const lockAdmin = () => setIsAdmin(false);

  const changeAdminPassword = (oldPwd: string, newPwd: string): Promise<boolean> => db.changeAdminPassword(oldPwd, newPwd);

  const addCustomer = (name: string, contact: string, initialBalance = 0): Customer => {
    const c: Customer = { id: uid(), name, contact, balance: initialBalance, createdAt: Date.now() };
    setCustomers((p) => [c, ...p]);
    persist(db.saveCustomer(c));
    if (initialBalance > 0) {
      const t: Transaction = {
        id: uid(), customerId: c.id, customerName: c.name,
        type: '充值', amount: initialBalance, balanceAfter: initialBalance,
        note: '开户预存', createdAt: Date.now(),
      };
      setTransactions((p) => [t, ...p]);
      persist(db.saveTransaction(t));
    }
    return c;
  };

  const updateCustomer = (id: string, name: string, contact: string) => {
    const existing = customers.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, name, contact };
    setCustomers((p) => p.map((c) => (c.id === id ? updated : c)));
    persist(db.saveCustomer(updated));
  };

  const deleteCustomer = (id: string) => {
    setCustomers((p) => p.filter((c) => c.id !== id));
    persist(db.deleteRow('customers', id));
  };

  const rechargeCustomer = (id: string, amount: number, note = '充值') => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return;
    const newBalance = cust.balance + amount;
    const updated = { ...cust, balance: newBalance };
    const t: Transaction = {
      id: uid(), customerId: id, customerName: cust.name,
      type: '充值', amount, balanceAfter: newBalance,
      note, createdAt: Date.now(),
    };
    setCustomers((p) => p.map((c) => (c.id === id ? updated : c)));
    setTransactions((p) => [t, ...p]);
    persist(db.saveCustomer(updated));
    persist(db.saveTransaction(t));
  };

  const addCompanion = (name: string, serviceRate = 70, giftRate = 80): Companion => {
    const c: Companion = { id: uid(), name, serviceRate, giftRate, createdAt: Date.now() };
    setCompanions((p) => [c, ...p]);
    persist(db.saveCompanion(c));
    return c;
  };

  const updateCompanion = (id: string, name: string, serviceRate: number, giftRate: number) => {
    const existing = companions.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, name, serviceRate, giftRate };
    setCompanions((p) => p.map((c) => (c.id === id ? updated : c)));
    persist(db.saveCompanion(updated));
  };

  const deleteCompanion = (id: string) => {
    setCompanions((p) => p.filter((c) => c.id !== id));
    persist(db.deleteRow('companions', id));
  };

  const addStaff = (name: string, commissionRate: number): Staff => {
    const s: Staff = { id: uid(), name, commissionRate, createdAt: Date.now() };
    setStaff((p) => [s, ...p]);
    persist(db.saveStaff(s));
    return s;
  };

  const updateStaff = (id: string, name: string, commissionRate: number) => {
    const existing = staff.find((s) => s.id === id);
    if (!existing) return;
    const updated = { ...existing, name, commissionRate };
    setStaff((p) => p.map((s) => (s.id === id ? updated : s)));
    persist(db.saveStaff(updated));
  };

  const deleteStaff = (id: string) => {
    setStaff((p) => p.filter((s) => s.id !== id));
    persist(db.deleteRow('staff', id));
  };

  const addService = (name: string, pricePerHour: number, pricePerHalfHour: number) => {
    const s: ServiceItem = { id: uid(), name, pricePerHour, pricePerHalfHour };
    setServices((p) => [...p, s]);
    persist(db.saveService(s, services.length));
  };

  const updateService = (id: string, name: string, pricePerHour: number, pricePerHalfHour: number) => {
    const index = services.findIndex((s) => s.id === id);
    if (index < 0) return;
    const updated = { ...services[index], name, pricePerHour, pricePerHalfHour };
    setServices((p) => p.map((s) => (s.id === id ? updated : s)));
    persist(db.saveService(updated, index));
  };

  const deleteService = (id: string) => {
    setServices((p) => p.filter((s) => s.id !== id));
    persist(db.deleteRow('services', id));
  };

  const addServiceTag = (name: string, surcharge: number) => {
    const t: ServiceTag = { id: uid(), name, surcharge };
    setServiceTags((p) => [...p, t]);
    persist(db.saveServiceTag(t, serviceTags.length));
  };

  const updateServiceTag = (id: string, name: string, surcharge: number) => {
    const index = serviceTags.findIndex((t) => t.id === id);
    if (index < 0) return;
    const updated = { ...serviceTags[index], name, surcharge };
    setServiceTags((p) => p.map((t) => (t.id === id ? updated : t)));
    persist(db.saveServiceTag(updated, index));
  };

  const deleteServiceTag = (id: string) => {
    setServiceTags((p) => p.filter((t) => t.id !== id));
    persist(db.deleteRow('service_tags', id));
  };

  const addGiftItem = (name: string, defaultValue: number) => {
    const g: GiftItem = { id: uid(), name, defaultValue };
    setGiftItems((p) => [...p, g]);
    persist(db.saveGiftItem(g, giftItems.length));
  };

  const updateGiftItem = (id: string, name: string, defaultValue: number) => {
    const index = giftItems.findIndex((g) => g.id === id);
    if (index < 0) return;
    const updated = { ...giftItems[index], name, defaultValue };
    setGiftItems((p) => p.map((g) => (g.id === id ? updated : g)));
    persist(db.saveGiftItem(updated, index));
  };

  const deleteGiftItem = (id: string) => {
    setGiftItems((p) => p.filter((g) => g.id !== id));
    persist(db.deleteRow('gift_items', id));
  };

  const addCoupon = (code: string, kind: CouponKind, value: number, kolName: string): Result => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { success: false, error: '请输入优惠码' };
    if (coupons.some((c) => c.code === normalized)) return { success: false, error: '该优惠码已存在' };
    if (kind === 'percent' && (value <= 0 || value > 100)) return { success: false, error: '折扣率需在 1-100 之间' };
    if (kind === 'fixed' && value <= 0) return { success: false, error: '减免金额需大于 0' };
    const c: Coupon = { id: uid(), code: normalized, kind, value, kolName: kolName.trim(), createdAt: Date.now() };
    setCoupons((p) => [c, ...p]);
    persist(db.saveCoupon(c));
    return { success: true };
  };

  const deleteCoupon = (id: string) => {
    setCoupons((p) => p.filter((c) => c.id !== id));
    persist(db.deleteRow('coupons', id));
  };

  const computeItemPrice = (serviceId: string, hours: number, tagIds: string[]): number => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc || hours <= 0) return 0;
    const wholeHours = Math.floor(hours);
    const hasHalf = hours - wholeHours >= 0.5;
    const base = wholeHours * svc.pricePerHour + (hasHalf ? svc.pricePerHalfHour : 0);
    const tagSurcharge = serviceTags.filter((t) => tagIds.includes(t.id)).reduce((s, t) => s + t.surcharge, 0);
    return base + tagSurcharge;
  };

  const createOrder: StoreContextType['createOrder'] = (customerId, staffId, staffName, paymentMethod, items, gifts, note, couponCode) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: '请选择顾客' };
    if (!staffId) return { success: false, error: '请选择处理客服与顾客' };
    if (items.length === 0 && gifts.length === 0) return { success: false, error: '请至少添加一项陪玩服务项目或礼物' };

    const trimmedCode = couponCode.trim();
    const coupon = trimmedCode ? coupons.find((c) => c.code === trimmedCode.toUpperCase()) ?? null : null;
    if (trimmedCode && !coupon) return { success: false, error: '优惠码无效' };

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const giftsTotal = gifts.reduce((sum, g) => sum + g.value, 0);
    const discountAmount = coupon ? calcDiscount(subtotal, coupon) : 0;
    const totalAmount = subtotal - discountAmount + giftsTotal;

    const isPrepay = paymentMethod === '预存扣款';
    if (isPrepay && customer.balance < totalAmount) {
      return { success: false, error: `余额不足，当前余额 ${formatMoney(customer.balance)}，需消费 ${formatMoney(totalAmount)}` };
    }

    const orderId = uid();
    const orderItems: OrderItem[] = items.map((i) => ({
      id: uid(), orderId,
      companionId: i.companionId,
      serviceName: i.serviceName,
      hours: i.hours, amount: i.amount,
      tagIds: i.tagIds,
    }));

    const orderGifts: GiftRecord[] = gifts.map((g) => ({
      id: uid(), name: g.name, value: g.value, companionId: g.companionId,
    }));

    const order: Order = {
      id: orderId, customerId, customerName: customer.name,
      staffId, staffName, paymentMethod,
      subtotal, couponCode: coupon?.code ?? '', discountAmount, totalAmount,
      note, createdAt: Date.now(),
      items: orderItems, gifts: orderGifts,
    };

    setOrders((p) => [order, ...p]);
    persist(db.saveOrder(order));

    if (isPrepay) {
      const newBalance = customer.balance - totalAmount;
      const updatedCustomer = { ...customer, balance: newBalance };
      setCustomers((p) => p.map((c) => (c.id === customerId ? updatedCustomer : c)));
      persist(db.saveCustomer(updatedCustomer));
      const txn: Transaction = {
        id: uid(), customerId, customerName: customer.name,
        type: '消费', amount: totalAmount, balanceAfter: newBalance,
        note: `订单消费（${orderItems.length}项服务${orderGifts.length > 0 ? ` + ${orderGifts.length}件礼物` : ''}）`, createdAt: Date.now(),
      };
      setTransactions((p) => [txn, ...p]);
      persist(db.saveTransaction(txn));
    }

    return { success: true };
  };

  const deleteOrder = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (order.paymentMethod === '预存扣款') {
      const cust = customers.find((c) => c.id === order.customerId);
      if (cust) {
        const newBalance = cust.balance + order.totalAmount;
        const updatedCustomer = { ...cust, balance: newBalance };
        const t: Transaction = {
          id: uid(), customerId: order.customerId, customerName: order.customerName,
          type: '退款', amount: order.totalAmount, balanceAfter: newBalance,
          note: '订单删除退款', createdAt: Date.now(),
        };
        setCustomers((p) => p.map((c) => (c.id === order.customerId ? updatedCustomer : c)));
        setTransactions((p) => [t, ...p]);
        persist(db.saveCustomer(updatedCustomer));
        persist(db.saveTransaction(t));
      }
    }
    setOrders((p) => p.filter((o) => o.id !== id));
    persist(db.deleteRow('orders', id));
  };

  const archivePayroll = (a: PayrollArchive) => {
    setPayrollArchives((p) => [a, ...p]);
    persist(db.savePayrollArchive(a));
  };

  return (
    <StoreContext.Provider value={{
      ready, loadError,
      reload: () => setLoadAttempt((n) => n + 1),
      syncError, dismissSyncError: () => setSyncError(null),
      customers, companions, staff, services, serviceTags, giftItems, coupons, orders, transactions,
      currency, setCurrency, formatMoney,
      isAdmin, unlockAdmin, lockAdmin, changeAdminPassword,
      addCustomer, updateCustomer, deleteCustomer, rechargeCustomer,
      addCompanion, updateCompanion, deleteCompanion,
      addStaff, updateStaff, deleteStaff,
      addService, updateService, deleteService,
      addServiceTag, updateServiceTag, deleteServiceTag,
      addGiftItem, updateGiftItem, deleteGiftItem,
      addCoupon, deleteCoupon,
      computeItemPrice,
      createOrder, deleteOrder,
      payrollArchives, archivePayroll,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
