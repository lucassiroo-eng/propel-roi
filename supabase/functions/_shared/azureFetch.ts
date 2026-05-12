const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
const MAX_RETRIES = 2;

export async function azureFetch(body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
  const apiKey = Deno.env.get("AZURE_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("AZURE_ANTHROPIC_API_KEY not set");

  const headers = {
    "api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
  const payload = JSON.stringify(body);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(AZURE_URL, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const text = await res.text();
        const match = text.match(/wait (\d+) seconds/i);
        const waitSec = match ? Math.min(parseInt(match[1], 10), 60) : 25;
        console.log(`Azure 429 — retrying in ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES && (err as Error).name !== "AbortError") {
        console.log(`Azure fetch error — retrying (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Azure: max retries exceeded");
}
