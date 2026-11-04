# XTO records

Public source for [token.xrpltoken.com](https://token.xrpltoken.com/), the issuer domain the XRP Ledger reads for XTO.

The app (faucet, DEX, accounts) stays at [xrpltoken.com](https://xrpltoken.com/). Paths on this host that are not records redirect there.

## What is published

| URL | File |
| --- | --- |
| `/.well-known/xrp-ledger.toml` | `records/.well-known/xrp-ledger.toml` |
| `/.well-known/did.json` | `records/.well-known/did.json` |
| `/.well-known/did-configuration.json` | `records/.well-known/did-configuration.json` |
| `/did/issuer.json` and `/identity/did/issuer.json` | `records/did/issuer.json` |
| `/did/treasury.json` and `/identity/did/treasury.json` | `records/did/treasury.json` |
| `/did/founder.json` and `/identity/did/founder.json` | `records/did/founder.json` |
| `/did/faucet.json` and `/identity/did/faucet.json` | `records/did/faucet.json` |
| `/identity/did/org.json` | `records/identity/did/org.json` |
| `/`, `/photo`, `/tokenomics` | Rendered from those records |
| `/token.json` and `/metadata.json` | Live ledger summary |

Issuer: `rXToZNbdmsPvYdcgJWCXHrfEDcLi8kVvt`

The TOML, DID documents, and logo files are the canonical bytes. Their sha256 values are shown on the site.

## Ledger reads

Tokenomics, the domain check, and `token.json` come from the public validated ledger. No keys are used. `XRPL_RPC` is a comma-separated list of JSON-RPC endpoints. The default is `https://xrplcluster.com`, then `https://s1.ripple.com:51234` and `https://s2.ripple.com:51234`.

Results are cached for 30 seconds. If every endpoint fails, the pages still serve the files and say the ledger check is unavailable. `/api/health` reports `ok` or `degraded`.

## Run

```bash
node src/server.js
```

`PORT` defaults to `8080`. Then open `http://127.0.0.1:8080/`.

```bash
node --test
```
