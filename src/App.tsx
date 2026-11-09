import { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Users, Gamepad2, Receipt, Menu, X, Headphones, Settings, Banknote } from 'lucide-react';
import { StoreProvider, useStore } from '@/store';
import { LocaleProvider, useI18n } from '@/lib/i18n';
import DashboardPage from '@/pages/DashboardPage';
import NewOrderPage from '@/pages/NewOrderPage';
import CustomersPage from '@/pages/CustomersPage';
import CompanionsPage from '@/pages/CompanionsPage';
import OrdersPage from '@/pages/OrdersPage';
import StaffPage from '@/pages/StaffPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import PayrollCenterPage from '@/pages/PayrollCenterPage';

type Tab = 'dashboard' | 'new-order' | 'customers' | 'companions' | 'staff' | 'orders' | 'admin' | 'payroll';

const NAV_ITEMS: { id: Tab; zh: string; en: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', zh: '数据看板', en: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-order', zh: '记单/记账', en: 'New Order', icon: PlusCircle },
  { id: 'customers', zh: '顾客管理', en: 'Customers', icon: Users },
  { id: 'companions', zh: '陪玩管理', en: 'Companions', icon: Gamepad2 },
  { id: 'staff', zh: '客服业绩', en: 'Staff Performance', icon: Headphones },
  { id: 'orders', zh: '订单流水', en: 'Orders', icon: Receipt },
];

const ADMIN_NAV_ITEM: { id: Tab; zh: string; en: string; icon: typeof LayoutDashboard } = {
  id: 'admin', zh: '管理者设置', en: 'Admin Settings', icon: Settings,
};

const PAYROLL_NAV_ITEM: { id: Tab; zh: string; en: string; icon: typeof LayoutDashboard } = {
  id: 'payroll', zh: '财务发薪', en: 'Payroll', icon: Banknote,
};

function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      aria-label="Switch language"
      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 transition-colors"
    >
      <span className={locale === 'zh' ? 'text-white' : 'text-slate-500'}>中</span>
      <span className="text-slate-500"> / </span>
      <span className={locale === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
    </button>
  );
}

function PageView({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'dashboard': return <DashboardPage />;
    case 'new-order': return <NewOrderPage />;
    case 'customers': return <CustomersPage />;
    case 'companions': return <CompanionsPage />;
    case 'staff': return <StaffPage />;
    case 'orders': return <OrdersPage />;
    case 'admin': return <AdminSettingsPage />;
    case 'payroll': return <PayrollCenterPage />;
  }
}

function AppContent() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();
  const { syncError, dismissSyncError, loadError } = useStore();

  useEffect(() => { setSidebarOpen(false); }, [tab]);

  return (
    <div className="min-h-screen bg-slate-50">
      {(syncError || loadError) && (
        <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-rose-600 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
          <span className="flex-1">{syncError ?? t('数据加载失败，请刷新页面重试', 'Failed to load data, please refresh the page')}</span>
          {syncError && (
            <button onClick={dismissSyncError} aria-label={t('关闭', 'Dismiss')} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-slate-900 flex-col z-30">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
              <Gamepad2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">{t('陪玩俱乐部', 'Companion Club')}</h1>
              <p className="text-slate-400 text-xs">{t('内部管理系统', 'Internal Management')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === item.id
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={18} /> {t(item.zh, item.en)}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-slate-800 space-y-1">
          <div className="flex justify-end pb-2"><LocaleToggle /></div>
          <button
            onClick={() => setTab(PAYROLL_NAV_ITEM.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === PAYROLL_NAV_ITEM.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Banknote size={18} /> {t(PAYROLL_NAV_ITEM.zh, PAYROLL_NAV_ITEM.en)}
          </button>
          <button
            onClick={() => setTab(ADMIN_NAV_ITEM.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === ADMIN_NAV_ITEM.id
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings size={18} /> {t(ADMIN_NAV_ITEM.zh, ADMIN_NAV_ITEM.en)}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
            <Gamepad2 size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">{t('陪玩俱乐部', 'Companion Club')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300 p-1">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-20">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col pt-16 pb-4 px-3 overflow-y-auto">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      tab === item.id
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} /> {t(item.zh, item.en)}
                  </button>
                );
              })}
            </nav>
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
              <button
                onClick={() => setTab(PAYROLL_NAV_ITEM.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === PAYROLL_NAV_ITEM.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Banknote size={18} /> {t(PAYROLL_NAV_ITEM.zh, PAYROLL_NAV_ITEM.en)}
              </button>
              <button
                onClick={() => setTab(ADMIN_NAV_ITEM.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === ADMIN_NAV_ITEM.id
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings size={18} /> {t(ADMIN_NAV_ITEM.zh, ADMIN_NAV_ITEM.en)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen">
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
          <PageView tab={tab} />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex items-center justify-around px-1 py-1.5 safe-area-bottom overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 shrink-0 ${
                active ? 'text-sky-500' : 'text-slate-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium whitespace-nowrap">{t(item.zh, item.en)}</span>
            </button>
          );
        })}
        <button
          onClick={() => setTab(PAYROLL_NAV_ITEM.id)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 shrink-0 ${
            tab === PAYROLL_NAV_ITEM.id ? 'text-emerald-500' : 'text-slate-400'
          }`}
        >
          <Banknote size={18} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t('发薪', 'Payroll')}</span>
        </button>
        <button
          onClick={() => setTab(ADMIN_NAV_ITEM.id)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 shrink-0 ${
            tab === ADMIN_NAV_ITEM.id ? 'text-sky-500' : 'text-slate-400'
          }`}
        >
          <Settings size={18} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t('设置', 'Settings')}</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </LocaleProvider>
  );
}
