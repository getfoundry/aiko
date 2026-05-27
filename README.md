# Aiko

Thin OpenAI-compatible client for the Aiko API (`https://aiko-api.getfoundry.app`).

Zero dependencies. ESM. Works in Node 18+, Deno, Bun, and any modern fetch runtime.

## Install

```bash
npm install @getfoundry/aiko
# or just
npx @getfoundry/aiko chat "hello"
```

## CLI

```bash
npx @getfoundry/aiko chat "explain DNS in one sentence"
npx @getfoundry/aiko stream "write a haiku about caching"
npx @getfoundry/aiko models
echo "summarize this" | npx @getfoundry/aiko chat -
npx @getfoundry/aiko chat --model aiko-fast --system "be terse" "what time is it"
```

## Library

```js
import { Aiko, chat } from "@getfoundry/aiko";

// one-shot
const reply = await chat("explain bloom filters in one paragraph");

// client with options
const aiko = new Aiko({ apiKey: process.env.AIKO_API_KEY, model: "aiko-fast" });
const r = await aiko.chat({
  messages: [
    { role: "system", content: "you are a concise assistant" },
    { role: "user", content: "name the seven hills of rome" },
  ],
});
console.log(r.choices[0].message.content);

// streaming
for await (const delta of aiko.chatStream({
  messages: [{ role: "user", content: "count to 5" }],
})) {
  process.stdout.write(delta.choices?.[0]?.delta?.content ?? "");
}
```

## Environment

| var | default | meaning |
| --- | --- | --- |
| `AIKO_BASE_URL` | `https://aiko-api.getfoundry.app` | endpoint origin |
| `AIKO_API_KEY` | — | bearer token (optional for public endpoints) |
| `AIKO_MODEL` | `aiko-default` | default model alias |

## API shape

OpenAI-compatible: same `messages`, `model`, `temperature`, `max_tokens`, `stream`, etc.
Drop-in replacement for the OpenAI client SDKs against any endpoint that speaks `/v1/chat/completions`.

## License

MIT
