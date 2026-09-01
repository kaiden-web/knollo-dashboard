import { Sparkles } from 'lucide-react';
import { LiveRevenueBoard } from '@/components/live-revenue-board';

export default function Home() {
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#live-sales" aria-label="놀로 커머스 실시간 매출 홈">
          <span className="brand-mark"><Sparkles aria-hidden="true" /></span>
          <span><b>NOLO</b><small>Commerce pulse</small></span>
        </a>
        <nav aria-label="대시보드 메뉴">
          <a className="active" href="#live-sales">통합 현황</a>
          <a href="#daily-sales">일자별 제품</a>
          <a href="#campaigns">Meta 캠페인</a>
          <a href="#product-sales">제품 효율</a>
          <a href="#period-plan">기간 목표</a>
          <a href="#sku-plan">SKU 목표</a>
          <a href="#ga-analysis">GA 분석</a>
        </nav>
        <span className="sheet-status"><i />매출·Meta 연결</span>
      </header>

      <LiveRevenueBoard />
    </main>
  );
}
