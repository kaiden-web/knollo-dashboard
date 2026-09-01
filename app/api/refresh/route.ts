export async function POST() {
  const refreshUrl = process.env.APPS_SCRIPT_REFRESH_URL;
  const refreshSecret = process.env.APPS_SCRIPT_REFRESH_SECRET;

  if (!refreshUrl || !refreshSecret) {
    return Response.json(
      { message: '원본 데이터 수집 연결이 아직 설정되지 않았습니다.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }

  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: refreshSecret }),
      cache: 'no-store',
    });
    const payload = await response.json() as {
      ok?: boolean;
      skipped?: boolean;
      error?: string;
      message?: string;
      completedAt?: string;
    };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || payload.error || `refresh failed (${response.status})`);
    }

    return Response.json(
      { ok: true, skipped: Boolean(payload.skipped), completedAt: payload.completedAt ?? null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Failed to refresh source data', error);
    return Response.json(
      { message: '원본 데이터 수집을 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
