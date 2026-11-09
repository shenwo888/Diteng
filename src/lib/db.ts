import { supabase } from '@/lib/supabase';
import type {
  Customer, Companion, Staff, ServiceItem, ServiceTag, GiftItem, Coupon, Order,
  Transaction, PayrollArchive, CurrencySymbol,
} from '@/types';

export interface AppData {
  customers: Customer[];
  companions: Companion[];
  staff: Staff[];
  services: ServiceItem[];
  serviceTags: ServiceTag[];
  giftItems: GiftItem[];
  coupons: Coupon[];
  orders: Order[];
  transactions: Transaction[];
  payrollArchives: PayrollArchive[];
  currency: CurrencySymbol | null;
  seeded: boolean;
}

type Row = Record<string, any>;

function assertOk(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function mapCustomer(r: Row): Customer {
  return { id: r.id, name: r.name, contact: r.contact, balance: Number(r.balance), createdAt: Number(r.created_at) };
}

function mapCompanion(r: Row): Companion {
  return { id: r.id, name: r.name, serviceRate: Number(r.service_rate), giftRate: Number(r.gift_rate), createdAt: Number(r.created_at) };
}

function mapStaff(r: Row): Staff {
  return { id: r.id, name: r.name, commissionRate: Number(r.commission_rate), createdAt: Number(r.created_at) };
}

function mapService(r: Row): ServiceItem {
  return { id: r.id, name: r.name, pricePerHour: Number(r.price_per_hour), pricePerHalfHour: Number(r.price_per_half_hour) };
}

function mapServiceTag(r: Row): ServiceTag {
  return { id: r.id, name: r.name, surcharge: Number(r.surcharge) };
}

function mapGiftItem(r: Row): GiftItem {
  return { id: r.id, name: r.name, defaultValue: Number(r.default_value) };
}

function mapCoupon(r: Row): Coupon {
  return { id: r.id, code: r.code, kind: r.kind, value: Number(r.value), kolName: r.kol_name, createdAt: Number(r.created_at) };
}

function mapOrder(r: Row): Order {
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    staffId: r.staff_id,
    staffName: r.staff_name,
    paymentMethod: r.payment_method,
    subtotal: Number(r.subtotal),
    couponCode: r.coupon_code,
    discountAmount: Number(r.discount_amount),
    totalAmount: Number(r.total_amount),
    note: r.note,
    createdAt: Number(r.created_at),
    items: r.items,
    gifts: r.gifts,
  };
}

function mapTransaction(r: Row): Transaction {
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    type: r.type,
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    note: r.note,
    createdAt: Number(r.created_at),
  };
}

function mapPayrollArchive(r: Row): PayrollArchive {
  return {
    id: r.id,
    weekStart: Number(r.week_start),
    weekEnd: Number(r.week_end),
    label: r.label,
    archivedAt: Number(r.archived_at),
    totalCompanionSalary: Number(r.total_companion_salary),
    totalStaffCommission: Number(r.total_staff_commission),
    companions: r.companions,
    staff: r.staff,
  };
}

type QueryResult = { data: Row[] | null; error: { message: string } | null };

async function fetchRows(table: string, query: PromiseLike<QueryResult>): Promise<Row[]> {
  const { data, error } = await query;
  if (error) {
    console.error(`Failed to load ${table}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function loadAppData(): Promise<AppData> {
  const [customers, companions, staff, services, serviceTags, giftItems, coupons, orders, transactions, payrollArchives, settingsRows] =
    await Promise.all([
      fetchRows('customers', supabase.from('customers').select('*').order('created_at', { ascending: false })),
      fetchRows('companions', supabase.from('companions').select('*').order('created_at', { ascending: false })),
      fetchRows('staff', supabase.from('staff').select('*').order('created_at', { ascending: false })),
      fetchRows('services', supabase.from('services').select('*').order('sort_order', { ascending: true })),
      fetchRows('service_tags', supabase.from('service_tags').select('*').order('sort_order', { ascending: true })),
      fetchRows('gift_items', supabase.from('gift_items').select('*').order('sort_order', { ascending: true })),
      fetchRows('coupons', supabase.from('coupons').select('*').order('created_at', { ascending: false })),
      fetchRows('orders', supabase.from('orders').select('*').order('created_at', { ascending: false })),
      fetchRows('transactions', supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      fetchRows('payroll_archives', supabase.from('payroll_archives').select('*').order('archived_at', { ascending: false })),
      supabase.from('app_settings').select('*').then((res) => {
        assertOk(res.error);
        return res.data ?? [];
      }),
    ]);

  const currencyValue = settingsRows.find((r) => r.key === 'currency')?.value?.symbol as CurrencySymbol | undefined;
  const seeded = settingsRows.some((r) => r.key === 'seeded');

  return {
    customers: customers.map(mapCustomer),
    companions: companions.map(mapCompanion),
    staff: staff.map(mapStaff),
    services: services.map(mapService),
    serviceTags: serviceTags.map(mapServiceTag),
    giftItems: giftItems.map(mapGiftItem),
    coupons: coupons.map(mapCoupon),
    orders: orders.map(mapOrder),
    transactions: transactions.map(mapTransaction),
    payrollArchives: payrollArchives.map(mapPayrollArchive),
    currency: currencyValue ?? null,
    seeded,
  };
}

export async function saveCustomer(c: Customer): Promise<void> {
  assertOk((await supabase.from('customers').upsert({
    id: c.id, name: c.name, contact: c.contact, balance: c.balance, created_at: c.createdAt,
  })).error);
}

export async function saveCompanion(c: Companion): Promise<void> {
  assertOk((await supabase.from('companions').upsert({
    id: c.id, name: c.name, service_rate: c.serviceRate, gift_rate: c.giftRate, created_at: c.createdAt,
  })).error);
}

export async function saveStaff(s: Staff): Promise<void> {
  assertOk((await supabase.from('staff').upsert({
    id: s.id, name: s.name, commission_rate: s.commissionRate, created_at: s.createdAt,
  })).error);
}

export async function saveService(s: ServiceItem, sortOrder: number): Promise<void> {
  assertOk((await supabase.from('services').upsert({
    id: s.id, name: s.name, price_per_hour: s.pricePerHour, price_per_half_hour: s.pricePerHalfHour, sort_order: sortOrder,
  })).error);
}

export async function saveServiceTag(t: ServiceTag, sortOrder: number): Promise<void> {
  assertOk((await supabase.from('service_tags').upsert({
    id: t.id, name: t.name, surcharge: t.surcharge, sort_order: sortOrder,
  })).error);
}

export async function saveGiftItem(g: GiftItem, sortOrder: number): Promise<void> {
  assertOk((await supabase.from('gift_items').upsert({
    id: g.id, name: g.name, default_value: g.defaultValue, sort_order: sortOrder,
  })).error);
}

export async function saveCoupon(c: Coupon): Promise<void> {
  assertOk((await supabase.from('coupons').upsert({
    id: c.id, code: c.code, kind: c.kind, value: c.value, kol_name: c.kolName, created_at: c.createdAt,
  })).error);
}

export async function deleteRow(table: 'customers' | 'companions' | 'staff' | 'services' | 'service_tags' | 'gift_items' | 'coupons' | 'orders', id: string): Promise<void> {
  assertOk((await supabase.from(table).delete().eq('id', id)).error);
}

export async function saveOrder(o: Order): Promise<void> {
  assertOk((await supabase.from('orders').insert({
    id: o.id,
    customer_id: o.customerId,
    customer_name: o.customerName,
    staff_id: o.staffId,
    staff_name: o.staffName,
    payment_method: o.paymentMethod,
    subtotal: o.subtotal,
    coupon_code: o.couponCode,
    discount_amount: o.discountAmount,
    total_amount: o.totalAmount,
    note: o.note,
    items: o.items,
    gifts: o.gifts,
    created_at: o.createdAt,
  })).error);
}

export async function saveTransaction(t: Transaction): Promise<void> {
  assertOk((await supabase.from('transactions').insert({
    id: t.id,
    customer_id: t.customerId,
    customer_name: t.customerName,
    type: t.type,
    amount: t.amount,
    balance_after: t.balanceAfter,
    note: t.note,
    created_at: t.createdAt,
  })).error);
}

export async function savePayrollArchive(a: PayrollArchive): Promise<void> {
  assertOk((await supabase.from('payroll_archives').insert({
    id: a.id,
    week_start: a.weekStart,
    week_end: a.weekEnd,
    label: a.label,
    archived_at: a.archivedAt,
    total_companion_salary: a.totalCompanionSalary,
    total_staff_commission: a.totalStaffCommission,
    companions: a.companions,
    staff: a.staff,
  })).error);
}

export async function saveCurrency(symbol: CurrencySymbol): Promise<void> {
  assertOk((await supabase.from('app_settings').upsert({ key: 'currency', value: { symbol } })).error);
}

export async function seedDefaults(services: ServiceItem[], tags: ServiceTag[], gifts: GiftItem[]): Promise<void> {
  assertOk((await supabase.from('services').upsert(services.map((s, i) => ({
    id: s.id, name: s.name, price_per_hour: s.pricePerHour, price_per_half_hour: s.pricePerHalfHour, sort_order: i,
  })))).error);
  assertOk((await supabase.from('service_tags').upsert(tags.map((t, i) => ({
    id: t.id, name: t.name, surcharge: t.surcharge, sort_order: i,
  })))).error);
  assertOk((await supabase.from('gift_items').upsert(gifts.map((g, i) => ({
    id: g.id, name: g.name, default_value: g.defaultValue, sort_order: i,
  })))).error);
  assertOk((await supabase.from('app_settings').upsert({ key: 'seeded', value: { done: true } })).error);
}
