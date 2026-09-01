const SPREADSHEET_ID = '1E9p9jLsV4ovNIv3QG_oWcTUwHAgiJvReYOG8PIrBdqw';
const SALES_CSV_URL = sheetCsvUrl(679036495, 'N4:V35');
const PRODUCT_AD_CSV_URL = sheetCsvUrl(1238252641, 'A2:C1200');
const CAMPAIGN_CSV_URL = sheetCsvUrl(1238252641, 'Q2:W1200');

const PRODUCT_COLUMNS = [
  '허니콤츄',
  '멀티핏',
  '브레스핏',
  '하네스&리쉬',
  '[양치 꿀조합 SET]',
  '퍼즐 패드',
] as const;

type ProductName = (typeof PRODUCT_COLUMNS)[number];
type ProductValues = Record<ProductName, number>;

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

function toIsoDate(value: string) {
  const normalized = value.trim();
  const parts = normalized.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (parts) return `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
  const serial = Number(normalized);
  if (Number.isFinite(serial) && serial > 30_000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }
  return null;
}

function numberFromCell(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyProducts() {
  return Object.fromEntries(PRODUCT_COLUMNS.map((name) => [name, 0])) as ProductValues;
}

function kstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function previousDates(today: string, count: number) {
  const [year, month, day] = today.split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

async function fetchCsv(url: string) {
  const response = await fetch(`${url}&refresh=${Date.now()}`, {
    cache: 'no-store', headers: { Accept: 'text/csv' },
  });
  if (!response.ok) throw new Error(`Google Sheets responded with ${response.status}`);
  return parseCsv(await response.text());
}

export async function GET() {
  try {
    const [salesCsv, productAdCsv, campaignCsv] = await Promise.all([
      fetchCsv(SALES_CSV_URL), fetchCsv(PRODUCT_AD_CSV_URL), fetchCsv(CAMPAIGN_CSV_URL),
    ]);

    const [salesHeader = [], ...salesRows] = salesCsv;
    const salesIndex = Object.fromEntries(salesHeader.map((name, index) => [name.trim(), index]));
    const salesByDate = new Map<string, { total: number; target: number; products: ProductValues }>();
    for (const row of salesRows) {
      const date = toIsoDate(row[salesIndex['일자']] ?? '');
      if (!date) continue;
      const products = Object.fromEntries(
        PRODUCT_COLUMNS.map((name) => [name, numberFromCell(row[salesIndex[name]])]),
      ) as ProductValues;
      salesByDate.set(date, {
        total: numberFromCell(row[salesIndex['매출']]),
        target: numberFromCell(row[salesIndex['목표매출']]),
        products,
      });
    }

    const [adHeader = [], ...adRows] = productAdCsv;
    const adIndex = Object.fromEntries(adHeader.map((name, index) => [name.trim(), index]));
    const adsByDate = new Map<string, ProductValues>();
    for (const row of adRows) {
      const date = toIsoDate(row[adIndex['날짜']] ?? '');
      const product = row[adIndex['제품']]?.trim() as ProductName | undefined;
      if (!date || !product || !PRODUCT_COLUMNS.includes(product)) continue;
      const products = adsByDate.get(date) ?? emptyProducts();
      products[product] += numberFromCell(row[adIndex['광고비']]);
      adsByDate.set(date, products);
    }

    const [campaignHeader = [], ...campaignRows] = campaignCsv;
    const campaignIndex = Object.fromEntries(campaignHeader.map((name, index) => [name.trim(), index]));
    const campaigns = campaignRows.flatMap((row) => {
      const date = toIsoDate(row[campaignIndex['날짜']] ?? '');
      const name = row[campaignIndex['캠페인']]?.trim();
      if (!date || !name) return [];
      const spend = numberFromCell(row[campaignIndex['광고비']]);
      const conversionValue = numberFromCell(row[campaignIndex['전환값']]);
      return [{
        date, name, spend,
        purchases: numberFromCell(row[campaignIndex['구매']]),
        conversionValue,
        clicks: numberFromCell(row[campaignIndex['고유링크클릭']]),
        impressions: numberFromCell(row[campaignIndex['노출']]),
        metaRoas: spend > 0 ? (conversionValue / spend) * 100 : null,
      }];
    });

    const today = kstDateParts();
    const todayTarget = salesByDate.get(today)?.target ?? 0;
    const days = previousDates(today, 7).map((date) => {
      const sales = salesByDate.get(date);
      return {
        date,
        available: Boolean(sales),
        total: sales?.total ?? null,
        products: sales?.products ?? null,
        adSpend: adsByDate.get(date) ?? emptyProducts(),
      };
    });
    const metaLatestDate = [...new Set([
      ...Array.from(adsByDate.keys()), ...campaigns.map((campaign) => campaign.date),
    ])].sort().at(-1) ?? null;

    return Response.json(
      {
        today, days, campaigns, metaLatestDate, productNames: PRODUCT_COLUMNS,
        todayTarget, updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Failed to load commerce data', error);
    return Response.json(
      { message: '실시간 매출·광고 데이터를 불러오지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
