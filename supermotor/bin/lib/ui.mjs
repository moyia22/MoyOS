function color(code, text) {
  return process.stdout.isTTY ? `\u001b[${code}m${text}\u001b[0m` : text;
}

const ui = {
  title: (text) => console.log(`\n${color("1;38;5;208", text)}\n`),
  info: (text) => console.log(`${color("36", "\u25b6")} ${text}`),
  ok: (text) => console.log(`${color("32", "\u2713")} ${text}`),
  warn: (text) => console.log(`${color("33", "!")} ${text}`),
  fail: (text) => console.error(`${color("31", "\u2715")} ${text}`),
};

function parseArgs(argv) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[rawKey] = next;
      index += 1;
    } else {
      options[rawKey] = true;
    }
  }

  return { positionals, options };
}

export { color, ui, parseArgs };
