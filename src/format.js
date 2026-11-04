const SCALE = 15n;
const SCALE_FACTOR = 10n ** SCALE;

export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatBytes(bytes) {
  return Number(bytes).toLocaleString("en-US");
}

export function formatLedger(index) {
  if (index == null) return "";
  return Number(index).toLocaleString("en-US");
}

export function formatAmount(value) {
  if (value == null || value === "") return "unavailable";
  let str = String(value).trim();
  if (/e/i.test(str)) {
    const n = Number(str);
    if (!Number.isFinite(n)) return "unavailable";
    str = n.toFixed(15).replace(/0+$/, "").replace(/\.$/, "");
  }
  const neg = str.startsWith("-");
  if (neg) str = str.slice(1);
  if (!/^\d+(\.\d+)?$/.test(str)) return "unavailable";
  const [whole, frac = ""] = str.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = frac.replace(/0+$/, "");
  const body = trimmed ? `${grouped}.${trimmed}` : grouped;
  return neg ? `-${body}` : body;
}

export function toScaled(value) {
  if (value == null || value === "") return null;
  let str = String(value).trim();
  let neg = false;
  if (str.startsWith("-")) {
    neg = true;
    str = str.slice(1);
  }
  if (/e/i.test(str)) {
    const n = Number(str);
    if (!Number.isFinite(n)) return null;
    str = n.toFixed(15);
  }
  if (!/^\d+(\.\d+)?$/.test(str)) return null;
  const [whole, frac = ""] = str.split(".");
  const fracPadded = `${frac}${"0".repeat(Number(SCALE))}`.slice(0, Number(SCALE));
  const scaled = BigInt(whole) * SCALE_FACTOR + BigInt(fracPadded || "0");
  return neg ? -scaled : scaled;
}

export function roundScaled(value, places) {
  const factor = 10n ** BigInt(Number(SCALE) - places);
  const sign = value < 0n ? -1n : 1n;
  const abs = value < 0n ? -value : value;
  const rounded = ((abs + factor / 2n) / factor) * factor;
  return sign * rounded;
}

export function fromScaled(value) {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / SCALE_FACTOR;
  const frac = (abs % SCALE_FACTOR).toString().padStart(Number(SCALE), "0").replace(/0+$/, "");
  const body = frac ? `${whole.toString()}.${frac}` : whole.toString();
  return neg ? `-${body}` : body;
}

export function sumScaled(values) {
  return values.reduce((sum, value) => sum + value, 0n);
}

/** Percent of supply, rounded to 2 decimal places, without a percent sign. */
export function percentOf(part, whole) {
  if (part == null || whole == null || whole === 0n) return null;
  const basis = (part * 10000n + whole / 2n) / whole;
  const units = basis / 100n;
  const frac = (basis % 100n).toString().padStart(2, "0");
  return `${units.toString()}.${frac}`;
}

export function formatPctNumber(value) {
  if (value == null || !Number.isFinite(value)) return "unavailable";
  return `${value.toFixed(2)}%`;
}

export function formatUtc(date) {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

export function formatUtcClock(date) {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let hours = d.getUTCHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${hh}:${mm} ${suffix} UTC`;
}

export function formatRemaining(now, finish) {
  const ms = new Date(finish).getTime() - new Date(now).getTime();
  if (ms <= 0) return "unlocked";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h`;
}

export function highlightToml(toml) {
  return toml.split("\n").map((line) => {
    if (line.startsWith("[")) return `<span class="tok-h">${esc(line)}</span>`;
    const eq = line.indexOf("=");
    if (eq === -1) return esc(line);
    return `<span class="tok-k">${esc(line.slice(0, eq))}</span>=<span class="tok-v">${esc(line.slice(eq + 1))}</span>`;
  }).join("\n");
}

export function ledgerUrl(address) {
  return `https://livenet.xrpl.org/accounts/${address}`;
}

export function txUrl(hash) {
  return `https://livenet.xrpl.org/transactions/${hash}`;
}
