import { useState, useMemo } from 'react';
import { Banknote, Lock, Archive, Download, CheckCircle2, AlertCircle, Clock, History, Wallet } from 'lucide-react';
import { useStore } from '@/store';
import { formatDateRange, formatWeekLabel, getCurrentWeekRange, uid } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { useI18n } from '@/lib/i18n';
import type { PayrollArchive, PayrollEntry, Order, Companion, Staff } from '@/types';
import ConfirmDialog from '@/components/ConfirmDialog';

function buildPayroll(
  orders: Order[],
  companions: Companion[],
  staff: Staff[],
  weekStart: number,
  weekEnd: number,
): { companionEntries: PayrollEntry[]; staffEntries: PayrollEntry[]; totalCompanionSalary: number; totalStaffCommission: number } {
  const weekOrders = orders.filter((o) => o.createdAt >= weekStart && o.createdAt <= weekEnd);

  const companionEntries: PayrollEntry[] = companions
    .map((comp) => {
      const compOrders = weekOrders.filter((o) => o.items.some((i) => i.companionId === comp.id));
      const orderCount = compOrders.length;
      const hours = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === comp.id).reduce((is, i) => is + i.hours, 0), 0);
      const revenue = compOrders.reduce((s, o) => s + o.items.filter((i) => i.companionId === comp.id).reduce((is, i) => is + i.amount, 0), 0);
      const giftValue = weekOrders.reduce((s, o) => s + o.gifts.filter((g) => g.companionId === comp.id).reduce((gs, g) => gs + g.value, 0), 0);
      const salary = revenue * (comp.serviceRate / 100) + giftValue * (comp.giftRate / 100);
      return {
        id: comp.id, name: comp.name, type: 'companion' as const,
        orderCount, hours, revenue, giftValue, salary,
        rate: comp.serviceRate,
      };
    })
    .filter((e) => e.orderCount > 0 || e.giftValue > 0)
    .sort((a, b) => b.salary - a.salary);

  const staffEntries: PayrollEntry[] = staff
    .map((s) => {
      const sOrders = weekOrders.filter((o) => o.staffId === s.id);
      const orderCount = sOrders.length;
      const revenue = sOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const commission = revenue * (s.commissionRate / 100);
      return {
        id: s.id, name: s.name, type: 'staff' as const,
        orderCount, hours: 0, revenue, giftValue: 0, salary: commission,
        rate: s.commissionRate,
      };
    })
    .filter((e) => e.orderCount > 0)
    .sort((a, b) => b.salary - a.salary);

  const totalCompanionSalary = companionEntries.reduce((s, e) => s + e.salary, 0);
  const totalStaffCommission = staffEntries.reduce((s, e) => s + e.salary, 0);

  return { companionEntries, staffEntries, totalCompanionSalary, totalStaffCommission };
}

function exportCSV(archive: PayrollArchive, formatMoney: (n: number) => string) {
  const rows: (string | number)[][] = [
    [`周薪发薪明细表 - ${archive.label}`],
    [`周期: ${formatDateRange(archive.weekStart, archive.weekEnd)}`],
    [`归档时间: ${new Date(archive.archivedAt).toLocaleString('zh-CN')}`],
    [],
    ['一、陪玩薪资明细'],
    ['姓名', '接单数', '总工时(h)', '创造业绩', '收到礼物', '服务分润比例', '应付薪资'],
    ...archive.companions.map((c) => [c.name, c.orderCount, c.hours.toFixed(1), c.revenue.toFixed(2), c.giftValue.toFixed(2), `${c.rate}%`, c.salary.toFixed(2)]),
    ['合计', '', '', '', '', '', archive.totalCompanionSalary.toFixed(2)],
    [],
    ['二、客服提成明细'],
    ['姓名', '处理订单数', '经手营业额', '提成比例', '应得提成'],
    ...archive.staff.map((s) => [s.name, s.orderCount, s.revenue.toFixed(2), `${s.rate}%`, s.salary.toFixed(2)]),
    ['合计', '', '', '', archive.totalStaffCommission.toFixed(2)],
    [],
    [`总发放金额: ${formatMoney(archive.totalCompanionSalary + archive.totalStaffCommission)}`],
  ];
  downloadCSV(`发薪明细_${archive.label}.csv`, rows);
}

export default function PayrollCenterPage() {
  const { orders, companions, staff, isAdmin, unlockAdmin, payrollArchives, archivePayroll, formatMoney } = useStore();
  const { t, locale } = useI18n();

  const [passwordInput, setPasswordInput] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState('');

  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const weekLabel = useMemo(() => formatWeekLabel(weekRange.start, locale === 'en'), [weekRange.start, locale]);

  const currentPayroll = useMemo(
    () => buildPayroll(orders, companions, staff, weekRange.start, weekRange.end),
    [orders, companions, staff, weekRange],
  );

  const selectedArchive = useMemo(
    () => payrollArchives.find((a) => a.id === selectedArchiveId) ?? null,
    [payrollArchives, selectedArchiveId],
  );

  const handleUnlock = async () => {
    setAuthBusy(true);
    try {
      if (await unlockAdmin(passwordInput)) {
        setPasswordInput('');
        setPwdError(null);
      } else {
        setPwdError(t('密码错误，请重试', 'Wrong password, please try again'));
      }
    } catch (e) {
      console.error('admin unlock failed', e);
      setPwdError(t('无法验证密码，请检查网络后重试', 'Could not verify the password. Check your connection and try again.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const hasPayrollData = currentPayroll.companionEntries.length > 0 || currentPayroll.staffEntries.length > 0;

  const buildCurrentArchive = (): PayrollArchive => ({
    id: uid(),
    weekStart: weekRange.start,
    weekEnd: weekRange.end,
    label: weekLabel,
    archivedAt: Date.now(),
    totalCompanionSalary: currentPayroll.totalCompanionSalary,
    totalStaffCommission: currentPayroll.totalStaffCommission,
    companions: currentPayroll.companionEntries,
    staff: currentPayroll.staffEntries,
  });

  const handleArchive = () => {
    if (!hasPayrollData) {
      setArchiveResult({ ok: false, msg: t('本周暂无待发薪数据，无需归档', 'No payroll data this week, nothing to archive') });
      setTimeout(() => setArchiveResult(null), 3000);
      return;
    }
    archivePayroll(buildCurrentArchive());
    setArchiveResult({ ok: true, msg: t(`${weekLabel} 薪资已归档，本期已重置`, `${weekLabel} payroll archived, this period has been reset`) });
    setTimeout(() => setArchiveResult(null), 4000);
  };

  // ---- Locked view ----
  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('财务周发薪中心', 'Weekly payroll center')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('输入管理员密码以进入发薪管理', 'Enter the admin password to manage payroll')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <Lock size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{t('需要管理者/财务权限', 'Admin or finance access required')}</p>
              <p className="text-xs text-slate-400">{t('发薪归档与历史账单需密码验证', 'Payroll archiving and past statements require a password')}</p>
            </div>
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPwdError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder={t('输入管理员密码', 'Enter admin password')}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${pwdError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
          />
          {pwdError && <p className="text-xs text-rose-500 mt-2">{pwdError}</p>}
          <button
            onClick={handleUnlock}
            disabled={authBusy}
            className="w-full mt-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
            <Banknote size={24} className="text-emerald-600" /> {t('财务周发薪中心', 'Weekly payroll center')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('本期周期：', 'Current period: ')}{formatDateRange(weekRange.start, weekRange.end)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {hasPayrollData && (
          <button
            onClick={() => exportCSV(buildCurrentArchive(), formatMoney)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-50 text-sky-600 text-sm font-medium rounded-xl hover:bg-sky-100 transition-colors"
          >
            <Download size={18} /> {t('导出本期 (CSV)', 'Export period (CSV)')}
          </button>
        )}
        <button
          onClick={() => setShowArchiveConfirm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/25"
        >
          <Archive size={18} /> {t('周五发薪归档与重置', 'Archive & reset payroll')}
        </button>
        </div>
      </div>

      {archiveResult && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${archiveResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {archiveResult.ok ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          <span className="text-sm font-medium">{archiveResult.msg}</span>
        </div>
      )}

      {/* Total salary highlight card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-50 text-sm font-medium flex items-center gap-2"><Wallet size={18} /> {t('本期应付陪玩总薪资', 'Companion salaries payable this period')}</p>
            <p className="text-white text-3xl font-bold mt-2">{formatMoney(currentPayroll.totalCompanionSalary)}</p>
            <p className="text-emerald-100 text-sm mt-1">
              {t('客服提成合计：', 'Total staff commission: ')}{formatMoney(currentPayroll.totalStaffCommission)}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Banknote size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Current week - Companion salary table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('陪玩个人本周薪资', 'Companion pay this week')}</h2>
        </div>
        {currentPayroll.companionEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('本周暂无陪玩接单数据', 'No companion orders this week')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('陪玩', 'Companion')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('接单数', 'Orders')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('总工时', 'Hours')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('创造业绩', 'Revenue')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('收到礼物', 'Gifts received')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('分润比例', 'Share rate')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('应付薪资', 'Salary payable')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentPayroll.companionEntries.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{c.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t(`${c.orderCount} 单`, `${c.orderCount} orders`)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.hours.toFixed(1)} h</td>
                    <td className="px-4 py-3 text-right text-sky-600 font-medium">{formatMoney(c.revenue)}</td>
                    <td className="px-4 py-3 text-right text-rose-500 font-medium">{formatMoney(c.giftValue)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{c.rate}%</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatMoney(c.salary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-6 py-3 text-slate-700" colSpan={6}>{t('陪玩薪资合计', 'Total companion pay')}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(currentPayroll.totalCompanionSalary)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Current week - Staff commission table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('客服本周提成', 'Staff commission this week')}</h2>
        </div>
        {currentPayroll.staffEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('本周暂无客服接单数据', 'No staff orders this week')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold">{t('客服', 'Staff')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('处理订单', 'Orders handled')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('经手营业额', 'Revenue handled')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('提成比例', 'Commission rate')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('应得提成', 'Commission earned')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentPayroll.staffEntries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{s.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t(`${s.orderCount} 单`, `${s.orderCount} orders`)}</td>
                    <td className="px-4 py-3 text-right text-sky-600 font-medium">{formatMoney(s.revenue)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{s.rate}%</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{formatMoney(s.salary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-6 py-3 text-slate-700" colSpan={4}>{t('客服提成合计', 'Total staff commission')}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatMoney(currentPayroll.totalStaffCommission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* History section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-slate-500" /> {t('往期已发历史账单', 'Past payroll statements')}
          </h2>
          {payrollArchives.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedArchiveId}
                onChange={(e) => setSelectedArchiveId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">{t('选择往期周期...', 'Select a past period...')}</option>
                {payrollArchives.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              {selectedArchive && (
                <button
                  onClick={() => exportCSV(selectedArchive, formatMoney)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                >
                  <Download size={16} /> {t('导出数据 (CSV)', 'Export CSV')}
                </button>
              )}
            </div>
          )}
        </div>

        {!selectedArchive ? (
          <div className="px-6 py-12 text-center">
            <Clock size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">
              {payrollArchives.length === 0
                ? t('暂无历史归档记录，完成首次发薪归档后将在此显示', 'No archived payrolls yet. They will appear here after your first archive.')
                : t('请选择一个历史周期查看发薪明细', 'Select a past period to view its payroll details')}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Archive summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs text-emerald-500 font-medium">{t('陪玩薪资合计', 'Total companion pay')}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">{formatMoney(selectedArchive.totalCompanionSalary)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-500 font-medium">{t('客服提成合计', 'Total staff commission')}</p>
                <p className="text-lg font-bold text-amber-600 mt-1">{formatMoney(selectedArchive.totalStaffCommission)}</p>
              </div>
              <div className="bg-sky-50 rounded-xl p-4">
                <p className="text-xs text-sky-500 font-medium">{t('总发放金额', 'Total paid out')}</p>
                <p className="text-lg font-bold text-sky-600 mt-1">
                  {formatMoney(selectedArchive.totalCompanionSalary + selectedArchive.totalStaffCommission)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {t('周期：', 'Period: ')}{formatDateRange(selectedArchive.weekStart, selectedArchive.weekEnd)} · {t('归档时间：', 'Archived: ')}{new Date(selectedArchive.archivedAt).toLocaleString(t('zh-CN', 'en-US'))}
            </p>

            {/* Archive companion table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('陪玩薪资明细', 'Companion pay details')}</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                      <th className="px-4 py-2.5 text-left font-semibold">{t('姓名', 'Name')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('接单', 'Orders')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('工时', 'Hours')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('业绩', 'Revenue')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('礼物', 'Gifts')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('实发', 'Paid')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedArchive.companions.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">{c.name}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{c.orderCount}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{c.hours.toFixed(1)}h</td>
                        <td className="px-3 py-2.5 text-right text-sky-600">{formatMoney(c.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-rose-500">{formatMoney(c.giftValue)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{formatMoney(c.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Archive staff table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('客服提成明细', 'Staff commission details')}</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                      <th className="px-4 py-2.5 text-left font-semibold">{t('姓名', 'Name')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('订单', 'Orders')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('营业额', 'Revenue')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('比例', 'Rate')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('实发', 'Paid')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedArchive.staff.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">{s.name}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{s.orderCount}</td>
                        <td className="px-3 py-2.5 text-right text-sky-600">{formatMoney(s.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-500">{s.rate}%</td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-600">{formatMoney(s.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={() => { handleArchive(); setShowArchiveConfirm(false); }}
        title={t('确认发薪归档', 'Confirm payroll archive')}
        message={t(
          `确认已完成本周（${weekLabel}）薪资发放并归档？归档后本期应付薪资将清零重置，开启下一个礼拜的新周期。`,
          `Confirm that this week's (${weekLabel}) payroll has been paid and archived? Payable amounts for this period will reset to zero and a new period will begin.`,
        )}
        confirmText={t('确认归档', 'Confirm archive')}
        danger
      />
    </div>
  );
}
