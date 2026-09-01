import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Gauge,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const dailyRevenue = [4.05, 6.23, 4.79, 6.87, 7.63, 5.39, 4.83];
const dailyAdSpend = [0.98, 1.25, 1.36, 1.15, 1.01, 1.54, 0.32];
const dates = ['8/19', '8/20', '8/21', '8/22', '8/23', '8/24', '8/25'];

const products = [
  { name: '허니콤츄', revenue: '₩5.35M', spend: '₩1.21M', roas: 442, share: 100, color: '#6758f3', status: '매출 견인' },
  { name: '하네스', revenue: '₩1.80M', spend: '₩568.8K', roas: 316, share: 34, color: '#e6a357', status: '안정' },
  { name: '멀티핏', revenue: '₩1.72M', spend: '₩125.0K', roas: 1372, share: 32, color: '#2a78d6', status: '고효율' },
  { name: '에너지핏', revenue: '₩783.8K', spend: '₩20.0K', roas: 3914, share: 15, color: '#d86d9c', status: '학습 필요' },
  { name: '브레스핏', revenue: '₩655.5K', spend: '₩1.20M', roas: 54, share: 12, color: '#24a779', status: '점검 필요' },
];

const campaigns = [
  { name: '26년 8월 출석체크_260824', spend: '₩52,034', budget: '₩50,000', pace: 104.1, ctr: '2.20%', purchases: 12, value: '₩837,098', roas: '1,608.8%' },
  { name: '첫구매 ASC', spend: '₩71,504', budget: '₩50,000', pace: 143, ctr: '1.53%', purchases: 14, value: '₩1,079,515', roas: '1,509.7%' },
  { name: 'PB 고효율', spend: '₩116,166', budget: '₩200,000', pace: 58.1, ctr: '3.01%', purchases: 18, value: '₩942,080', roas: '811.0%' },
  { name: '디자인팀', spend: '₩54,508', budget: '₩200,000', pace: 27.3, ctr: '2.69%', purchases: 4, value: '₩374,080', roas: '686.3%' },
  { name: '허니콤츄 고효율', spend: '₩61,858', budget: '₩100,000', pace: 61.9, ctr: '1.39%', purchases: 12, value: '₩351,993', roas: '569.0%' },
];

const points = (values: number[], max: number, height = 176) =>
  values
    .map((value, index) => `${index * (620 / 6)},${height - (value / max) * 140}`)
    .join(' ');

function MetricCard({
  label,
  value,
  note,
  trend,
  positive = true,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  trend: string;
  positive?: boolean;
  icon: typeof ShoppingBag;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon"><Icon aria-hidden="true" /></span>
      </div>
      <strong>{value}</strong>
      <div className="metric-foot">
        <span className={positive ? 'trend positive' : 'trend negative'}>
          {positive ? <ArrowUpRight /> : <ArrowDownRight />}
          {trend}
        </span>
        <span>{note}</span>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="놀로 커머스 홈">
          <span className="brand-mark"><Sparkles /></span>
          <span><b>NOLO</b><small>Commerce pulse</small></span>
        </a>
        <nav aria-label="대시보드 메뉴">
          <a className="active" href="#overview">오늘의 성과</a>
          <a href="#products">제품 분석</a>
          <a href="#campaigns">캠페인</a>
          <a href="#operations">운영 로그</a>
        </nav>
        <div className="top-actions">
          <span className="live-pill"><i />Meta 연동 정상</span>
          <button className="date-button" type="button"><CalendarDays />8월 19일 – 25일</button>
        </div>
      </header>

      <div className="content" id="overview">
        <section className="page-heading">
          <div>
            <p className="eyebrow">WEEKLY COMMERCE BRIEF</p>
            <h1>이번 주, 무엇이 매출을 움직였나요?</h1>
            <p>실매출과 광고 효율을 한 화면에서 비교하고, 지금 필요한 액션을 확인하세요.</p>
          </div>
          <button className="refresh-button" type="button"><RefreshCw />데이터 새로고침</button>
        </section>

        <section className="metrics" aria-label="핵심 지표">
          <MetricCard label="누적 실매출" value="₩39.78M" trend="+8.4%" note="직전 7일 대비" icon={ShoppingBag} />
          <MetricCard label="총 광고비" value="₩7.63M" trend="-11.2%" note="직전 7일 대비" icon={WalletCards} />
          <MetricCard label="블렌디드 ROAS" value="521%" trend="+74%p" note="광고비 대비 실매출" icon={Gauge} />
          <MetricCard label="8/25 진행 매출" value="₩4.83M" trend="-10.4%" note="전일 확정치 대비" icon={RefreshCw} positive={false} />
        </section>

        <section className="overview-grid">
          <article className="panel revenue-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">PERFORMANCE</span><h2>매출과 광고비 흐름</h2></div>
              <div className="legend"><span><i className="revenue-dot" />실매출</span><span><i className="spend-dot" />광고비</span></div>
            </div>
            <div className="chart-wrap" aria-label="8월 19일부터 25일까지 매출과 광고비 추이">
              <div className="chart-y"><span>₩8M</span><span>₩6M</span><span>₩4M</span><span>₩2M</span><span>₩0</span></div>
              <svg viewBox="0 0 620 196" role="img" aria-label="일별 실매출과 광고비 선 그래프">
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d5dfc" stopOpacity=".28"/><stop offset="1" stopColor="#6d5dfc" stopOpacity="0"/></linearGradient>
                </defs>
                {[36, 71, 106, 141, 176].map((y) => <line key={y} x1="0" x2="620" y1={y} y2={y} className="grid-line" />)}
                <polygon points={`0,176 ${points(dailyRevenue, 8)} 620,176`} fill="url(#revenueFill)" />
                <polyline points={points(dailyRevenue, 8)} className="revenue-line" />
                <polyline points={points(dailyAdSpend, 2)} className="spend-line" />
                {dailyRevenue.map((value, i) => <circle key={i} cx={i * (620 / 6)} cy={176 - (value / 8) * 140} r="4" className="revenue-point" />)}
              </svg>
              <div className="chart-x">{dates.map((date) => <span key={date}>{date}</span>)}</div>
            </div>
          </article>

          <aside className="panel action-panel">
            <div className="panel-heading"><div><span className="section-kicker">ACTION CENTER</span><h2>오늘 확인할 것</h2></div><span className="count-badge">3</span></div>
            <div className="action-list">
              <div className="action-item critical"><span className="action-icon"><CircleAlert /></span><div><b>날짜 롤오버 지연</b><p>대시보드가 아직 8/25 진행중으로 표시됩니다.</p><a href="#operations">자세히 보기</a></div></div>
              <div className="action-item warning"><span className="action-icon"><Gauge /></span><div><b>첫구매 ASC 예산 초과</b><p>소진율 143% · ROAS 1,509.7%</p><a href="#campaigns">캠페인 확인</a></div></div>
              <div className="action-item success"><span className="action-icon"><Sparkles /></span><div><b>허니콤츄 매출 견인</b><p>7일 실매출 ₩5.35M · 실ROAS 442%</p><a href="#products">제품 분석</a></div></div>
            </div>
          </aside>
        </section>

        <section className="detail-section" id="products">
          <div className="section-heading">
            <div><span className="section-kicker">PRODUCT INTELLIGENCE</span><h2>제품별 성과</h2><p>매출 규모와 실제 광고 효율을 함께 비교합니다.</p></div>
            <span className="data-note">8/25 매출은 진행중 수치</span>
          </div>
          <div className="product-layout">
            <article className="panel product-ranking">
              <div className="ranking-head"><span>제품</span><span>7일 실매출</span><span>실ROAS</span></div>
              {products.map((product, index) => (
                <div className="product-row" key={product.name}>
                  <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="product-name"><i style={{ background: product.color }} /><div><b>{product.name}</b><small>{product.status}</small></div></div>
                  <div className="bar-cell"><b>{product.revenue}</b><span><i style={{ width: `${product.share}%`, background: product.color }} /></span></div>
                  <div className="roas-cell"><b>{product.roas.toLocaleString()}%</b><small>광고비 {product.spend}</small></div>
                </div>
              ))}
            </article>
            <aside className="panel product-focus">
              <span className="section-kicker">FOCUS PRODUCT</span>
              <div className="focus-title"><span>HC</span><div><h3>허니콤츄</h3><p>이번 주 매출 기여 1위</p></div></div>
              <div className="focus-number"><strong>₩5.35M</strong><span>7일 실매출</span></div>
              <dl><div><dt>광고비</dt><dd>₩1.21M</dd></div><div><dt>실ROAS</dt><dd>442%</dd></div><div><dt>8/25 매출</dt><dd>₩1.85M</dd></div></dl>
              <p className="focus-insight"><Sparkles />8/25 매출이 8/24보다 9.7% 증가했습니다. 진행중 수치임을 감안하면 추가 상승 여지가 있습니다.</p>
            </aside>
          </div>
        </section>

        <section className="detail-section" id="campaigns">
          <div className="section-heading">
            <div><span className="section-kicker">CAMPAIGN CONTROL</span><h2>캠페인 현황</h2><p>효율과 예산 소진 속도를 기준으로 우선순위를 정리했습니다.</p></div>
            <span className="live-pill"><i />Meta 실시간</span>
          </div>
          <article className="panel campaign-table">
            <Table>
              <TableHeader><TableRow><TableHead>캠페인</TableHead><TableHead>광고비 / 일예산</TableHead><TableHead>소진율</TableHead><TableHead>CTR</TableHead><TableHead>구매</TableHead><TableHead>전환값</TableHead><TableHead className="text-right">ROAS</TableHead></TableRow></TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.name}>
                    <TableCell className="campaign-name">{campaign.name}</TableCell>
                    <TableCell><b>{campaign.spend}</b><small>{campaign.budget}</small></TableCell>
                    <TableCell className="pace-cell"><div><Progress value={Math.min(campaign.pace, 100)} /><span className={campaign.pace > 100 ? 'over' : ''}>{campaign.pace}%</span></div></TableCell>
                    <TableCell>{campaign.ctr}</TableCell><TableCell>{campaign.purchases}건</TableCell><TableCell>{campaign.value}</TableCell><TableCell className="roas-highlight text-right">{campaign.roas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="table-summary"><span>상위 5개 캠페인</span><b>광고비 ₩356,070</b><b>구매 60건</b><b>전환값 ₩3.58M</b></div>
          </article>
        </section>

        <section className="detail-section operations" id="operations">
          <div className="section-heading"><div><span className="section-kicker">OPERATIONS</span><h2>운영 상태와 기록</h2><p>긴 자동화 로그는 접어두고, 필요한 이슈만 빠르게 확인합니다.</p></div></div>
          <div className="operations-grid">
            <article className="panel status-card"><div className="status-light warning"><CircleAlert /></div><div><span>확인 필요</span><h3>매출 데이터 날짜 롤오버</h3><p>1번 탭은 계속 ‘8/25 진행중’, 확정 매출 카드는 8/24 값을 표시하고 있습니다.</p><small>2026-08-26 16:17 KST 기준</small></div></article>
            <article className="panel status-card"><div className="status-light healthy"><RefreshCw /></div><div><span>정상</span><h3>Meta 광고 데이터 연동</h3><p>캠페인 10개 라인의 실시간 광고비와 전환값이 반영되었습니다.</p><small>최근 조회 2026-08-26 15:54 KST</small></div></article>
          </div>
          <details className="panel log-details"><summary><span><b>자동화 실행 기록</b><small>최근 코멘트와 배포 이슈 보기</small></span><span>펼치기</span></summary><div className="log-content"><article><time>13:54</time><div><b>아티팩트 재배포 확인 필요</b><p>콘텐츠 호스트 네트워크 허용 목록 문제로 최신 버전을 읽지 못했습니다. 관리 환경 설정에서 관련 도메인 접근을 확인해야 합니다.</p></div></article><article><time>16:17</time><div><b>경량 매출 소스 통합</b><p>SKU별 실매출 분해가 반영되었으며, 광고비는 Meta 실시간·실매출은 팀 확정 입력 기준입니다.</p></div></article></div></details>
        </section>

        <footer className="dashboard-footer"><span>NOLO Commerce Pulse</span><p>마지막 자동 갱신 · 2026-08-26 16:17 Asia/Seoul</p></footer>
      </div>
    </main>
  );
}
