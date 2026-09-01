const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1E9p9jLsV4ovNIv3QG_oWcTUwHAgiJvReYOG8PIrBdqw/gviz/tq?tqx=out:csv&gid=679036495&range=N4:V35';

const PRODUCT_COLUMNS = [
  '허니콤츄',
  '멀티핏',
  '브레스핏',
  '하네스&리쉬',
  '[양치 꿀조합 SET]',
  '퍼즐 패드',
] as const;

type ProductName = (typeof PRODUCT_COLUMNS)[number];

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
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toIsoDate(value: string) {
  const parts = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!parts) return null;
  return `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
}

function numberFromCell(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function kstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

export async function GET() {
  try {
    const response = await fetch(`${SHEET_CSV_URL}&refresh=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'text/csv' },
    });
    if (!response.ok) throw new Error(`Google Sheets responded with ${response.status}`);

    const [header = [], ...rows] = parseCsv(await response.text());
    const columnIndex = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
    const byDate = new Map<string, { total: number; products: Record<ProductName, number> }>();

    for (const row of rows) {
      const date = toIsoDate(row[columnIndex['일자']] ?? '');
      if (!date) continue;
      const products = Object.fromEntries(
        PRODUCT_COLUMNS.map((name) => [name, numberFromCell(row[columnIndex[name]])]),
      ) as Record<ProductName, number>;
      byDate.set(date, { total: numberFromCell(row[columnIndex['매출']]), products });
    }

    const today = kstDateParts();
    const days = previousDates(today, 7).map((date) => {
      const source = byDate.get(date);
      return source
        ? { date, available: true, ...source }
        : { date, available: false, total: null, products: null };
    });

    return Response.json(
      { today, days, productNames: PRODUCT_COLUMNS, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Failed to load live revenue', error);
    return Response.json(
      { message: '실시간 매출 데이터를 불러오지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
