export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scriptUrl = searchParams.get("scriptUrl");
  const sheetId = searchParams.get("sheetId");

  if (!scriptUrl || !sheetId) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const res = await fetch(`${scriptUrl}?sheetId=${sheetId}`, {
      redirect: "follow",
    });
    if (!res.ok) {
      return Response.json(
        { error: `Apps Script returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { scriptUrl, ...payload } = body;

  if (!scriptUrl) {
    return Response.json({ error: "missing scriptUrl" }, { status: 400 });
  }

  const res = await fetch(scriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return Response.json(data);
}
