const SPREADSHEET_ID = '1E9p9jLsV4ovNIv3QG_oWcTUwHAgiJvReYOG8PIrBdqw';

const PERIOD_CSV_URL = sheetCsvUrl(1977264821, 'A4:L25');
const SKU_PLAN_CSV_URL = sheetCsvUrl(1548981010, 'A4:I20');
const DAILY_INPUT_CSV_URL = sheetCsvUrl(682452514, 'A4:M40');
const SKU_DAILY_CSV_URL = sheetCsvUrl(1556490613, 'A4:K160');

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
    const [periodCsv, skuPlanCsv, dailyCsv, skuDailyCsv] = await Promise.all([
      fetchCsv(PERIOD_CSV_URL), fetchCsv(SKU_PLAN_CSV_URL),
      fetchCsv(DAILY_INPUT_CSV_URL), fetchCsv(SKU_DAILY_CSV_URL),
    ]);
    const today = kstToday();

    const periodRows = records(periodCsv);
    const periods = periodRows.body.flatMap((row) => {
      const name = row[periodRows.index['구간']]?.trim();
      const type = row[periodRows.index['유형']]?.trim();
      const startDate = toIsoDate(row[periodRows.index['시작일']]);
      const endDate = toIsoDate(row[periodRows.index['종료일']]);
      if (!name || !type || !startDate || !endDate) return [];
      return [{
        name, type, startDate, endDate,
        days: numberFromCell(row[periodRows.index['일수']]),
        targetSales: numberFromCell(row[periodRows.index['목표매출']]),
        dailyTarget: numberFromCell(row[periodRows.index['일 목표매출']]),
        targetDau: numberFromCell(row[periodRows.index['목표 DAU']]),
        targetCvr: numberFromCell(row[periodRows.index['목표 CVR']]),
        targetAov: numberFromCell(row[periodRows.index['목표 AOV']]),
        driverDailySales: numberFromCell(row[periodRows.index['Driver 예상 일매출']]),
        driverVsTarget: numberFromCell(row[periodRows.index['Driver vs 목표']]),
      }];
    });

    const skuRows = records(skuPlanCsv);
    const skuPlans = skuRows.body.flatMap((row) => {
      const sku = row[skuRows.index['SKU']]?.trim();
      const type = row[skuRows.index['유형']]?.trim();
      if (!sku || type !== '핵심 SKU') return [];
      return [{
        sku, type,
        targetSales: numberFromCell(row[skuRows.index['목표 매출']]),
        dailyTraffic: numberFromCell(row[skuRows.index['필요 유입/일']]),
        targetCvr: numberFromCell(row[skuRows.index['목표 CVR']]),
        targetAov: numberFromCell(row[skuRows.index['목표 AOV']]),
        buyers: numberFromCell(row[skuRows.index['필요 구매자수']]),
        dailySales: numberFromCell(row[skuRows.index['예상 일매출']]),
        monthlySales: numberFromCell(row[skuRows.index['예상 월매출']]),
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
    return Response.json({
      today, periods, currentPeriod, skuPlans, todayOverview, skuDailyToday,
      monthlyTarget: periods.reduce((sum, period) => sum + period.targetSales, 0),
      updatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Failed to load planning data', error);
    return Response.json({ message: '기간·SKU 계획 데이터를 불러오지 못했습니다.' }, {
      status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}
