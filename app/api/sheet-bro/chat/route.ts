import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

const MAX_CHARS = 12000; // safe context budget for sheet data

type Row = Record<string, unknown>;

function buildSheetContext(headers: string[], rows: Row[], totalRows: number): string {
  if (rows.length === 0) return `Columns: ${headers.join(', ')}\nNo data rows found.`;

  const fullJson = JSON.stringify(rows);

  if (fullJson.length <= MAX_CHARS) {
    // Small sheet — send everything
    return `Columns: ${headers.join(', ')}\nTotal rows: ${totalRows}\n\nAll data:\n${fullJson}`;
  }

  // Large sheet — send stats + sample
  const sample = rows.slice(0, 100);
  const sampleJson = JSON.stringify(sample);

  // Compute per-column stats for numeric columns
  const stats: Record<string, string> = {};
  for (const col of headers) {
    const nums = rows.map(r => Number(r[col])).filter(n => !isNaN(n) && n !== 0);
    if (nums.length > rows.length * 0.5) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      stats[col] = `sum=${sum.toFixed(2)}, min=${min}, max=${max}, avg=${(sum / nums.length).toFixed(2)}, count=${nums.length}`;
    } else {
      // Categorical — top values
      const freq: Record<string, number> = {};
      rows.forEach(r => { const v = String(r[col]); freq[v] = (freq[v] ?? 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, c]) => `"${v}"(${c})`).join(', ');
      stats[col] = `top values: ${top}`;
    }
  }

  const statsText = Object.entries(stats).map(([col, s]) => `  ${col}: ${s}`).join('\n');

  return `Columns: ${headers.join(', ')}\nTotal rows: ${totalRows} (showing first 100 as sample)\n\nColumn statistics (all ${totalRows} rows):\n${statsText}\n\nSample data (first 100 rows):\n${sampleJson}`;
}

async function fetchSheetData(scriptUrl: string, sheetId: string): Promise<{ headers: string[]; rows: Row[]; totalRows: number } | null> {
  try {
    const res = await fetch(`${scriptUrl}?sheetId=${encodeURIComponent(sheetId)}&action=getData`, { redirect: 'follow' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.headers) return null;
    return { headers: data.headers, rows: data.rows ?? [], totalRows: data.totalRows ?? data.rows?.length ?? 0 };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { messages, sheetName, sheetId, scriptUrl, columns } = await req.json();

  let sheetContext = columns?.length ? `Columns: ${columns.join(', ')}` : 'No sheet selected.';

  if (scriptUrl && sheetId) {
    const data = await fetchSheetData(scriptUrl, sheetId);
    if (data) {
      sheetContext = buildSheetContext(data.headers, data.rows, data.totalRows);
    }
  }

  const system = `You are Sheet Bro, a Google Sheets expert NPC in a 2D pixel co-working space.
The user is asking about their sheet named "${sheetName || 'unknown'}".

Sheet context:
${sheetContext}

Your job: answer any question about this sheet's data — summarize it, filter it, count things, find max/min, explain what the sheet is for, etc.
When the user asks to filter or query data, reason over the data provided and give a direct answer.
Be concise and friendly. You can speak Thai or English depending on the user.
IMPORTANT: Never use markdown formatting. No bold, no headers, no bullet points with *, no backticks. Plain text only.`;

  const result = streamText({
    model: openrouter.chat('anthropic/claude-haiku-4.5'),
    system,
    messages,
  });

  return result.toTextStreamResponse();
}
