const SPREADSHEET_ID = '1E9p9jLsV4ovNIv3QG_oWcTUwHAgiJvReYOG8PIrBdqw';

const PERIOD_CSV_URL = sheetCsvUrl(1977264821, 'A4:L25');
const SKU_PLAN_CSV_URL = sheetCsvUrl(1548981010, 'A4:I20');
const DAILY_INPUT_CSV_URL = sheetCsvUrl(682452514, 'A4:M40');
const SKU_DAILY_CSV_URL = sheetCsvUrl(1556490613, 'A4:K160');
const SALES_CSV_URL = sheetCsvUrl(679036495, 'N4:V35');

const SKU_SALES_COLUMNS: Record<string, string> = {
  '멀티핏': '멀티핏',
  '브레스핏': '브레스핏',
  '하네스 세트': '하네스&리쉬',
  '허니콤츄': '허니콤츄',
};

function sheetCsvUrl(gid: number, range: string) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&range=${range}`;
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function numberFromCell(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: string | undefined) {
  if (!value) return null;
  const parts = value.trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : null;
}

function kstToday() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function fetchCsv(url: string) {
  const response = await fetch(`${url}&refresh=${Date.now()}`, {
    cache: 'no-store', headers: { Accept: 'text/csv' },
  });
  if (!response.ok) throw new Error(`Google Sheets responded with ${response.status}`);
  return parseCsv(await response.text());
}

function records(rows: string[][]) {
  const [header = [], ...body] = rows;
  const index = Object.fromEntries(header.map((name, column) => [name.trim(), column]));
  return { body, index };
}

export async function GET() {
  try {
    const [periodCsv, skuPlanCsv, dailyCsv, skuDailyCsv, salesCsv] = await Promise.all([
      fetchCsv(PERIOD_CSV_URL), fetchCsv(SKU_PLAN_CSV_URL),
      fetchCsv(DAILY_INPUT_CSV_URL), fetchCsv(SKU_DAILY_CSV_URL), fetchCsv(SALES_CSV_URL),
    ]);
    const today = kstToday();

    const salesRows = records(salesCsv);
    const actualByDate = new Map<string, { total: number; products: Record<string, number> }>();
    for (const row of salesRows.body) {
      const date = toIsoDate(row[salesRows.index['일자']]);
      if (!date || date > today) continue;
      const products = Object.fromEntries(
        Object.entries(SKU_SALES_COLUMNS).map(([sku, column]) => [sku, numberFromCell(row[salesRows.index[column]])]),
      );
      actualByDate.set(date, { total: numberFromCell(row[salesRows.index['매출']]), products });
    }

    const periodRows = records(periodCsv);
    const periods = periodRows.body.flatMap((row) => {
      const name = row[periodRows.index['구간']]?.trim();
      const type = row[periodRows.index['유형']]?.trim();
      const startDate = toIsoDate(row[periodRows.index['시작일']]);
      const endDate = toIsoDate(row[periodRows.index['종료일']]);
      if (!name || !type || !startDate || !endDate) return [];
      const actualSales = [...actualByDate.entries()]
        .filter(([date]) => date >= startDate && date <= endDate)
        .reduce((sum, [, value]) => sum + value.total, 0);
      const elapsedDays = today < startDate ? 0 : Math.min(
        Number(row[periodRows.index['일수']]) || 0,
        Math.floor((new Date(`${today < endDate ? today : endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1,
      );
      const dailyTarget = numberFromCell(row[periodRows.index['일 목표매출']]);
      const targetSales = numberFromCell(row[periodRows.index['목표매출']]);
      const targetToDate = dailyTarget * elapsedDays;
      return [{
        name, type, startDate, endDate,
        days: numberFromCell(row[periodRows.index['일수']]),
        targetSales, dailyTarget,
        targetDau: numberFromCell(row[periodRows.index['목표 DAU']]),
        targetCvr: numberFromCell(row[periodRows.index['목표 CVR']]),
        targetAov: numberFromCell(row[periodRows.index['목표 AOV']]),
        driverDailySales: numberFromCell(row[periodRows.index['Driver 예상 일매출']]),
        driverVsTarget: numberFromCell(row[periodRows.index['Driver vs 목표']]),
        actualSales, elapsedDays, targetToDate,
        achievement: targetToDate > 0 ? (actualSales / targetToDate) * 100 : 0,
        remaining: Math.max(targetSales - actualSales, 0),
      }];
    });

    const skuRows = records(skuPlanCsv);
    const skuPlans = skuRows.body.flatMap((row) => {
      const sku = row[skuRows.index['SKU']]?.trim();
      const type = row[skuRows.index['유형']]?.trim();
      if (!sku || type !== '핵심 SKU' || sku === '에너지핏') return [];
      const actualSales = [...actualByDate.entries()]
        .filter(([date]) => date.startsWith(today.slice(0, 7)))
        .reduce(
          (sum, [, value]) => sum + (value.products[sku] ?? 0), 0,
      );
      const targetSales = numberFromCell(row[skuRows.index['목표 매출']]);
      return [{
        sku, type,
        targetSales,
        dailyTraffic: numberFromCell(row[skuRows.index['필요 유입/일']]),
        targetCvr: numberFromCell(row[skuRows.index['목표 CVR']]),
        targetAov: numberFromCell(row[skuRows.index['목표 AOV']]),
        buyers: numberFromCell(row[skuRows.index['필요 구매자수']]),
        dailySales: numberFromCell(row[skuRows.index['예상 일매출']]),
        monthlySales: numberFromCell(row[skuRows.index['예상 월매출']]),
        actualSales,
        achievement: targetSales > 0 ? (actualSales / targetSales) * 100 : 0,
        remaining: Math.max(targetSales - actualSales, 0),
      }];
    });

    const dailyRows = records(dailyCsv);
    const todayDaily = dailyRows.body.find((row) => toIsoDate(row[dailyRows.index['날짜']]) === today);
    const todayOverview = todayDaily ? {
      totalSales: numberFromCell(todayDaily[dailyRows.index['총매출']]),
      traffic: numberFromCell(todayDaily[dailyRows.index['유입']]),
      buyers: numberFromCell(todayDaily[dailyRows.index['구매자수']]),
      cvr: numberFromCell(todayDaily[dailyRows.index['CVR']]),
      aov: numberFromCell(todayDaily[dailyRows.index['AOV']]),
      status: todayDaily[dailyRows.index['GA 데이터 상태']]?.trim() || '잠정',
    } : null;

    const skuDailyRows = records(skuDailyCsv);
    const skuDailyToday = skuDailyRows.body.flatMap((row) => {
      const date = toIsoDate(row[skuDailyRows.index['날짜']]);
      const sku = row[skuDailyRows.index['SKU']]?.trim();
      if (date !== today || !sku) return [];
      return [{
        sku,
        traffic: numberFromCell(row[skuDailyRows.index['유입']]),
        buyers: numberFromCell(row[skuDailyRows.index['구매자수']]),
        sales: numberFromCell(row[skuDailyRows.index['매출']]),
        firstPurchaseSales: numberFromCell(row[skuDailyRows.index['첫구매 매출']]),
        repeatPurchaseSales: numberFromCell(row[skuDailyRows.index['재구매 매출']]),
        cvr: numberFromCell(row[skuDailyRows.index['CVR']]),
        aov: numberFromCell(row[skuDailyRows.index['AOV']]),
        status: row[skuDailyRows.index['GA 데이터 상태']]?.trim() || '잠정',
      }];
    });

    const currentPeriod = periods.find((period) => today >= period.startDate && today <= period.endDate) ?? null;
    const monthActual = [...actualByDate.entries()]
      .filter(([date]) => date.startsWith(today.slice(0, 7)))
      .reduce((sum, [, value]) => sum + value.total, 0);
    const monthlyTarget = periods.reduce((sum, period) => sum + period.targetSales, 0);
    return Response.json({
      today, periods, currentPeriod, skuPlans, todayOverview, skuDailyToday,
      monthlyTarget, monthActual,
      monthlyAchievement: monthlyTarget > 0 ? (monthActual / monthlyTarget) * 100 : 0,
      monthlyRemaining: Math.max(monthlyTarget - monthActual, 0),
      updatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Failed to load planning data', error);
    return Response.json({ message: '기간·SKU 계획 데이터를 불러오지 못했습니다.' }, {
      status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}
