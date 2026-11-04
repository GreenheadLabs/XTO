import { ACCOUNTS, DOMAIN, ORIGIN, POOLS, SUPPLY } from "./constants.js";
import { fromScaled, sumScaled, toScaled } from "./format.js";

function escrowTotal(snapshot) {
  if (!snapshot?.escrows?.length) return null;
  return fromScaled(sumScaled(snapshot.escrows.map((escrow) => toScaled(escrow.amount))));
}

export function buildMetadata(snapshot) {
  const warnings = [...(snapshot?.warnings ?? [])];
  if (!snapshot) warnings.unshift("Live ledger data is temporarily unavailable");
  const xrpPool = snapshot?.pools?.find((pool) => pool.pair === "XTO/XRP") ?? null;
  const issuer = snapshot?.issuer ?? null;
  return {
    name: "xrpltoken",
    currency: "XTO",
    network: "mainnet",
    domain: DOMAIN,
    icon: `${ORIGIN}/xto-logo.png`,
    metadataUrl: ORIGIN,
    supply: SUPPLY,
    issuer: ACCOUNTS.issuer.address,
    treasury: ACCOUNTS.treasury.address,
    founder: ACCOUNTS.founder.address,
    faucet: ACCOUNTS.faucet.address,
    policy: {
      clawback: issuer ? issuer.clawback : null,
      freeze: issuer ? issuer.globalFreeze : null,
      defaultRipple: issuer ? issuer.defaultRipple : null,
      transferRate: issuer ? issuer.transferRate : null,
      tickSize: issuer ? issuer.tickSize : null,
    },
    issuerStatus: {
      blackholed: issuer ? issuer.blackholed : null,
      masterKeyDisabled: issuer ? issuer.masterKeyDisabled : null,
      regularKey: issuer ? issuer.regularKey : null,
      noFreeze: issuer ? issuer.noFreeze : null,
      clawback: issuer ? issuer.clawback : null,
    },
    allocations: snapshot?.circulating == null ? null : {
      circulating: snapshot.circulating,
      escrow: escrowTotal(snapshot),
      treasury: snapshot.balances?.[ACCOUNTS.treasury.address] ?? null,
      founder: snapshot.balances?.[ACCOUNTS.founder.address] ?? null,
      faucet: snapshot.balances?.[ACCOUNTS.faucet.address] ?? null,
    },
    faucetInventory: snapshot?.balances?.[ACCOUNTS.faucet.address] ?? null,
    holders: snapshot?.holders ?? null,
    amm: xrpPool ? {
      account: xrpPool.amm,
      xrpReserve: xrpPool.xrpReserve,
      xtoReserve: xrpPool.xtoReserve,
      tradingFee: xrpPool.tradingFee,
      lpSupply: xrpPool.totalLp,
      ledgerIndex: xrpPool.ledgerIndex,
    } : {
      account: POOLS[0].amm,
      xrpReserve: null,
      xtoReserve: null,
      tradingFee: null,
      lpSupply: null,
      ledgerIndex: null,
    },
    liquidityPools: (snapshot?.pools ?? []).map((pool) => ({
      pair: pool.pair,
      ledgerIndex: pool.ledgerIndex,
      totalLpTokens: Number(pool.totalLp),
      burn: {
        address: pool.burn.address,
        sharePct: pool.burn.sharePct,
        blackholed: pool.burn.blackholed,
        verificationUrl: `https://livenet.xrpl.org/accounts/${pool.burn.address}`,
        livenetAccountUrl: `https://livenet.xrpl.org/accounts/${pool.burn.address}`,
      },
      marketMaker: {
        address: pool.marketMaker.address,
        sharePct: pool.marketMaker.sharePct,
        verificationUrl: `https://livenet.xrpl.org/accounts/${pool.marketMaker.address}`,
        livenetAccountUrl: `https://livenet.xrpl.org/accounts/${pool.marketMaker.address}`,
      },
      other: { sharePct: pool.other.sharePct },
    })),
    escrows: (snapshot?.escrows ?? []).map((escrow) => ({
      owner: escrow.owner,
      ownerAddress: escrow.ownerAddress,
      amount: Number(escrow.amount),
      currency: "XTO",
      finishAfter: escrow.finishAfter,
      tx: escrow.tx,
    })),
    ledgerIndex: snapshot?.ledgerIndex ?? null,
    updatedAt: snapshot?.checkedAt ?? new Date().toISOString(),
    source: "Validated XRPL Mainnet ledger",
    warnings,
    documents: {
      xrplLedgerToml: `${ORIGIN}/.well-known/xrp-ledger.toml`,
      issuerDid: `${ORIGIN}/did/issuer.json`,
      treasuryDid: `${ORIGIN}/did/treasury.json`,
      faucetDid: `${ORIGIN}/did/faucet.json`,
      founderDid: `${ORIGIN}/did/founder.json`,
    },
  };
}

export function serializeMetadata(snapshot) {
  return `${JSON.stringify(buildMetadata(snapshot), null, 2)}\n`;
}
