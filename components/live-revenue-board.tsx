'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CircleAlert, Clock3, ExternalLink, Gauge, Megaphone,
  RefreshCw, ShoppingBag, Target, Users,
} from 'lucide-react';

type Day = {
  date: string;
  available: boolean;
  total: number | null;
  products: Record<string, number> | null;
  adSpend: Record<string, number>;
};
type Campaign = {
  date: string;
  name: string;
  spend: number;
  purchases: number;
  conversionValue: number;
  clicks: number;
  impressions: number;
  metaRoas: number | null;
};
type RevenueResponse = {
  today: string;
  days: Day[];
  campaigns: Campaign[];
  metaLatestDate: string | null;
  productNames: string[];
  todayTarget: number;
  updatedAt: string;
};
type PeriodPlan = {
  name: string; type: string; startDate: string; endDate: string; days: number;
  targetSales: number; dailyTarget: number; targetDau: number; targetCvr: number;
  targetAov: number; driverDailySales: number; driverVsTarget: number;
  actualSales: number; elapsedDays: number; targetToDate: number; achievement: number; remaining: number;
};
type SkuPlan = {
  sku: string; type: string; targetSales: number; dailyTraffic: number;
  targetCvr: number; targetAov: number; buyers: number; dailySales: number; monthlySales: number;
  actualSales: number; achievement: number; remaining: number;
};
type PlanningResponse = {
  today: string; periods: PeriodPlan[]; currentPeriod: PeriodPlan | null;
  skuPlans: SkuPlan[]; monthlyTarget: number; monthActual: number; monthlyAchievement: number;
  monthlyRemaining: number; updatedAt: string;
  todayOverview: { totalSales: number; traffic: number; buyers: number; cvr: number; aov: number; status: string } | null;
  skuDailyToday: Array<{ sku: string; traffic: number; buyers: number; sales: number; firstPurchaseSales: number; repeatPurchaseSales: number; cvr: number; aov: number; status: string }>;
};

const GA_DASHBOARD_URL = 'https://script.google.com/a/macros/sparkpetkorea.com/s/AKfycbz-DTZjkVAicYYvl6Mu7s_1I1-HePC08XBX5cX8nLm1xraxe3EDHlggNUYFKmKkyHWk/exec';

const productColors = ['#6758f3', '#2a78d6', '#24a779', '#e39b43', '#d86d9c', '#726b84'];
const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const shortWon = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

function dateLabel(date: string, includeWeekday = false) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric',
    ...(includeWeekday ? { weekday: 'short' as const } : {}),
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

function ratio(spend: number, sales: number) {
  return sales > 0 ? (spend / sales) * 100 : null;
}

function roas(sales: number, spend: number) {
  return spend > 0 ? (sales / spend) * 100 : null;
}

function metricPercent(value: number | null) {
  return value === null ? '—' : `${percent.format(value)}%`;
}

function ProductTrend({ days, product, color }: { days: Day[]; product: string; color: string }) {
  const values = days.map((day) => day.products?.[product] ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="trend-chart" aria-label={`${product} 최근 7일 매출 추이`}>
      <div className="trend-bars">
        {days.map((day, index) => {
          const value = values[index];
          return (
            <div className="trend-column" key={day.date}>
              <span className="trend-value">{value > 0 ? `${shortWon.format(value)}원` : '—'}</span>
              <div className="trend-track"><i style={{ height: `${Math.max((value / max) * 100, value > 0 ? 7 : 2)}%`, background: color }} /></div>
              <small>{dateLabel(day.date)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LiveRevenueBoard() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [planning, setPlanning] = useState<PlanningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const loadRevenue = useCallback(async () => {
    try {
      const client = Date.now();
      const [revenueResponse, planningResponse] = await Promise.all([
        fetch(`/api/revenue?client=${client}`, { cache: 'no-store' }),
        fetch(`/api/planning?client=${client}`, { cache: 'no-store' }),
      ]);
      if (!revenueResponse.ok || !planningResponse.ok) throw new Error('request failed');
      const [revenueData, planningData] = await Promise.all([
        revenueResponse.json() as Promise<RevenueResponse>,
        planningResponse.json() as Promise<PlanningResponse>,
      ]);
      setData(revenueData);
      setPlanning(planningData);
      setError(null);
    } catch {
      setError('시트 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSources = useCallback(async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const response = await fetch('/api/refresh', { method: 'POST', cache: 'no-store' });
      const result = await response.json() as { skipped?: boolean; message?: string };
      if (!response.ok) throw new Error(result.message || 'refresh failed');
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await loadRevenue();
      setRefreshMessage(result.skipped
        ? '방금 수집한 데이터로 다시 표시했어요.'
        : 'Meta를 새로 수집하고 매출 최신값을 반영했어요.');
    } catch (refreshError) {
      setRefreshMessage(refreshError instanceof Error
        ? refreshError.message
        : '원본 데이터 수집에 실패했어요.');
    } finally {
      setRefreshing(false);
    }
  }, [loadRevenue]);

  useEffect(() => {
    void loadRevenue();
    const timer = window.setInterval(() => loadRevenue(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadRevenue]);

  const summary = useMemo(() => {
    if (!data) return null;
    const availableDays = data.days.filter((day) => day.available);
    const today = data.days.find((day) => day.date === data.today);
    const productTotals = data.productNames.map((name, index) => {
      const sales = availableDays.reduce((sum, day) => sum + (day.products?.[name] ?? 0), 0);
      const spend = availableDays.reduce((sum, day) => sum + (day.adSpend?.[name] ?? 0), 0);
      return { name, color: productColors[index], sales, spend, adRatio: ratio(spend, sales), realRoas: roas(sales, spend) };
    });
    const sevenDayTotal = availableDays.reduce((sum, day) => sum + (day.total ?? 0), 0);
    const sevenDaySpend = productTotals.reduce((sum, product) => sum + product.spend, 0);
    const todayMetaSpend = data.campaigns
      .filter((campaign) => campaign.date === data.today && !campaign.name.includes('스퀘어'))
      .reduce((sum, campaign) => sum + campaign.spend, 0);
    return {
      today,
      availableDays: availableDays.length,
      sevenDayTotal,
      sevenDaySpend,
      todayMetaSpend,
      todayAdRatio: ratio(todayMetaSpend, today?.total ?? 0),
      sevenDayRoas: roas(sevenDayTotal, sevenDaySpend),
      todayTargetAchievement: data.todayTarget > 0
        ? ((today?.total ?? 0) / data.todayTarget) * 100
        : null,
      productTotals,
    };
  }, [data]);

  return (
    <div className="content" id="live-sales">
      <section className="hero-row">
        <div>
          <p className="eyebrow">SEPTEMBER · LIVE COMMERCE</p>
          <h1>자사몰 실시간 대시보드</h1>
          <p>자사몰 실매출과 Meta 광고 데이터를 제품·캠페인별로 한 화면에서 확인합니다.</p>
        </div>
        <div className="refresh-actions">
          <button className="refresh-button" type="button" onClick={refreshSources} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? '원본 수집 중' : '지금 데이터 수집'}
          </button>
          {refreshMessage && <small aria-live="polite">{refreshMessage}</small>}
        </div>
      </section>

      {error && <div className="error-banner" role="alert"><CircleAlert /><span>{error}</span><button type="button" onClick={() => loadRevenue()}>다시 시도</button></div>}

      {loading && !data ? (
        <section className="loading-panel" aria-live="polite"><RefreshCw className="spin" /><span>실시간 데이터를 불러오고 있어요…</span></section>
      ) : data && summary ? (
        <>
          <section className="metrics" aria-label="실시간 커머스 핵심 지표">
            <article className="metric-card accent-card">
              <div className="metric-label"><span>오늘 실매출</span><ShoppingBag /></div>
              <strong>{summary.today?.available ? won.format(summary.today.total ?? 0) : '집계 전'}</strong>
              <p><i />{dateLabel(data.today, true)} 진행중</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>오늘 Meta 광고비</span><Megaphone /></div>
              <strong>{won.format(summary.todayMetaSpend)}</strong>
              <p>캠페인명 ‘스퀘어’ 제외 · Meta 전체</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>오늘 광고비율</span><Gauge /></div>
              <strong>{metricPercent(summary.todayAdRatio)}</strong>
              <p>광고비 ÷ 실매출</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>오늘 목표매출 달성률</span><Target /></div>
              <strong>{metricPercent(summary.todayTargetAchievement)}</strong>
              <p>{won.format(summary.today?.total ?? 0)} / 오늘 목표 {won.format(data.todayTarget)}</p>
            </article>
          </section>

          <section className="panel daily-panel" id="daily-sales">
            <div className="panel-heading">
              <div><span className="section-kicker">DAILY PRODUCT PULSE</span><h2>제품별 일자별 실매출 · 광고비</h2></div>
              <div className="live-meta">
                <span className="live-pill"><i />60초 화면 갱신</span>
                <span><Clock3 />{timeLabel(data.updatedAt)} 기준</span>
              </div>
            </div>
            <div className="revenue-table-scroll">
              <table className="revenue-table commerce-table">
                <thead><tr><th>일자</th>{data.productNames.map((name, index) => <th key={name}><i style={{ background: productColors[index] }} />{name}</th>)}<th>전체 실매출</th></tr></thead>
                <tbody>
                  {[...data.days].reverse().map((day) => (
                    <tr key={day.date} className={day.date === data.today ? 'today-row' : ''}>
                      <td><b>{dateLabel(day.date, true)}</b>{day.date === data.today && <span className="today-badge">오늘</span>}</td>
                      {data.productNames.map((name) => {
                        const sales = day.products?.[name] ?? 0;
                        const spend = day.adSpend?.[name] ?? 0;
                        return (
                          <td key={name} className={!day.available ? 'empty-cell' : ''}>
                            <b>{day.available ? won.format(sales) : '—'}</b>
                            <small>광고비 {won.format(spend)} / {metricPercent(ratio(spend, sales))}</small>
                          </td>
                        );
                      })}
                      <td className="row-total">{day.available ? won.format(day.total ?? 0) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footnote">
              <span><i />광고비율 = 광고비 ÷ 실매출</span>
              <span>Meta 마지막 수집 {data.metaLatestDate ? dateLabel(data.metaLatestDate, true) : '대기중'}</span>
            </div>
          </section>

          <section className="panel campaign-panel" id="campaigns">
            <div className="panel-heading">
              <div><span className="section-kicker">META CAMPAIGN PULSE</span><h2>Meta 캠페인 실시간 현황</h2></div>
              <span className="campaign-date">스퀘어 캠페인 제외 · {data.metaLatestDate ? `${dateLabel(data.metaLatestDate, true)} 수집분` : '수집 대기중'}</span>
            </div>
            <div className="campaign-table-scroll">
              <table className="campaign-table">
                <thead><tr><th>캠페인</th><th>광고비</th><th>구매(1일 기여)</th><th>구매전환값</th><th>노출</th><th>클릭</th><th>CTR</th></tr></thead>
                <tbody>
                  {data.campaigns
                    .filter((campaign) => campaign.date === data.metaLatestDate && !campaign.name.includes('스퀘어'))
                    .sort((a, b) => b.spend - a.spend)
                    .map((campaign) => (
                      <tr key={campaign.name}>
                        <td>{campaign.name}</td>
                        <td>{won.format(campaign.spend)}</td>
                        <td>{campaign.purchases}건</td>
                        <td>{won.format(campaign.conversionValue)}</td>
                        <td>{campaign.impressions.toLocaleString('ko-KR')}</td>
                        <td>{campaign.clicks.toLocaleString('ko-KR')}</td>
                        <td><b>{metricPercent(ratio(campaign.clicks, campaign.impressions))}</b></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="product-section" id="product-sales">
            <div className="section-heading">
              <div><span className="section-kicker">7-DAY PRODUCT TREND</span><h2>제품별 최근 7일 매출 추이</h2></div>
              <span>{dateLabel(data.days[0].date)} – {dateLabel(data.days[6].date)}</span>
            </div>
            <div className="trend-grid">
              {summary.productTotals.map((product) => (
                <article className="trend-card" key={product.name}>
                  <div className="trend-card-heading"><div><i style={{ background: product.color }} /><span>{product.name}</span></div><strong>{won.format(product.sales)}</strong></div>
                  <ProductTrend days={data.days} product={product.name} color={product.color} />
                  <div className="trend-foot"><span>7일 누적</span><b>광고비율 {metricPercent(product.adRatio)}</b></div>
                </article>
              ))}
            </div>
          </section>

          {planning && (
            <>
              <section className="planning-section" id="period-plan">
                <div className="section-heading">
                  <div><span className="section-kicker">SEPTEMBER SALES PLAN</span><h2>기간별 목표 매출</h2></div>
                  <span>02_PERIOD_PLAN 자동 연동</span>
                </div>
                <div className="plan-summary-grid">
                  <article className="plan-summary-card primary-plan">
                    <span>9월 누적 실매출</span><strong>{won.format(planning.monthActual)}</strong>
                    <small>월 목표 {won.format(planning.monthlyTarget)}</small>
                  </article>
                  <article className="plan-summary-card">
                    <span>9월 목표 달성률</span><strong>{metricPercent(planning.monthlyAchievement)}</strong>
                    <div className="goal-progress"><i style={{ width: `${Math.min(planning.monthlyAchievement, 100)}%` }} /></div>
                    <small>남은 목표 {won.format(planning.monthlyRemaining)}</small>
                  </article>
                  <article className="plan-summary-card">
                    <span>현재 {planning.currentPeriod?.name ?? '구간'} 누적 달성률</span><strong>{planning.currentPeriod ? metricPercent(planning.currentPeriod.achievement) : '—'}</strong>
                    <div className="goal-progress"><i style={{ width: `${Math.min(planning.currentPeriod?.achievement ?? 0, 100)}%` }} /></div>
                    <small>실적 {planning.currentPeriod ? won.format(planning.currentPeriod.actualSales) : '—'} / 목표 누적 {planning.currentPeriod ? won.format(planning.currentPeriod.targetToDate) : '—'}</small>
                  </article>
                  <article className="plan-summary-card">
                    <span>현재 구간 남은 목표</span><strong>{planning.currentPeriod ? won.format(planning.currentPeriod.remaining) : '—'}</strong>
                    <small>{planning.currentPeriod ? `${dateLabel(planning.currentPeriod.startDate)}–${dateLabel(planning.currentPeriod.endDate)} · ${planning.currentPeriod.type}` : '오늘 날짜와 일치하는 구간 없음'}</small>
                  </article>
                </div>
                <div className="panel compact-table-panel">
                  <div className="planning-table-scroll">
                    <table className="planning-table">
                      <thead><tr><th>구간</th><th>유형</th><th>기간</th><th>전체 목표</th><th>목표 누적</th><th>실제 누적</th><th>달성률</th><th>남은 목표</th><th>상태</th></tr></thead>
                      <tbody>{planning.periods.map((period) => (
                        <tr key={`${period.name}-${period.type}`} className={period.name === planning.currentPeriod?.name && period.type === planning.currentPeriod?.type ? 'current-plan-row' : ''}>
                          <td><b>{period.name}</b></td><td>{period.type}</td><td>{dateLabel(period.startDate)}–{dateLabel(period.endDate)}</td>
                          <td>{won.format(period.targetSales)}</td><td>{period.elapsedDays > 0 ? won.format(period.targetToDate) : '—'}</td><td>{period.elapsedDays > 0 ? won.format(period.actualSales) : '—'}</td>
                          <td><b className={period.achievement >= 100 ? 'positive' : period.elapsedDays > 0 ? 'attention' : ''}>{period.elapsedDays > 0 ? metricPercent(period.achievement) : '—'}</b></td>
                          <td>{won.format(period.remaining)}</td><td>{period.elapsedDays === 0 ? '예정' : period.achievement >= 100 ? '목표 이상' : '진행중'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="planning-section" id="sku-plan">
                <div className="section-heading">
                  <div><span className="section-kicker">SKU GOAL & DAILY STATUS</span><h2>SKU별 목표 · 오늘 실적</h2></div>
                  <span>03_SKU_PLAN + 05_SKU_DAILY</span>
                </div>
                <div className="sku-plan-grid">
                  {planning.skuPlans.map((sku, index) => {
                    const today = planning.skuDailyToday.find((item) => item.sku === sku.sku);
                    return (
                      <article className="sku-plan-card" key={sku.sku}>
                        <div className="sku-plan-title"><i style={{ background: productColors[index % productColors.length] }} /><div><b>{sku.sku}</b><small>{sku.type}</small></div><span>{today?.status ?? '데이터 대기'}</span></div>
                        <strong>{won.format(sku.actualSales)}</strong><p>9월 누적 실매출 / 목표 {shortWon.format(sku.targetSales)}원</p>
                        <div className="sku-progress-row"><div className="goal-progress"><i style={{ width: `${Math.min(sku.achievement, 100)}%`, background: productColors[index % productColors.length] }} /></div><b>{metricPercent(sku.achievement)}</b></div>
                        <dl>
                          <div><dt>남은 목표</dt><dd>{won.format(sku.remaining)}</dd></div>
                          <div><dt>예상 일매출</dt><dd>{won.format(sku.dailySales)}</dd></div>
                          <div><dt>필요 유입/일</dt><dd>{sku.dailyTraffic.toLocaleString('ko-KR')}</dd></div>
                          <div><dt>목표 CVR</dt><dd>{metricPercent(sku.targetCvr)}</dd></div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
                <div className="today-ga-strip">
                  <div><BarChart3 /><span>오늘 GA 상태</span><b>{planning.todayOverview?.status ?? '데이터 대기'}</b></div>
                  <div><Users /><span>유입</span><b>{planning.todayOverview?.traffic.toLocaleString('ko-KR') ?? '—'}</b></div>
                  <div><ShoppingBag /><span>구매자</span><b>{planning.todayOverview?.buyers.toLocaleString('ko-KR') ?? '—'}</b></div>
                  <div><Gauge /><span>CVR</span><b>{planning.todayOverview ? metricPercent(planning.todayOverview.cvr) : '—'}</b></div>
                </div>
              </section>

              <section className="planning-section ga-section" id="ga-analysis">
                <div className="section-heading">
                  <div><span className="section-kicker">GA D-1 MARKETING</span><h2>GA 매출 원인 분석</h2></div>
                  <a className="source-link" href={GA_DASHBOARD_URL} target="_blank" rel="noreferrer">원본 크게 보기 <ExternalLink /></a>
                </div>
                <div className="ga-frame-shell">
                  <div className="ga-frame-note"><span><i />GA 웹앱 실시간 연결</span><small>전체 · 채널별 · 매출 원인 · 주간 누적</small></div>
                  <iframe src={GA_DASHBOARD_URL} title="놀로스토어 GA D-1 마케팅 대시보드" loading="lazy" />
                </div>
              </section>
            </>
          )}

          <footer className="dashboard-footer"><span>NOLO Commerce Pulse</span><p>자사몰 실매출 + Meta 광고 데이터 · Asia/Seoul</p></footer>
        </>
      ) : null}
    </div>
  );
}
