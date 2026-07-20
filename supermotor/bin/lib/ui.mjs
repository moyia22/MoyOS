function color(code, text) {
  return process.stdout.isTTY ? `\u001b[${code}m${text}\u001b[0m` : text;
}

const ui = {
  title: (text) => console.log(`\n${color("1;38;5;208", text)}\n`),
  info: (text) => console.log(`${color("36", "\u25b6")} ${text}`),
  ok: (text) => console.log(`${color("32", "\u2713")} ${text}`),
  warn: (text) => console.log(`${color("33", "!")} ${text}`),
  fail: (text) => console.error(`${color("31", "\u2715")} ${text}`),
  hint: (text) => console.log(`${color("2", "\u2192")} ${text}`),
  step: (num, total, text) => console.log(`\n${color("1;38;5;208", `[${num}/${total}]`)} ${color("1", text)}`),
  debug: (text) => { if (globalThis.SUPERMOTOR_VERBOSE) console.log(`${color("2", "[debug]")} ${text}`); },
};

function spinner(text) {
  if (!process.stdout.isTTY) {
    return { start() {}, stop() {}, succeed() {}, fail() {} };
  }
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let index = 0;
  let running = false;
  let timer = null;
  const start = () => {
    running = true;
    process.stderr.write(`\r${color("36", frames[0])} ${text}`);
    timer = setInterval(() => {
      if (!running) return;
      index = (index + 1) % frames.length;
      process.stderr.write(`\r${color("36", frames[index])} ${text}`);
    }, 80);
  };
  const clear = () => {
    running = false;
    if (timer) clearInterval(timer);
    process.stderr.write("\r\x1b[K");
  };
  return {
    start,
    stop: () => { clear(); },
    succeed: (msg) => { clear(); ui.ok(msg || text); },
    fail: (msg) => { clear(); ui.fail(msg || text); },
  };
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}min ${remaining}s`;
}

function timed(label, fn) {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    if (result && typeof result.then === "function") {
      return result.then((value) => {
        ui.ok(`${label} (${formatDuration(performance.now() - start)})`);
        return value;
      }).catch((error) => {
        ui.fail(`${label} falhou apos ${formatDuration(performance.now() - start)}`);
        throw error;
      });
    }
    ui.ok(`${label} (${formatDuration(duration)})`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    ui.fail(`${label} falhou apos ${formatDuration(duration)}`);
    throw error;
  }
}

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

export { color, ui, spinner, timed, formatDuration, parseArgs };
