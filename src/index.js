// Aiko — thin OpenAI-compatible client.
// Pure ESM. Zero dependencies. Uses global fetch (Node 18+).

const DEFAULT_BASE = "https://aiko-api.getfoundry.app";
const DEFAULT_MODEL = "aiko-default";

export class Aiko {
  constructor(opts = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.AIKO_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
    this.apiKey = opts.apiKey ?? process.env.AIKO_API_KEY ?? null;
    this.defaultModel = opts.model ?? DEFAULT_MODEL;
    this.fetch = opts.fetch ?? globalThis.fetch;
    if (!this.fetch) throw new Error("aiko: fetch is not available; use Node 18+ or pass opts.fetch");
  }

  async _post(path, body, { stream = false } = {}) {
    const headers = { "content-type": "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    const r = await this.fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok && !stream) {
      const text = await r.text();
      throw new AikoError(r.status, text);
    }
    return r;
  }

  async _get(path) {
    const headers = {};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    const r = await this.fetch(`${this.baseUrl}${path}`, { headers });
    if (!r.ok) throw new AikoError(r.status, await r.text());
    return r.json();
  }

  /** List available model aliases. */
  async models() {
    return this._get("/v1/models");
  }

  /** One-shot chat. Returns the OpenAI-shape completion object. */
  async chat({ messages, model, ...rest } = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("aiko.chat: messages must be a non-empty array");
    }
    const r = await this._post("/v1/chat/completions", {
      model: model ?? this.defaultModel,
      messages,
      ...rest,
    });
    return r.json();
  }

  /** Streaming chat. Yields each SSE delta object. */
  async *chatStream({ messages, model, ...rest } = {}) {
    const r = await this._post("/v1/chat/completions", {
      model: model ?? this.defaultModel,
      messages,
      stream: true,
      ...rest,
    }, { stream: true });
    if (!r.ok) {
      const text = await r.text();
      throw new AikoError(r.status, text);
    }
    const decoder = new TextDecoder();
    let buf = "";
    for await (const chunk of r.body) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trim = line.trim();
        if (!trim.startsWith("data:")) continue;
        const payload = trim.slice(5).trim();
        if (payload === "[DONE]") return;
        try { yield JSON.parse(payload); } catch { /* skip malformed */ }
      }
    }
  }
}

export class AikoError extends Error {
  constructor(status, body) {
    super(`aiko: HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

/** Convenience: one-shot chat without instantiating a client. */
export async function chat(prompt, opts = {}) {
  const client = new Aiko(opts);
  const r = await client.chat({
    messages: [{ role: "user", content: prompt }],
    ...opts,
  });
  return r?.choices?.[0]?.message?.content ?? "";
}

export default Aiko;
