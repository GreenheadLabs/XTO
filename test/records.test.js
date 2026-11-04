import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPLY } from "../src/constants.js";
import { decodeDomain, isBlackholed, readFlags } from "../src/ledger.js";
import { fromScaled, percentOf, sumScaled, toScaled } from "../src/format.js";
import { createServer } from "../src/server.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOML_SHA = "cb390e2cd97264f381b9fe2e018419ff5b77cb6997221f94cc922481d2a1804d";
const ISSUER_DID_SHA = "bb36ae0d1f815d05b99ac6ea11ef45c8b121c8106133caef056af63957558254";

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

async function withServer(getSnapshot, run) {
  const server = createServer({
    getSnapshot,
    now: () => new Date("2026-11-04T03:33:00.000Z"),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const offline = async () => null;

test("canonical toml and issuer DID hashes match the published domain", () => {
  const toml = readFileSync(path.join(root, "records/.well-known/xrp-ledger.toml"));
  const issuer = readFileSync(path.join(root, "records/did/issuer.json"));
  assert.equal(toml.length, 2161);
  assert.equal(sha256(toml), TOML_SHA);
  assert.equal(sha256(issuer), ISSUER_DID_SHA);
  assert.equal(toml.includes(Buffer.from("rXToZNbdmsPvYdcgJWCXHrfEDcLi8kVvt")), true);
});

test("domain hex and issuer flags describe a blackholed no-freeze account", () => {
  assert.equal(decodeDomain("746F6B656E2E7872706C746F6B656E2E636F6D"), "token.xrpltoken.com");
  const flags = readFlags(0x40b10000);
  assert.equal(flags.disableMaster, true);
  assert.equal(flags.noFreeze, true);
  assert.equal(flags.clawback, false);
  assert.equal(flags.defaultRipple, true);
  assert.equal(flags.globalFreeze, false);
  assert.equal(isBlackholed({
    flags: 0x40b10000,
    regularKey: "rrrrrrrrrrrrrrrrrrrrBZbvji",
    signerCount: 0,
  }), true);
  assert.equal(isBlackholed({ flags: 0x40b10000, regularKey: "rXToZNbdmsPvYdcgJWCXHrfEDcLi8kVvt", signerCount: 0 }), false);
});

test("allocation percents round against the fixed supply", () => {
  const escrow = toScaled("55000000000");
  const rest = toScaled("45000000000");
  assert.equal(fromScaled(sumScaled([escrow, rest])), SUPPLY);
  assert.equal(percentOf(escrow, toScaled(SUPPLY)), "55.00");
});

test("serves the ledger file, logo hash, and offline pages", async () => {
  await withServer(offline, async (base) => {
    const toml = await fetch(`${base}/.well-known/xrp-ledger.toml`);
    const body = Buffer.from(await toml.arrayBuffer());
    assert.equal(toml.status, 200);
    assert.equal(toml.headers.get("access-control-allow-origin"), "*");
    assert.equal(toml.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(sha256(body), TOML_SHA);

    const issuer = await fetch(`${base}/identity/did/issuer.json`);
    assert.equal(sha256(Buffer.from(await issuer.arrayBuffer())), ISSUER_DID_SHA);

    const home = await fetch(`${base}/`);
    const html = await home.text();
    assert.equal(home.status, 200);
    assert.match(html, new RegExp(TOML_SHA));
    assert.match(html, /Domain on ledger: check unavailable/);
    assert.match(html, /rXToZNbdmsPvYdcgJWCXHrfEDcLi8kVvt/);

    const photo = await fetch(`${base}/photo`);
    assert.match(await photo.text(), /97a70d85f5ea1f7d02678a8d02d4e472de9157de01cc47862725543623cedd5c/);

    const health = await fetch(`${base}/api/health`);
    assert.deepEqual(await health.json(), { status: "degraded", checkedAt: "2026-11-04T03:33:00.000Z" });

    const missing = await fetch(`${base}/api/nope`);
    assert.equal(missing.status, 404);

    const redirect = await fetch(`${base}/xto`, { redirect: "manual" });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get("location"), "https://xrpltoken.com/xto");
  });
});

test("tokenomics uses a ledger snapshot when one is available", async () => {
  const snapshot = {
    ledgerIndex: 108101852,
    checkedAt: "2026-11-04T03:33:00.000Z",
    stale: false,
    domain: "token.xrpltoken.com",
    domainMatches: true,
    issuer: {
      blackholed: true,
      masterKeyDisabled: true,
      regularKey: "rrrrrrrrrrrrrrrrrrrrBZbvji",
      noFreeze: true,
      globalFreeze: false,
      clawback: false,
      defaultRipple: true,
      transferRate: null,
      tickSize: 5,
    },
    balances: {
      rXToDb1PsivF5BVzeC9Aiz1AaMXZ7EPgf: "26992689614.02183",
      rXToxX97eckpJLqFxBBTt5mr6V93P4J1Z: "999603683.5318296",
      rXTos99bDZ9bj7hWe29BkPeoH2w5sKsu1: "9999990100",
      rJiMszsH9EzRpcQDV8FDHdgDYhZWUqxpY3: "1500000000",
      rBoBpWZmrVGxfC4dUEvS75RTonG3fPhxsW: "1500000000",
      rGPXHA1Q7ccrLkUpFRAr9YAABcmA8ckVKB: "999638291.0828491",
    },
    circulating: "3006780399.8684458897",
    holders: 46,
    escrows: [
      {
        owner: "Treasury",
        ownerAddress: "rXToDb1PsivF5BVzeC9Aiz1AaMXZ7EPgf",
        amount: "25000000000",
        tx: "1606CE4F52E1BD9CD8449CC011CDF84A741B516F39F55BC6670AB1A2FCE1E864",
        finishAfter: "2027-09-25T01:00:00.000Z",
        createdAt: "2026-09-26T18:08:10.000Z",
      },
      {
        owner: "Treasury",
        ownerAddress: "rXToDb1PsivF5BVzeC9Aiz1AaMXZ7EPgf",
        amount: "25000000000",
        tx: "7379EE4BF57C8B398584E9E99A544639FBC0BF48ACF58A6DC99CCFDDC8E3342B",
        finishAfter: "2027-09-25T01:00:00.000Z",
        createdAt: "2026-09-25T01:02:30.000Z",
      },
      {
        owner: "Founder",
        ownerAddress: "rXToxX97eckpJLqFxBBTt5mr6V93P4J1Z",
        amount: "5000000000",
        tx: "B0BE57152B52E39392FC08446802D6527979B5E7E33BEF4E260588BB559068C4",
        finishAfter: "2027-09-25T01:00:00.000Z",
        createdAt: "2026-09-25T00:55:50.000Z",
      },
    ],
    pools: [
      {
        pair: "XTO/XRP",
        amm: "rHyaqbwkmYWHoJHNEBKAthFdyXYtWoFNxP",
        ledgerIndex: 108101852,
        totalLp: "16508326.91420258",
        xtoReserve: "1114053.613595898",
        tradingFee: 500,
        xrpReserve: "264974022",
        burn: { address: "rXToGnNKppJVw64Grz7baZMTbkod5Y9ZM", balance: "15307173.60031865", sharePct: 92.72395, blackholed: true },
        marketMaker: { address: "rGPXHA1Q7ccrLkUpFRAr9YAABcmA8ckVKB", sharePct: 0 },
        other: { sharePct: 7.27605 },
      },
      {
        pair: "XTO/RLUSD",
        amm: "rwAtmQzgULwLzCJQGb7zdt1EgY55XMcMWV",
        ledgerIndex: 108101852,
        totalLp: "3058.246730877734",
        xtoReserve: "183857.8814495123",
        tradingFee: 500,
        xrpReserve: null,
        burn: { address: "rXTopgrc4gpNke5dCxUXVm5rhTtrTtBMQ", balance: "3058.246730877734", sharePct: 100, blackholed: true },
        marketMaker: { address: "rGPXHA1Q7ccrLkUpFRAr9YAABcmA8ckVKB", sharePct: 0 },
        other: { sharePct: 0 },
      },
    ],
    warnings: [],
  };

  await withServer(async () => snapshot, async (base) => {
    const home = await fetch(`${base}/`);
    assert.match(await home.text(), /Domain on ledger: token\.xrpltoken\.com\. Ledger #108101852\./);
    const page = await (await fetch(`${base}/tokenomics`)).text();
    assert.match(page, /Blackholed ✓/);
    assert.match(page, /55,000,000,000/);
    assert.match(page, /Sum check: 100,000,000,000 XTO\./);
    assert.match(page, /XTO\/RLUSD/);
    const metadata = await (await fetch(`${base}/metadata.json`)).json();
    assert.equal(metadata.domain, "token.xrpltoken.com");
    assert.equal(metadata.issuerStatus.blackholed, true);
    assert.equal(metadata.liquidityPools.length, 2);
  });
});
