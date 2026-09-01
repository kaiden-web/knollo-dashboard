'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CircleAlert, Clock3, Gauge, Megaphone,
  RefreshCw, ShoppingBag, Sparkles, Target,
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
  monthlyTarget: number;
  monthToDateSales: number;
  updatedAt: string;
};

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

export function LiveRevenueBoard() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRevenue = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`/api/revenue?client=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('request failed');
      setData(await response.json());
      setError(null);
    } catch {
      setError('시트 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue();
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
      monthlyAchievement: data.monthlyTarget > 0
        ? (data.monthToDateSales / data.monthlyTarget) * 100
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
        <button className="refresh-button" type="button" onClick={() => loadRevenue(true)} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? '불러오는 중' : '지금 새로고침'}
        </button>
      </section>

      {error && <div className="error-banner" role="alert"><CircleAlert /><span>{error}</span><button type="button" onClick={() => loadRevenue(true)}>다시 시도</button></div>}

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
              <div className="metric-label"><span>9월 목표 매출 달성률</span><Target /></div>
              <strong>{metricPercent(summary.monthlyAchievement)}</strong>
              <p>{won.format(data.monthToDateSales)} / {won.format(data.monthlyTarget)}</p>
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
                            <small>광고 {won.format(spend)} · {metricPercent(ratio(spend, sales))}</small>
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
                <thead><tr><th>캠페인</th><th>광고비</th><th>구매</th><th>전환값</th><th>Meta ROAS</th><th>클릭</th></tr></thead>
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
                        <td><b>{metricPercent(campaign.metaRoas)}</b></td>
                        <td>{campaign.clicks.toLocaleString('ko-KR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="product-section" id="product-sales">
            <div className="section-heading">
              <div><span className="section-kicker">7-DAY PRODUCT EFFICIENCY</span><h2>제품별 최근 7일 효율</h2></div>
              <span>{dateLabel(data.days[0].date)} – {dateLabel(data.days[6].date)}</span>
            </div>
            <div className="product-grid">
              {summary.productTotals.map((product) => (
                <article className="product-card" key={product.name}>
                  <div><i style={{ background: product.color }} /><span>{product.name}</span></div>
                  <strong>{won.format(product.sales)}</strong>
                  <dl>
                    <div><dt>광고비</dt><dd>{won.format(product.spend)}</dd></div>
                    <div><dt>광고비율</dt><dd>{metricPercent(product.adRatio)}</dd></div>
                    <div><dt>실ROAS</dt><dd>{metricPercent(product.realRoas)}</dd></div>
                  </dl>
                  <small>{shortWon.format(product.sales)}원 매출</small>
                </article>
              ))}
            </div>
          </section>

          <footer className="dashboard-footer"><span>NOLO Commerce Pulse</span><p>자사몰 실매출 + Meta 광고 데이터 · Asia/Seoul</p></footer>
        </>
      ) : null}
    </div>
  );
}
