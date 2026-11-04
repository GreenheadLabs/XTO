import {
  ACCOUNTS,
  ACCOUNT_ZERO,
  BLACKHOLE_REGULAR_KEY,
  FLAGS,
  MARKET_MAKERS,
  POOLS,
  RECORDED_ESCROWS,
  RIPPLE_EPOCH,
} from "./constants.js";
import { fromScaled, sumScaled, toScaled } from "./format.js";

const DEFAULT_RPCS = ["https://xrplcluster.com", "https://s1.ripple.com:51234", "https://s2.ripple.com:51234"];
const CACHE_OK_MS = 30_000;
const CACHE_FAIL_MS = 5_000;

let cache = null;

export function resetLedgerCache() {
  cache = null;
}

export function decodeDomain(hex) {
  if (!hex) return null;
  return Buffer.from(hex, "hex").toString("utf8");
}

export function rippleTimeToIso(seconds) {
  return new Date((Number(seconds) + RIPPLE_EPOCH) * 1000).toISOString();
}

export function readFlags(flags = 0) {
  const has = (bit) => (Number(flags) & bit) === bit;
  return {
    disableMaster: has(FLAGS.disableMaster),
    noFreeze: has(FLAGS.noFreeze),
    globalFreeze: has(FLAGS.globalFreeze),
    defaultRipple: has(FLAGS.defaultRipple),
    clawback: has(FLAGS.clawback),
  };
}

export function isBlackholed({ flags = 0, regularKey = null, signerCount = 0 } = {}) {
  const parsed = readFlags(flags);
  const regularBlocked = !regularKey || regularKey === BLACKHOLE_REGULAR_KEY || regularKey === ACCOUNT_ZERO;
  return parsed.disableMaster && regularBlocked && signerCount === 0;
}

function rpcUrls() {
  const configured = process.env.XRPL_RPC;
  if (!configured) return DEFAULT_RPCS;
  return configured.split(",").map((url) => url.trim()).filter(Boolean);
}

async function rpcCall(fetchImpl, method, params) {
  let lastError = null;
  for (const endpoint of rpcUrls()) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, params: [params] }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`${endpoint} HTTP ${response.status}`);
      const body = await response.json();
      const result = body.result ?? body;
      if (result.error) throw new Error(result.error);
      if (result.status && result.status !== "success") throw new Error(result.status);
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`XRPL ${method} failed`);
}

function dropsToXrp(amount) {
  if (typeof amount !== "string") return null;
  const scaled = toScaled(amount);
  if (scaled == null) return null;
  return fromScaled(scaled / 1_000_000n);
}

function xtoBalance(entries) {
  const row = (entries || []).find((entry) => entry.currency === "XTO");
  return row ? row.value : "0";
}

async function accountLines(fetchImpl, account) {
  const lines = [];
  let marker = undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await rpcCall(fetchImpl, "account_lines", {
      account,
      ledger_index: "validated",
      limit: 400,
      ...(marker ? { marker } : {}),
    });
    lines.push(...(result.lines || []));
    marker = result.marker;
    if (!marker) break;
  }
  return lines;
}

async function lineBalance(fetchImpl, account, peer) {
  const result = await rpcCall(fetchImpl, "account_lines", {
    account,
    peer,
    ledger_index: "validated",
  });
  const line = (result.lines || []).find((entry) => entry.account === peer);
  return line ? line.balance : "0";
}

async function blackholeOf(fetchImpl, account) {
  const [info, signers] = await Promise.all([
    rpcCall(fetchImpl, "account_info", { account, ledger_index: "validated" }),
    rpcCall(fetchImpl, "account_objects", { account, type: "signer_list", ledger_index: "validated" }),
  ]);
  const data = info.account_data;
  return isBlackholed({
    flags: data.Flags,
    regularKey: data.RegularKey ?? null,
    signerCount: (signers.account_objects || []).length,
  });
}

function recordedEscrow(tx) {
  return RECORDED_ESCROWS.find((escrow) => escrow.tx === tx) ?? null;
}

export async function loadSnapshot({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const warnings = [];
  const issuerInfo = await rpcCall(fetchImpl, "account_info", {
    account: ACCOUNTS.issuer.address,
    ledger_index: "validated",
  });
  const issuerAccount = issuerInfo.account_data;
  const ledgerIndex = issuerInfo.ledger_index ?? issuerInfo.ledger_current_index ?? null;
  const signers = await rpcCall(fetchImpl, "account_objects", {
    account: ACCOUNTS.issuer.address,
    type: "signer_list",
    ledger_index: "validated",
  }).catch((error) => {
    warnings.push(`Issuer signer list unavailable: ${error.message}`);
    return { account_objects: null };
  });
  const signerCount = signers.account_objects ? signers.account_objects.length : null;
  const flags = readFlags(issuerAccount.Flags);
  const domain = decodeDomain(issuerAccount.Domain);

  const hotwallets = [
    ACCOUNTS.treasury.address,
    ACCOUNTS.founder.address,
    ACCOUNTS.faucet.address,
    ACCOUNTS.burnXrp.address,
    ACCOUNTS.burnRlusd.address,
    ...MARKET_MAKERS.map((account) => account.address),
    ...POOLS.map((pool) => pool.amm),
  ];

  const [gatewayResult, linesResult, treasuryEscrow, founderEscrow] = await Promise.all([
    rpcCall(fetchImpl, "gateway_balances", {
      account: ACCOUNTS.issuer.address,
      ledger_index: "validated",
      hotwallet: hotwallets,
    }).catch((error) => {
      warnings.push(`Gateway balances unavailable: ${error.message}`);
      return null;
    }),
    accountLines(fetchImpl, ACCOUNTS.issuer.address).catch((error) => {
      warnings.push(`Issuer trust lines unavailable: ${error.message}`);
      return null;
    }),
    rpcCall(fetchImpl, "account_objects", {
      account: ACCOUNTS.treasury.address,
      type: "escrow",
      ledger_index: "validated",
    }).catch((error) => {
      warnings.push(`Treasury escrows unavailable: ${error.message}`);
      return null;
    }),
    rpcCall(fetchImpl, "account_objects", {
      account: ACCOUNTS.founder.address,
      type: "escrow",
      ledger_index: "validated",
    }).catch((error) => {
      warnings.push(`Founder escrows unavailable: ${error.message}`);
      return null;
    }),
  ]);

  const balances = {};
  if (gatewayResult?.balances) {
    for (const [address, entries] of Object.entries(gatewayResult.balances)) {
      balances[address] = xtoBalance(entries);
    }
  }

  let escrows = [];
  const escrowObjects = [
    ...(treasuryEscrow?.account_objects || []),
    ...(founderEscrow?.account_objects || []),
  ].filter((object) => object.Amount?.currency === "XTO");
  if (escrowObjects.length) {
    escrows = await Promise.all(escrowObjects.map(async (object) => {
      const known = recordedEscrow(object.PreviousTxnID);
      let createdAt = known?.createdAt ?? null;
      if (object.PreviousTxnID) {
        try {
          const tx = await rpcCall(fetchImpl, "tx", { transaction: object.PreviousTxnID, binary: false });
          if (tx.date != null) createdAt = rippleTimeToIso(tx.date);
        } catch (error) {
          warnings.push(`Escrow transaction ${object.PreviousTxnID} date unavailable: ${error.message}`);
        }
      }
      const ownerAddress = object.Account;
      const owner = ownerAddress === ACCOUNTS.founder.address ? "Founder" : "Treasury";
      return {
        owner,
        ownerAddress,
        amount: object.Amount.value,
        tx: object.PreviousTxnID,
        finishAfter: object.FinishAfter != null ? rippleTimeToIso(object.FinishAfter) : known?.finishAfter ?? null,
        createdAt,
      };
    }));
  } else if (!treasuryEscrow && !founderEscrow) {
    escrows = RECORDED_ESCROWS.map((escrow) => ({ ...escrow, recorded: true }));
    warnings.push("Serving the recorded escrow schedule");
  }

  const pools = [];
  for (const pool of POOLS) {
    try {
      const [info, burnBalance, makerBalance, burnBlackholed] = await Promise.all([
        rpcCall(fetchImpl, "amm_info", { amm_account: pool.amm, ledger_index: "validated" }),
        lineBalance(fetchImpl, pool.burn, pool.amm),
        lineBalance(fetchImpl, ACCOUNTS.greenhead.address, pool.amm),
        blackholeOf(fetchImpl, pool.burn),
      ]);
      const amm = info.amm;
      const total = Number(amm.lp_token.value);
      const burn = Number(burnBalance);
      const maker = Number(makerBalance);
      const burnPct = total > 0 ? (burn / total) * 100 : 0;
      const makerPct = total > 0 ? (maker / total) * 100 : 0;
      const otherPct = Math.max(0, 100 - burnPct - makerPct);
      const xto = typeof amm.amount === "object" && amm.amount.currency === "XTO"
        ? amm.amount
        : amm.amount2;
      pools.push({
        pair: pool.pair,
        amm: pool.amm,
        ledgerIndex: info.ledger_index ?? ledgerIndex,
        totalLp: amm.lp_token.value,
        xtoReserve: xto?.value ?? null,
        tradingFee: amm.trading_fee ?? null,
        xrpReserve: dropsToXrp(amm.amount) ?? dropsToXrp(amm.amount2),
        burn: {
          address: pool.burn,
          balance: burnBalance,
          sharePct: burnPct,
          blackholed: burnBlackholed,
        },
        marketMaker: {
          address: ACCOUNTS.greenhead.address,
          sharePct: makerPct,
        },
        other: { sharePct: otherPct },
      });
    } catch (error) {
      warnings.push(`${pool.pair} pool unavailable: ${error.message}`);
    }
  }

  const holders = linesResult
    ? linesResult.filter((line) => line.currency === "XTO" && Number(line.balance) !== 0).length
    : null;

  return {
    ledgerIndex,
    checkedAt: now().toISOString(),
    stale: false,
    domain,
    domainMatches: domain === "token.xrpltoken.com",
    issuer: {
      flags: issuerAccount.Flags,
      blackholed: signerCount === null ? null : isBlackholed({
        flags: issuerAccount.Flags,
        regularKey: issuerAccount.RegularKey ?? null,
        signerCount,
      }),
      masterKeyDisabled: flags.disableMaster,
      regularKey: issuerAccount.RegularKey ?? null,
      noFreeze: flags.noFreeze,
      globalFreeze: flags.globalFreeze,
      clawback: flags.clawback,
      defaultRipple: flags.defaultRipple,
      transferRate: issuerAccount.TransferRate ?? null,
      tickSize: issuerAccount.TickSize ?? null,
    },
    balances,
    circulating: gatewayResult?.obligations?.XTO ?? null,
    holders,
    escrows,
    pools,
    warnings,
  };
}

export async function getSnapshot(options = {}) {
  const now = Date.now();
  if (cache && now - cache.at < (cache.ok ? CACHE_OK_MS : CACHE_FAIL_MS)) {
    return cache.value;
  }
  try {
    const value = await loadSnapshot(options);
    cache = { at: now, ok: true, value };
    return value;
  } catch (error) {
    const stale = cache?.value ? { ...cache.value, stale: true } : null;
    cache = { at: now, ok: false, value: stale, error };
    return stale;
  }
}

export function allocationRows(snapshot) {
  if (!snapshot) return [];
  const balance = (address) => snapshot.balances?.[address] ?? null;
  const makers = MARKET_MAKERS.map((account) => toScaled(balance(account.address)));
  const amms = snapshot.pools.map((pool) => toScaled(pool.xtoReserve));
  const escrowTotal = snapshot.escrows.length
    ? sumScaled(snapshot.escrows.map((escrow) => toScaled(escrow.amount)))
    : null;
  const makerTotal = makers.every((value) => value != null) ? sumScaled(makers) : null;
  const ammTotal = snapshot.pools.length && amms.every((value) => value != null) ? sumScaled(amms) : null;
  const rows = [
    { name: "Escrow", amount: escrowTotal == null ? null : fromScaled(escrowTotal), href: snapshot.escrows[0]?.tx ? `https://livenet.xrpl.org/transactions/${snapshot.escrows[0].tx}` : null },
    { name: "Treasury", amount: balance(ACCOUNTS.treasury.address), href: `https://livenet.xrpl.org/accounts/${ACCOUNTS.treasury.address}` },
    { name: "Faucet", amount: balance(ACCOUNTS.faucet.address), href: `https://livenet.xrpl.org/accounts/${ACCOUNTS.faucet.address}` },
    { name: "Founder", amount: balance(ACCOUNTS.founder.address), href: `https://livenet.xrpl.org/accounts/${ACCOUNTS.founder.address}` },
    { name: "Market makers", amount: makerTotal == null ? null : fromScaled(makerTotal), href: `https://livenet.xrpl.org/accounts/${ACCOUNTS.greenhead.address}` },
    { name: "AMM pools", amount: ammTotal == null ? null : fromScaled(ammTotal), href: snapshot.pools[0] ? `https://livenet.xrpl.org/accounts/${snapshot.pools[0].amm}` : `https://livenet.xrpl.org/accounts/${POOLS[0].amm}` },
    { name: "Public", amount: snapshot.circulating, href: null },
  ];
  const parts = [
    escrowTotal,
    toScaled(balance(ACCOUNTS.treasury.address)),
    toScaled(balance(ACCOUNTS.faucet.address)),
    toScaled(balance(ACCOUNTS.founder.address)),
    makerTotal,
    ammTotal,
    toScaled(snapshot.circulating),
  ];
  const burns = [ACCOUNTS.burnXrp.address, ACCOUNTS.burnRlusd.address].map((address) => toScaled(balance(address) ?? "0"));
  const complete = parts.every((value) => value != null);
  return {
    rows,
    total: complete ? fromScaled(sumScaled([...parts, ...burns])) : null,
  };
}
