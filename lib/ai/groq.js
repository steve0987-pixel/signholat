const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function extractJsonText(rawText) {
  const cleaned = String(rawText || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0].trim() : cleaned;
}

function readGroqConfig(env = process.env) {
  return {
    apiKey: env.GROQ_API_KEY || "",
    model: env.GROQ_MODEL || "llama-3.3-70b-versatile"
  };
}

export function hasGroqConfig(env = process.env) {
  const config = readGroqConfig(env);
  return Boolean(config.apiKey && config.model);
}

export async function requestGroqJson({ prompt, maxTokens = 240, timeoutMs = 8000, env = process.env }) {
  const config = readGroqConfig(env);
  if (!config.apiKey || !config.model) {
    return { ok: false, errorCode: "config_missing" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return { ok: false, errorCode: "request_failed" };
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      return { ok: false, errorCode: "empty_response" };
    }

    const parsed = JSON.parse(extractJsonText(text));
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, errorCode: "invalid_json" };
    }

    return { ok: true, data: parsed };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, errorCode: "timeout" };
    }

    return { ok: false, errorCode: "network_error" };
  } finally {
    clearTimeout(timeoutId);
  }
}
