'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChartNoAxesCombined, CircleAlert, Clock3, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';

type Day = { date: string; available: boolean; total: number | null; products: Record<string, number> | null };
type RevenueResponse = { today: string; days: Day[]; productNames: string[]; updatedAt: string };

const productColors = ['#6758f3', '#2a78d6', '#24a779', '#e39b43', '#d86d9c', '#726b84'];
const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const shortWon = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

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
    const productTotals = data.productNames.map((name, index) => ({
      name, color: productColors[index],
      total: availableDays.reduce((sum, day) => sum + (day.products?.[name] ?? 0), 0),
    }));
    const maxProduct = Math.max(...productTotals.map((product) => product.total), 1);
    const rankedProducts = [...productTotals].sort((a, b) => b.total - a.total);
    return {
      today,
      availableDays: availableDays.length,
      sevenDayTotal: availableDays.reduce((sum, day) => sum + (day.total ?? 0), 0),
      productTotals, rankedProducts, maxProduct,
    };
  }, [data]);

  return (
    <div className="content" id="live-sales">
      <section className="hero-row">
        <div>
          <p className="eyebrow">SEPTEMBER · LIVE COMMERCE</p>
          <h1>오늘을 포함한 최근 7일 실시간 매출</h1>
          <p>Google Sheets에 매출이 입력되면 최대 60초 안에 이 화면에 반영됩니다.</p>
        </div>
        <button className="refresh-button" type="button" onClick={() => loadRevenue(true)} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? '불러오는 중' : '지금 새로고침'}
        </button>
      </section>

      {error && <div className="error-banner" role="alert"><CircleAlert /><span>{error}</span><button type="button" onClick={() => loadRevenue(true)}>다시 시도</button></div>}

      {loading && !data ? (
        <section className="loading-panel" aria-live="polite"><RefreshCw className="spin" /><span>실시간 매출을 불러오고 있어요…</span></section>
      ) : data && summary ? (
        <>
          <section className="metrics" aria-label="실시간 매출 핵심 지표">
            <article className="metric-card accent-card">
              <div className="metric-label"><span>오늘 매출</span><ShoppingBag /></div>
              <strong>{summary.today?.available ? won.format(summary.today.total ?? 0) : '집계 전'}</strong>
              <p><i />{dateLabel(data.today, true)} 진행중</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>최근 7일 매출</span><ChartNoAxesCombined /></div>
              <strong>{won.format(summary.sevenDayTotal)}</strong>
              <p>{summary.availableDays}일 입력 데이터 합계</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>매출 1위 제품</span><Sparkles /></div>
              <strong className="product-winner">{summary.rankedProducts[0]?.name ?? '—'}</strong>
              <p>{won.format(summary.rankedProducts[0]?.total ?? 0)}</p>
            </article>
            <article className="metric-card">
              <div className="metric-label"><span>조회 기간</span><CalendarDays /></div>
              <strong className="date-range">{dateLabel(data.days[0].date)} – {dateLabel(data.days[6].date)}</strong>
              <p>매일 자정 자동 롤오버</p>
            </article>
          </section>

          <section className="panel daily-panel" id="daily-sales">
            <div className="panel-heading">
              <div><span className="section-kicker">DAILY PRODUCT REVENUE</span><h2>제품별 실시간 일자별 매출</h2></div>
              <div className="live-meta"><span className="live-pill"><i />60초 자동 갱신</span><span><Clock3 />{timeLabel(data.updatedAt)} 기준</span></div>
            </div>
            <div className="revenue-table-scroll">
              <table className="revenue-table">
                <thead><tr><th>일자</th>{data.productNames.map((name, index) => <th key={name}><i style={{ background: productColors[index] }} />{name}</th>)}<th>전체 매출</th></tr></thead>
                <tbody>
                  {[...data.days].reverse().map((day) => (
                    <tr key={day.date} className={day.date === data.today ? 'today-row' : ''}>
                      <td><b>{dateLabel(day.date, true)}</b>{day.date === data.today && <span className="today-badge">오늘</span>}</td>
                      {data.productNames.map((name) => <td key={name} className={!day.available ? 'empty-cell' : ''}>{day.available ? won.format(day.products?.[name] ?? 0) : '—'}</td>)}
                      <td className="row-total">{day.available ? won.format(day.total ?? 0) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footnote"><span><i />오늘 수치는 주문 반영에 따라 계속 변합니다.</span>{summary.availableDays < 7 && <span>9월 집계 시작 전 날짜는 ‘—’로 표시됩니다.</span>}</div>
          </section>

          <section className="product-section" id="product-sales">
            <div className="section-heading"><div><span className="section-kicker">7-DAY PRODUCT MIX</span><h2>제품별 최근 7일 합계</h2></div><span>{dateLabel(data.days[0].date)} – {dateLabel(data.days[6].date)}</span></div>
            <div className="product-grid">
              {summary.productTotals.map((product) => (
                <article className="product-card" key={product.name}>
                  <div><i style={{ background: product.color }} /><span>{product.name}</span></div>
                  <strong>{won.format(product.total)}</strong>
                  <div className="product-bar"><i style={{ width: `${(product.total / summary.maxProduct) * 100}%`, background: product.color }} /></div>
                  <small>{shortWon.format(product.total)}원</small>
                </article>
              ))}
            </div>
          </section>

          <footer className="dashboard-footer"><span>NOLO Commerce Pulse</span><p>Google Sheets RAW 요약 데이터 · Asia/Seoul</p></footer>
        </>
      ) : null}
    </div>
  );
}
