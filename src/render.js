import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACCOUNTS, APP_ORIGIN, LOGO_FILES, ORIGIN, SUPPLY } from "./constants.js";
import { allocationRows } from "./ledger.js";
import {
  esc,
  formatAmount,
  formatBytes,
  formatLedger,
  formatPctNumber,
  formatRemaining,
  formatUtc,
  formatUtcClock,
  fromScaled,
  highlightToml,
  roundScaled,
  ledgerUrl,
  percentOf,
  toScaled,
  txUrl,
} from "./format.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(root, "src/page.css"), "utf8");
const SUPPLY_SCALED = toScaled(SUPPLY);

const WALLET_ORDER = ["issuer", "treasury", "founder", "faucet", "burnXrp", "burnRlusd", "jim", "bob", "greenhead"];

function nav(current) {
  const item = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `${item("/", "Ledger TOML", "toml")}${item("/photo", "Logo", "photo")}${item("/tokenomics", "Tokenomics", "tokenomics")}`;
}

function footerLink(href, label, testid, active) {
  const attrs = active ? ' class="site-footer-link is-active" aria-current="page"' : ' class="site-footer-link"';
  return `<li><a href="${href}"${attrs} data-testid="${testid}">${label}</a></li>`;
}

function footer(active) {
  return `<footer class="site-footer" data-testid="site-footer">
  <div class="site-footer-inner">
    <div class="site-footer-grid">
      <div class="site-footer-brand-col">
        <a class="site-footer-brand" href="${APP_ORIGIN}/">
          <span class="site-footer-logo"><img src="/xto-logo.png?v=3" alt="XTO logo" /></span>
          <span class="xto-wordmark site-footer-wordmark" style="color:#FFFFFF" aria-label="XTO">XTO</span>
        </a>
        <p class="site-footer-blurb">XTO is a fixed-supply token on the XRP Ledger with a free daily faucet and fully verifiable on-ledger facts.</p>
        <a class="site-footer-x" href="https://x.com/xrpltoken" target="_blank" rel="noopener" aria-label="xrpltoken on X" data-testid="footer-link-x"><span aria-hidden="true">𝕏</span></a>
      </div>
      <div><h2>Project</h2><ul class="site-footer-links">${footerLink(`${APP_ORIGIN}/`, "Home", "footer-link-home")}${footerLink(`${APP_ORIGIN}/identity`, "Identity", "footer-link-identity")}${footerLink(`${APP_ORIGIN}/dev`, "Dev", "footer-link-dev")}${footerLink(`${APP_ORIGIN}/updates`, "Updates", "footer-link-updates")}</ul></div>
      <div><h2>XTO Token</h2><ul class="site-footer-links">${footerLink(`${ORIGIN}/`, "Official records", "footer-link-official-records", active === "records")}${footerLink("/photo", "Logo", "footer-link-logo", active === "logo")}${footerLink("/tokenomics", "Tokenomics", "footer-link-tokenomics", active === "tokenomics")}${footerLink(`${APP_ORIGIN}/xto`, "Official token page ↗", "footer-link-official-token-page")}${footerLink(`${APP_ORIGIN}/links`, "Links", "footer-link-links")}${footerLink(`${APP_ORIGIN}/press`, "Press", "footer-link-press")}${footerLink(`${APP_ORIGIN}/escrow`, "Escrow", "footer-link-escrow")}${footerLink(`${APP_ORIGIN}/faucet`, "Faucet", "footer-link-faucet")}${footerLink(`${APP_ORIGIN}/member`, "Member Cards", "footer-link-member-cards")}</ul></div>
      <div><h2>Trade</h2><ul class="site-footer-links">${footerLink(`${APP_ORIGIN}/dex`, "DEX", "footer-link-dex")}${footerLink(`${APP_ORIGIN}/amm`, "Liquidity", "footer-link-liquidity")}${footerLink(`${APP_ORIGIN}/send`, "Send", "footer-link-send")}</ul></div>
      <div><h2>Account</h2><ul class="site-footer-links">${footerLink(`${APP_ORIGIN}/user`, "My account", "footer-link-my-account")}${footerLink(`${APP_ORIGIN}/community`, "Community", "footer-link-community")}</ul></div>
      <div><h2>Legal</h2><ul class="site-footer-links">${footerLink(`${APP_ORIGIN}/privacy`, "Privacy", "footer-link-privacy")}${footerLink(`${APP_ORIGIN}/terms`, "Terms", "footer-link-terms")}${footerLink(`${APP_ORIGIN}/disclaimer`, "Disclaimer", "footer-link-disclaimer")}</ul></div>
    </div>
    <div class="site-footer-bottom">
      <p class="site-footer-note" data-testid="token-host-footer-note">token.xrpltoken.com is the issuer's verified domain on the XRP Ledger. The app lives at xrpltoken.com.</p>
      <div class="site-footer-bar">
        <p>© 2026 xrpltoken. All rights reserved.</p>
        <p class="site-footer-mark">Official XTO project information <svg class="site-footer-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></p>
      </div>
    </div>
  </div>
</footer>`;
}

function layout({ title, description, path, current, footerKey, main }) {
  const url = `${ORIGIN}${path}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}/og-xto.png?v=3" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${ORIGIN}/og-xto.png?v=3" />
  <meta name="twitter:site" content="@xrpltoken" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&amp;family=Space+Mono:wght@400;700&amp;display=swap" rel="stylesheet" />
  <style>
${css}
  </style>
</head>
<body>
  <header class="top">
    <div class="brand">
      <a class="xto-wordmark wordmark" style="color:#FFFFFF" aria-label="XTO official records" href="/">XTO</a>
      <span class="records-label">Official records</span>
    </div>
    <nav aria-label="Official records">
      ${nav(current)}
    </nav>
    <a class="back" href="${APP_ORIGIN}/">Back to xrpltoken.com →</a>
  </header>
  <main class="page">${main}</main>
  ${footer(footerKey)}
  <script src="/official-records.js" defer></script>
</body>
</html>`;
}

function domainCell(snapshot) {
  const ledger = snapshot?.ledgerIndex ? ` Ledger #${snapshot.ledgerIndex}.` : "";
  if (!snapshot) return "Domain on ledger: check unavailable.";
  if (!snapshot.domain) return `Domain on ledger: not set.${ledger}`;
  return `Domain on ledger: ${esc(snapshot.domain)}.${ledger}`;
}

function lpNote(pool) {
  const burned = pool.burn.sharePct.toFixed(2);
  const other = pool.other.sharePct.toFixed(2);
  const team = pool.marketMaker.sharePct.toFixed(2);
  let text = `${burned}% of the live ${pool.pair} AMM LP tokens are held by the burn wallet, derived from validated ledger ${pool.ledgerIndex}. `;
  if (pool.burn.blackholed) text += "The burn wallet is blackholed, so its LP tokens cannot be withdrawn. ";
  if (pool.burn.sharePct < 99.99) {
    text += `The verified burn share is below 99.99%; the remaining ${other}% is held outside the blackholed wallet. `;
    text += `Liquidity market maker (team-affiliated) holds ${team}%. `;
    text += `Other holders hold ${other}% and may withdraw their LP tokens.`;
  } else {
    text += `Liquidity market maker (team-affiliated) holds ${team}%. `;
    text += pool.other.sharePct === 0 ? "No other holders have LP tokens. " : `Other holders hold ${other}% and may withdraw their LP tokens. `;
    if (pool.burn.blackholed) text += "Master key disabled, regular key unusable or unset, and no signer list on the validated ledger.";
  }
  return text;
}

export function renderHome({ snapshot, toml, documents }) {
  const rows = documents.map((doc) => `<tr>
      <td><a href="${esc(doc.href)}">${esc(doc.label)}</a></td>
      <td class="mono">${esc(doc.sha256)}</td>
      <td>${formatBytes(doc.bytes)} bytes</td>
    </tr>`).join("");
  const main = `<section class="band grid-bg"><div class="frame"><h1>XTO Ledger TOML</h1><p class="lede">The XRP Ledger reads this file to verify XTO's issuer and domain.</p><table class="facts">
    <tbody>
      <tr><th scope="row">Issuer</th><td><code id="issuer-address">${ACCOUNTS.issuer.address}</code> <span class="row-actions"><button class="button" type="button" data-copy="issuer-address">Copy</button> <a class="button" href="${ledgerUrl(ACCOUNTS.issuer.address)}">Ledger</a></span></td></tr>
      <tr><th scope="row">Domain</th><td>${domainCell(snapshot)}</td></tr>
      <tr><th scope="row">File</th><td><a href="/.well-known/xrp-ledger.toml">/.well-known/xrp-ledger.toml</a></td></tr>
      <tr><th scope="row">Size</th><td data-testid="toml-bytes">${toml.bytes}</td></tr>
      <tr><th scope="row">sha256</th><td class="mono" data-testid="toml-sha256">${toml.sha256}</td></tr>
      <tr><th scope="row">Last modified</th><td>2026-09-26T18:17:23.000Z</td></tr>
    </tbody>
  </table></div></section><section class="band"><div class="frame"><h2>Ledger file</h2><pre id="toml-source">${highlightToml(toml.text)}</pre>
      <div class="actions">
        <a class="button" href="/.well-known/xrp-ledger.toml">Open raw file</a>
        <button class="button" type="button" data-copy="toml-source">Copy</button>
        <a class="button" href="${ledgerUrl(ACCOUNTS.issuer.address)}">Verify on ledger</a>
      </div></div></section><section class="band"><div class="frame"><h2>Also published here</h2><div class="table-scroll"><table class="table"><thead><tr><th>Document</th><th>sha256</th><th>Size</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
  return layout({
    title: "XTO Ledger TOML | token.xrpltoken.com",
    description: "The XRP Ledger reads this file to verify XTO’s issuer and domain.",
    path: "/",
    current: "toml",
    footerKey: "records",
    main,
  });
}

export function renderPhoto({ logos }) {
  const cards = logos.map((logo) => `<article class="card" data-logo="${esc(logo.href)}">
      <img src="${esc(logo.href)}" width="${logo.width}" height="${logo.height}" alt="" />
      <h3>${esc(logo.title)}</h3>
      <p class="muted">${logo.width} × ${logo.height} · ${formatBytes(logo.bytes)} bytes</p>
      <p class="mono" data-testid="logo-sha-${esc(logo.href.slice(1))}">${logo.sha256}</p>
      <p class="file-url"><code id="url-${esc(logo.href.slice(1))}">${ORIGIN}<wbr>${esc(logo.href)}</code></p>
      <div class="actions"><a class="button" href="${esc(logo.href)}" download>Download</a><button class="button" type="button" data-copy="url-${esc(logo.href.slice(1))}">Copy</button></div>
    </article>`).join("");
  const hero = LOGO_FILES[1];
  const main = `<section class="band grid-bg"><div class="frame"><h1>Official XTO logo</h1><img class="hero-logo" src="${hero.href}" width="${hero.width}" height="${hero.height}" alt="Official XTO logo" /></div></section><section class="band"><div class="frame"><h2>Logo files</h2><div class="cards">${cards}</div><p class="note">Use only logos downloaded from this page or xrpltoken.com. Lookalike logos are not official.</p></div></section>`;
  return layout({
    title: "XTO logo | token.xrpltoken.com",
    description: "Official XTO logo files published on the issuer domain.",
    path: "/photo",
    current: "photo",
    footerKey: "logo",
    main,
  });
}

function issuerKpi(snapshot) {
  if (!snapshot || snapshot.issuer.blackholed == null) {
    return `<article class="kpi"><span>Issuer</span><strong>unavailable</strong><p class="mono">${ACCOUNTS.issuer.address}</p><p class="muted">Ledger check unavailable</p></article>`;
  }
  const state = snapshot.issuer.blackholed ? "Blackholed ✓" : "Not blackholed";
  const cached = snapshot.stale ? " · cached" : "";
  return `<article class="kpi"><span>Issuer</span><strong>${state}</strong><p class="mono">${ACCOUNTS.issuer.address}</p><p class="muted">Last verified ${esc(snapshot.checkedAt)} · ledger #${formatLedger(snapshot.ledgerIndex)}${cached}</p></article>`;
}

function allocationTable(snapshot) {
  const built = allocationRows(snapshot);
  if (!built.rows) {
    return `<p class="muted">Allocation chart unavailable.</p>`;
  }
  const body = built.rows.map((row) => {
    const scaled = toScaled(row.amount);
    const pctValue = scaled == null ? null : percentOf(scaled, SUPPLY_SCALED);
    const pct = pctValue == null ? "unavailable" : (pctValue === "0.00" && scaled > 0n ? "&lt;0.01%" : `${pctValue}%`);
    const name = row.href ? `<a href="${esc(row.href)}">${esc(row.name)}</a>` : esc(row.name);
    const ledger = row.href ? `<a href="${esc(row.href)}">Ledger</a>` : "—";
    return `<tr><td>${name}</td><td class="mono">${row.amount == null ? "unavailable" : formatAmount(row.amount)}</td><td>${pct}</td><td>${ledger}</td></tr>`;
  }).join("");
  const totalScaled = built.total == null ? null : toScaled(built.total);
  const gap = totalScaled == null ? null : SUPPLY_SCALED - totalScaled;
  const sumNote = gap === 0n
    ? `<p class="note">Sum check: ${formatAmount(SUPPLY)} XTO.</p>`
    : gap != null && gap > 0n && gap <= toScaled("1000")
      ? `<p class="note">Sum check: ${formatAmount(fromScaled(roundScaled(totalScaled, 2)))} XTO accounted for, within 1,000 XTO of the fixed ${formatAmount(SUPPLY)} supply.</p>`
      : `<p class="note">Allocation is summed from validated ledger balances${built.total ? ` (rows plus LP-burn wallet balances total ${formatAmount(built.total)} XTO)` : ""}. A sum check is included when that total is within 1,000 XTO of the fixed ${formatAmount(SUPPLY)} XTO supply.</p>`;
  return `<div class="table-scroll"><table class="table"><thead><tr><th>Allocation</th><th>Amount</th><th>%</th><th>Ledger</th></tr></thead><tbody>${body}</tbody></table></div>${sumNote}`;
}

function escrowSection(snapshot, now) {
  const escrows = snapshot?.escrows ?? [];
  if (!escrows.length) return `<section class="band"><div class="frame"><h2>Escrow schedule</h2><p class="muted">Escrow schedule unavailable.</p></div></section>`;
  const total = fromScaled(escrows.reduce((sum, escrow) => sum + (toScaled(escrow.amount) ?? 0n), 0n));
  const finish = escrows.map((escrow) => escrow.finishAfter).filter(Boolean).sort().at(-1);
  const start = escrows.map((escrow) => escrow.createdAt).filter(Boolean).sort().at(-1);
  const elapsed = start && finish ? Math.min(100, Math.max(0, ((now - new Date(start).getTime()) / (new Date(finish).getTime() - new Date(start).getTime())) * 100)) : null;
  const rows = escrows.map((escrow) => `<tr><td class="mono">${formatAmount(escrow.amount)}</td><td><a href="${ledgerUrl(escrow.ownerAddress)}"><code>${escrow.ownerAddress}</code></a></td><td title="${esc(formatUtc(escrow.finishAfter))}">${esc(formatUtc(escrow.finishAfter))}</td><td>${escrow.tx ? `<a href="${txUrl(escrow.tx)}">Ledger</a>` : "—"}</td></tr>`).join("");
  const progress = elapsed == null ? "" : `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${elapsed}" aria-label="Escrow time elapsed"><i style="width:${elapsed}%"></i></div>
    <p class="note">${elapsed.toFixed(1)}% of the escrow term has elapsed.</p>`;
  return `<section class="band"><div class="frame"><h2>Escrow schedule</h2><p class="mono">${formatAmount(total)} XTO</p>
    <p class="muted">${finish ? `${esc(formatUtc(finish))} · ${formatRemaining(now, finish)}` : "Unlock time unavailable"}</p>
    ${progress}
    <div class="table-scroll"><table class="table"><thead><tr><th>Amount</th><th>Owner</th><th>Unlock</th><th>Ledger</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
}

function liquiditySection(snapshot) {
  if (!snapshot?.pools?.length) {
    return `<section class="band"><div class="frame"><h2>Liquidity</h2><p class="muted">Live LP distribution is temporarily unavailable.</p></div></section>`;
  }
  const articles = snapshot.pools.map((pool) => `<article>
      <h3>${esc(pool.pair)}</h3>
      <div class="lp" aria-hidden="true"><i style="width:${pool.burn.sharePct}%;background:#111827"></i><i style="width:${pool.marketMaker.sharePct}%;background:#F59E0B"></i><i style="width:${pool.other.sharePct}%;background:#8A9BB4"></i></div>
      <p>Burned ${pool.burn.sharePct.toFixed(2)}% · Team ${pool.marketMaker.sharePct.toFixed(2)}% · Other ${pool.other.sharePct.toFixed(2)}%${pool.other.sharePct > 0 ? " (can be withdrawn)" : ""}</p>
      <p class="note">${esc(lpNote(pool))}</p>
    </article>`).join("");
  return `<section class="band"><div class="frame"><h2>Liquidity</h2>${articles}</div></section>`;
}

export function renderTokenomics({ snapshot, now = new Date() }) {
  const escrowTotal = snapshot?.escrows?.length
    ? fromScaled(snapshot.escrows.reduce((sum, escrow) => sum + (toScaled(escrow.amount) ?? 0n), 0n))
    : null;
  const finish = snapshot?.escrows?.map((escrow) => escrow.finishAfter).filter(Boolean).sort().at(-1) ?? null;
  const lpSummary = snapshot?.pools?.length
    ? snapshot.pools.map((pool) => `${pool.pair} ${formatPctNumber(pool.burn.sharePct)}`).join(" · ")
    : "unavailable";
  const clawback = snapshot?.issuer ? (snapshot.issuer.clawback ? "Clawback on" : "Clawback off") : "Clawback unavailable";
  const freeze = snapshot?.issuer ? (snapshot.issuer.globalFreeze || !snapshot.issuer.noFreeze ? "Freeze on" : "Freeze off") : "Freeze unavailable";
  const supplyRule = snapshot?.issuer?.blackholed
    ? "The issuer is blackholed, so the issued supply cannot increase."
    : snapshot?.issuer?.blackholed === false
      ? "The issuer is not blackholed on the validated ledger."
      : "The recorded issuer is configured as a blackholed account. The live check is unavailable.";
  const ledgerNote = snapshot?.ledgerIndex
    ? `Ledger #${snapshot.ledgerIndex} · updated ${formatUtcClock(snapshot.checkedAt)}.`
    : "Ledger check unavailable.";
  const main = `<section class="band grid-bg"><div class="frame"><h1>XTO tokenomics</h1><div class="kpis">
      <article class="kpi" title="${formatAmount(SUPPLY)} XTO"><span>Total supply</span><strong>100B</strong><p>Fixed recorded supply</p></article>
      ${issuerKpi(snapshot)}
      <article class="kpi"><span>Locked in escrow</span><strong>${escrowTotal == null ? "unavailable" : formatAmount(escrowTotal)}</strong><p>${finish ? `${esc(formatUtc(finish))} · ${formatRemaining(now, finish)}` : "Recorded until Sep 25, 2027, 01:00 UTC"}</p></article>
      <article class="kpi" title="Gateway obligations exclude treasury, founder, faucet, both AMM pools, LP-burn accounts, and configured market makers; escrow is accounted separately."><span>Circulating</span><strong>${snapshot?.circulating == null ? "unavailable" : formatAmount(snapshot.circulating)}</strong><p>Excludes escrow, treasury, founder, faucet, market makers and AMM pools.</p></article>
      <article class="kpi"><span>Holders</span><strong>${snapshot?.holders == null ? "unavailable" : formatAmount(String(snapshot.holders))}</strong><p>Non-zero issuer trust lines</p></article>
      <article class="kpi"><span>LP burned</span><strong>${snapshot?.pools?.length ? "Per pool" : "unavailable"}</strong><p>${esc(lpSummary)}</p></article>
    </div>
    <p class="note">${esc(ledgerNote)}</p><p><a href="${APP_ORIGIN}/xto">Full live dashboard → xrpltoken.com/xto</a></p></div></section><section class="band"><div class="frame"><h2>Allocation</h2>${snapshot ? allocationTable(snapshot) : `<p class="muted">Allocation chart unavailable.</p>`}</div></section>${escrowSection(snapshot, now)}${liquiditySection(snapshot)}<section class="band"><div class="frame"><h2>Rules</h2><table class="facts"><tbody>
      <tr><th scope="row">Fixed supply</th><td>${supplyRule}</td></tr>
      <tr><th scope="row">Clawback / freeze</th><td>${clawback} · ${freeze}</td></tr>
      <tr><th scope="row">Faucet</th><td>1,000 XTO per wallet per 24 hours</td></tr>
      <tr><th scope="row">Fees</th><td>No site fees today</td></tr>
    </tbody></table></div></section><section class="band"><div class="frame"><h2>Official wallets</h2><div class="table-scroll"><table class="table"><thead><tr><th>Role</th><th>Label</th><th>Address</th><th>Ledger</th></tr></thead><tbody>${WALLET_ORDER.map((key) => {
      const account = ACCOUNTS[key];
      return `<tr><td>${esc(account.role)}</td><td>${esc(account.label)}</td><td class="mono">${account.address}</td><td><a href="${ledgerUrl(account.address)}">Ledger</a></td></tr>`;
    }).join("")}</tbody></table></div></div></section>`;
  return layout({
    title: "XTO tokenomics | token.xrpltoken.com",
    description: "Read-only XTO supply, escrow, liquidity, and official wallets from the XRP Ledger.",
    path: "/tokenomics",
    current: "tokenomics",
    footerKey: "tokenomics",
    main,
  });
}
