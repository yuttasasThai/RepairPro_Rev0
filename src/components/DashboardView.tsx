import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Package, 
  Truck, 
  XCircle, 
  Phone, 
  ArrowUpRight, 
  Eye, 
  ShieldCheck,
  ShieldX,
  Sparkles,
  Layers,
  Inbox
} from 'lucide-react';
import { RepairJob, RepairStatus, ShopSettings } from '../types/repair';
import { 
  STATUS_MAP, 
  formatCurrency, 
  formatDateThai, 
  getJobWarrantyStatus 
} from '../utils/formatters';
import { DonutPieChart, PieChartData } from './PieChart';

interface DashboardViewProps {
  jobs: RepairJob[];
  shopSettings: ShopSettings;
  onOpenNewJob: () => void;
  onOpenJobDetail: (job: RepairJob) => void;
  onOpenStatusUpdate: (job: RepairJob) => void;
  onOpenCostUpdate: (job: RepairJob) => void;
  onOpenPrint: (job: RepairJob) => void;
  onNavigateToWarranty: () => void;
  onNavigateToJobs: (filterStatus?: RepairStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  shopSettings,
  onOpenNewJob,
  onOpenJobDetail,
  onOpenStatusUpdate,
  onOpenCostUpdate,
  onOpenPrint,
  onNavigateToWarranty,
  onNavigateToJobs,
}) => {
  // งานเข้าใหม่ (สถานะ pending หรือ งานใหม่ที่ยังไม่ส่งมอบ)
  const newJobsCount = useMemo(() => {
    return jobs.filter(j => j.status === 'pending').length;
  }, [jobs]);

  const totalJobsCount = jobs.length;

  const inProgressCount = useMemo(() => {
    return jobs.filter(j => j.status === 'in_progress' || j.status === 'waiting_parts').length;
  }, [jobs]);

  const completedDeliveredCount = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'picked_up' || j.status === 'completed').length;
  }, [jobs]);

  // Financial aggregates
  const totalRevenue = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.price || 0) + (j.financials.onsiteServiceFee || 0), 0);
  }, [jobs]);

  const totalCost = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.totalCost || 0), 0);
  }, [jobs]);

  const totalProfit = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.profit || 0), 0);
  }, [jobs]);

  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // 1. กราฟวงกลมของหน้าตารางงาน (Repair Table Jobs Pie: แบ่งตามสถานะงาน)
  const tableStatusPieData: PieChartData[] = useMemo(() => {
    const total = jobs.length;
    if (total === 0) return [];

    const countStatus = (s: RepairStatus) => jobs.filter(j => j.status === s).length;

    const raw = [
      { label: 'รอซ่อม', count: countStatus('pending'), color: '#f59e0b' },
      { label: 'กำลังซ่อม', count: countStatus('in_progress'), color: '#3b82f6' },
      { label: 'รออะไหล่', count: countStatus('waiting_parts'), color: '#a855f7' },
      { label: 'ซ่อมแล้ว', count: countStatus('completed'), color: '#10b981' },
      { label: 'รอส่ง', count: countStatus('ready_to_ship'), color: '#06b6d4' },
      { label: 'ส่งแล้ว', count: countStatus('delivered'), color: '#0f766e' },
      { label: 'มารับเอง', count: countStatus('picked_up'), color: '#10b981' },
      { label: 'ยกเลิก', count: countStatus('cancelled'), color: '#ef4444' },
    ];

    return raw
      .filter(item => item.count > 0)
      .map(item => ({
        ...item,
        percentage: Math.round((item.count / total) * 100),
        formattedValue: `${item.count} งาน`,
      }));
  }, [jobs]);

  // 2. กราฟวงกลมของหน้างานซ่อมเสร็จ (Completed Repairs: จัดส่งพัสดุ vs มารับเอง)
  const finishedJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'picked_up' || j.status === 'completed' || j.status === 'ready_to_ship');
  }, [jobs]);

  const completedPieData: PieChartData[] = useMemo(() => {
    const total = finishedJobs.length;
    if (total === 0) return [];

    const parcelCount = finishedJobs.filter(j => j.trackingNumber && j.trackingNumber.trim() !== '').length;
    const pickupCount = total - parcelCount;

    const list: PieChartData[] = [];
    if (parcelCount > 0) {
      list.push({
        label: 'จัดส่งพัสดุ',
        count: parcelCount,
        color: '#0284c7',
        percentage: Math.round((parcelCount / total) * 100),
        formattedValue: `${parcelCount} งาน`,
      });
    }
    if (pickupCount > 0) {
      list.push({
        label: 'มารับเองที่ร้าน',
        count: pickupCount,
        color: '#10b981',
        percentage: Math.round((pickupCount / total) * 100),
        formattedValue: `${pickupCount} งาน`,
      });
    }

    return list;
  }, [finishedJobs]);

  // 3. กราฟวงกลมของรายได้ (Revenue, Cost, Profit)
  const financialPieData: PieChartData[] = useMemo(() => {
    if (totalRevenue <= 0 && totalCost <= 0) return [];

    const basis = totalRevenue > 0 ? totalRevenue : totalCost;
    const costPercent = basis > 0 ? Math.round((totalCost / basis) * 100) : 0;
    const profitPercent = basis > 0 && totalProfit > 0 ? Math.round((totalProfit / basis) * 100) : 0;

    const list: PieChartData[] = [];
    if (totalCost > 0) {
      list.push({
        label: 'ต้นทุนรวม',
        count: totalCost,
        color: '#f43f5e',
        percentage: costPercent,
        formattedValue: formatCurrency(totalCost),
      });
    }
    if (totalProfit > 0) {
      list.push({
        label: 'กำไรสุทธิ',
        count: totalProfit,
        color: '#10b981',
        percentage: profitPercent,
        formattedValue: formatCurrency(totalProfit),
      });
    }

    return list;
  }, [totalRevenue, totalCost, totalProfit]);

  // 4. กราฟวงกลมจำนวนงานที่อยู่ในประกัน / หมดประกัน
  const warrantyPieData: PieChartData[] = useMemo(() => {
    const total = jobs.length;
    if (total === 0) return [];

    let inWarranty = 0;
    let outWarranty = 0;
    let notStarted = 0;

    jobs.forEach(job => {
      const res = getJobWarrantyStatus(job);
      if (res.status === 'active' || res.status === 'expiring_soon') {
        inWarranty++;
      } else if (res.status === 'expired' || res.status === 'none') {
        outWarranty++;
      } else if (res.status === 'not_started') {
        notStarted++;
      } else {
        outWarranty++;
      }
    });

    const list: PieChartData[] = [];
    if (inWarranty > 0) {
      list.push({
        label: 'อยู่ในประกัน',
        count: inWarranty,
        color: '#059669',
        percentage: Math.round((inWarranty / total) * 100),
        formattedValue: `${inWarranty} งาน`,
      });
    }
    if (outWarranty > 0) {
      list.push({
        label: 'หมดประกัน / ไม่มีประกัน',
        count: outWarranty,
        color: '#f97316',
        percentage: Math.round((outWarranty / total) * 100),
        formattedValue: `${outWarranty} งาน`,
      });
    }
    if (notStarted > 0) {
      list.push({
        label: 'ยังไม่เริ่มนับประกัน',
        count: notStarted,
        color: '#64748b',
        percentage: Math.round((notStarted / total) * 100),
        formattedValue: `${notStarted} งาน`,
      });
    }

    return list;
  }, [jobs]);

  // Delivery counts for chart 2
  const parcelCount = useMemo(() => {
    return finishedJobs.filter(j => j.trackingNumber && j.trackingNumber.trim() !== '').length;
  }, [finishedJobs]);
  const pickupCount = finishedJobs.length - parcelCount;

  // Warranty counts for chart 4
  const warrantyCounts = useMemo(() => {
    let inWarranty = 0;
    let outWarranty = 0;
    let notStarted = 0;

    jobs.forEach(job => {
      const res = getJobWarrantyStatus(job);
      if (res.status === 'active' || res.status === 'expiring_soon') {
        inWarranty++;
      } else if (res.status === 'not_started') {
        notStarted++;
      } else {
        outWarranty++;
      }
    });

    return { inWarranty, outWarranty, notStarted };
  }, [jobs]);

  return (
    <div className="space-y-2.5 pb-2">
      {/* 1. Header Card: RepairProShop Branding, Contact Info & New Jobs Count in one row */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-3 sm:py-2.5 sm:px-4 shadow-sm border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
              <Wrench className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight font-mono text-white">
                  RepairProShop
                </h1>
                <span className="bg-blue-500/30 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-blue-400/30">
                  แดชบอร์ดภาพรวมระบบ
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-300 mt-0.5">
                <span className="font-medium text-slate-200">{shopSettings.shopName}</span>
                <span>•</span>
                <a 
                  href={`tel:${shopSettings.phone}`}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  <Phone className="w-3 h-3" />
                  <span>{shopSettings.phone}</span>
                </a>
                <span>•</span>
                <span className="text-slate-300">LINE: {shopSettings.lineId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Compact New Incoming Jobs Metric */}
            <div className="bg-amber-500/15 border border-amber-400/60 rounded-xl px-3 py-1 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="text-[10px] text-amber-300 font-medium block leading-tight">งานเข้าใหม่ (รอซ่อม)</span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-400 leading-tight">
                  {newJobsCount} <span className="text-[10px] font-normal text-amber-200">งาน</span>
                </span>
              </div>
            </div>

            <button
              onClick={onOpenNewJob}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 hover:scale-102 cursor-pointer"
            >
              <span>+ เปิด Job ใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. สี่กราฟวงกลมหลัก - CSS Grid Layout (grid-cols-1 md:grid-cols-2 gap-4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: กราฟวงกลมของหน้าตารางงาน */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                1. กราฟวงกลมตารางงาน
              </h2>
              <span className="text-[10px] text-slate-400">สัดส่วนตามสถานะงานซ่อม</span>
            </div>
            <button
              onClick={() => onNavigateToJobs()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>ไปตาราง</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 flex items-center justify-center">
              <DonutPieChart 
                data={tableStatusPieData} 
                total={jobs.length} 
                size={115} 
                centerTitle="งานทั้งหมด"
                centerValue={`${jobs.length}`}
                unitLabel="งาน"
              />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 min-w-0">
              {[
                { label: 'รอซ่อม', color: '#f59e0b', status: 'pending' as RepairStatus },
                { label: 'กำลังซ่อม', color: '#3b82f6', status: 'in_progress' as RepairStatus },
                { label: 'รออะไหล่', color: '#a855f7', status: 'waiting_parts' as RepairStatus },
                { label: 'ซ่อมแล้ว', color: '#10b981', status: 'completed' as RepairStatus },
                { label: 'รอส่ง', color: '#06b6d4', status: 'ready_to_ship' as RepairStatus },
                { label: 'ส่งแล้ว', color: '#0f766e', status: 'delivered' as RepairStatus },
                { label: 'มารับเอง', color: '#10b981', status: 'picked_up' as RepairStatus },
                { label: 'ยกเลิก', color: '#ef4444', status: 'cancelled' as RepairStatus },
              ].map(st => {
                const found = tableStatusPieData.find(p => p.label === st.label);
                const count = found ? found.count : 0;
                return (
                  <button
                    key={st.label}
                    onClick={() => onNavigateToJobs(st.status)}
                    className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="text-slate-600 truncate">{st.label}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 2: กราฟวงกลมของหน้างานซ่อมเสร็จ */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                2. กราฟวงกลมงานซ่อมเสร็จ
              </h2>
              <span className="text-[10px] text-slate-400">วิธีจัดส่งพัสดุ vs มารับเอง</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              {finishedJobs.length} งาน
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 flex items-center justify-center">
              <DonutPieChart 
                data={completedPieData} 
                total={finishedJobs.length} 
                size={115} 
                centerTitle="งานซ่อมเสร็จ"
                centerValue={`${finishedJobs.length}`}
                unitLabel="งาน"
              />
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between text-[11px] bg-sky-50/90 px-2.5 py-1.5 rounded-xl border border-sky-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-sky-900 font-semibold truncate">จัดส่งพัสดุ</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-sky-700 font-mono">{parcelCount} งาน</span>
                  <span className="text-[10px] text-sky-500 ml-1">
                    ({finishedJobs.length > 0 ? Math.round((parcelCount / finishedJobs.length) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-emerald-50/90 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-900 font-semibold truncate">มารับเองที่ร้าน</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-700 font-mono">{pickupCount} งาน</span>
                  <span className="text-[10px] text-emerald-500 ml-1">
                    ({finishedJobs.length > 0 ? Math.round((pickupCount / finishedJobs.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: กราฟวงกลมของรายได้ */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                3. กราฟวงกลมของรายได้
              </h2>
              <span className="text-[10px] text-slate-400">สัดส่วนต้นทุนเทียบกับกำไร</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              กำไร {profitMargin}%
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 flex items-center justify-center">
              <DonutPieChart 
                data={financialPieData} 
                total={totalRevenue > 0 ? totalRevenue : totalCost} 
                size={115} 
                centerTitle="รายได้รวม"
                centerValue={formatCurrency(totalRevenue)}
                unitLabel="บาท"
              />
            </div>

            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100">
                <span className="text-blue-900 font-semibold truncate">รายได้รวม:</span>
                <span className="font-bold text-blue-700 font-mono shrink-0">{formatCurrency(totalRevenue)}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-rose-50/70 px-2.5 py-1 rounded-lg border border-rose-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-700 truncate">ต้นทุน:</span>
                </div>
                <span className="font-bold text-rose-600 font-mono shrink-0">{formatCurrency(totalCost)}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-700 truncate">กำไรสุทธิ:</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono shrink-0">{formatCurrency(totalProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 4: กราฟวงกลมจำนวนงานที่อยู่ประกันหมดประกัน */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                4. กราฟวงกลมสถานะประกัน
              </h2>
              <span className="text-[10px] text-slate-400">ในประกัน vs หมดประกัน</span>
            </div>
            <button
              onClick={onNavigateToWarranty}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
            >
              <span>ดูประกัน</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 flex items-center justify-center">
              <DonutPieChart 
                data={warrantyPieData} 
                total={jobs.length} 
                size={115} 
                centerTitle="ความคุ้มครอง"
                centerValue={`${warrantyCounts.inWarranty}`}
                unitLabel="ในประกัน"
              />
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between text-[11px] bg-emerald-50/90 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-semibold truncate">อยู่ในประกัน</span>
                </div>
                <span className="font-bold text-emerald-700 font-mono shrink-0">
                  {warrantyCounts.inWarranty} งาน
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-orange-50/90 px-2.5 py-1.5 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldX className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="text-orange-800 font-semibold truncate">หมดประกัน</span>
                </div>
                <span className="font-bold text-orange-700 font-mono shrink-0">
                  {warrantyCounts.outWarranty} งาน
                </span>
              </div>

              {warrantyCounts.notStarted > 0 && (
                <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-600 truncate">ยังไม่เริ่มนับ:</span>
                  </div>
                  <span className="font-bold text-slate-700 font-mono shrink-0">
                    {warrantyCounts.notStarted} งาน
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
