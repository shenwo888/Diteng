export interface Customer {
  id: string;
  name: string;
  contact: string;
  balance: number;
  createdAt: number;
}

export interface Companion {
  id: string;
  name: string;
  serviceRate: number;
  giftRate: number;
  createdAt: number;
}

export interface Staff {
  id: string;
  name: string;
  commissionRate: number;
  createdAt: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  pricePerHour: number;
  pricePerHalfHour: number;
}

export interface ServiceTag {
  id: string;
  name: string;
  surcharge: number;
}

export interface GiftItem {
  id: string;
  name: string;
  defaultValue: number;
}

export type PaymentMethod = '预存扣款' | '现金/即时转账';

export type CurrencySymbol = 'RM' | '$' | 'NT$' | 'IDR';

export type CouponKind = 'percent' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  kolName: string;
  createdAt: number;
}

export interface GiftRecord {
  id: string;
  name: string;
  value: number;
  companionId: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  companionId: string;
  serviceName: string;
  hours: number;
  amount: number;
  tagIds: string[];
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  staffId: string;
  staffName: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  couponCode: string;
  discountAmount: number;
  totalAmount: number;
  note: string;
  createdAt: number;
  items: OrderItem[];
  gifts: GiftRecord[];
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: '充值' | '消费' | '退款';
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: number;
}

export interface PayrollEntry {
  id: string;
  name: string;
  type: 'companion' | 'staff';
  orderCount: number;
  hours: number;
  revenue: number;
  giftValue: number;
  salary: number;
  rate: number;
}

export interface PayrollArchive {
  id: string;
  weekStart: number;
  weekEnd: number;
  label: string;
  archivedAt: number;
  totalCompanionSalary: number;
  totalStaffCommission: number;
  companions: PayrollEntry[];
  staff: PayrollEntry[];
}
