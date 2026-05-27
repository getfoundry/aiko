#!/usr/bin/env node
// Aiko CLI — npx @getfoundry/aiko <command>

import { Aiko, chat } from "../src/index.js";

const [, , cmd, ...args] = process.argv;

function help() {
  console.log(`aiko — thin client for the Aiko API

usage:
  npx @getfoundry/aiko chat "your prompt here"
  npx @getfoundry/aiko stream "your prompt here"
  npx @getfoundry/aiko models
  echo "your prompt" | npx @getfoundry/aiko chat -

env:
  AIKO_API_KEY      bearer for the Aiko endpoint
  AIKO_BASE_URL     override (default: https://aiko-api.getfoundry.app)
  AIKO_MODEL        default model alias (default: aiko-default)

flags:
  --model <name>    override model for this call
  --system <text>   prepend a system message
`);
}

async function readStdin() {
  let buf = "";
  for await (const chunk of process.stdin) buf += chunk;
  return buf.trim();
}

function parseFlags(args) {
  const out = { model: process.env.AIKO_MODEL, system: null, positional: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model") out.model = args[++i];
    else if (args[i] === "--system") out.system = args[++i];
    else if (args[i] === "-h" || args[i] === "--help") { help(); process.exit(0); }
    else out.positional.push(args[i]);
  }
  return out;
}

async function main() {
  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") return help();

  const flags = parseFlags(args);
  let prompt = flags.positional.join(" ").trim();
  if (prompt === "-" || (!prompt && !process.stdin.isTTY)) prompt = await readStdin();

  const client = new Aiko({ model: flags.model });

  if (cmd === "models") {
    const r = await client.models();
    for (const m of r.data) console.log(m.id);
    return;
  }

  if (!prompt) { console.error("aiko: empty prompt"); process.exit(2); }
  const messages = [];
  if (flags.system) messages.push({ role: "system", content: flags.system });
  messages.push({ role: "user", content: prompt });

  if (cmd === "chat") {
    const r = await client.chat({ messages });
    console.log(r?.choices?.[0]?.message?.content ?? "");
    return;
  }

  if (cmd === "stream") {
    for await (const delta of client.chatStream({ messages })) {
      const piece = delta?.choices?.[0]?.delta?.content;
      if (piece) process.stdout.write(piece);
    }
    process.stdout.write("\n");
    return;
  }

  console.error(`aiko: unknown command "${cmd}"`);
  help();
  process.exit(2);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
