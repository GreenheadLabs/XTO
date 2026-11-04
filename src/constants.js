export const DOMAIN = "token.xrpltoken.com";
export const ORIGIN = `https://${DOMAIN}`;
export const APP_ORIGIN = "https://xrpltoken.com";
export const SUPPLY = "100000000000";
export const RIPPLE_EPOCH = 946684800;
export const BLACKHOLE_REGULAR_KEY = "rrrrrrrrrrrrrrrrrrrrBZbvji";
export const ACCOUNT_ZERO = "rrrrrrrrrrrrrrrrrrrrrhoLvTp";

export const FLAGS = {
  disableMaster: 0x00100000,
  noFreeze: 0x00200000,
  globalFreeze: 0x00400000,
  defaultRipple: 0x00800000,
  clawback: 0x80000000,
};

export const ACCOUNTS = {
  issuer: {
    role: "Issuer",
    label: "XTO issuer",
    address: "rXToZNbdmsPvYdcgJWCXHrfEDcLi8kVvt",
  },
  treasury: {
    role: "Treasury",
    label: "XTO treasury (50,000,000,000 XTO escrowed until 2027-09-25T01:00:00Z)",
    address: "rXToDb1PsivF5BVzeC9Aiz1AaMXZ7EPgf",
  },
  founder: {
    role: "Founder",
    label: "XTO founder (5,000,000,000 XTO escrowed until 2027-09-25T01:00:00Z)",
    address: "rXToxX97eckpJLqFxBBTt5mr6V93P4J1Z",
  },
  faucet: {
    role: "Faucet",
    label: "XTO faucet",
    address: "rXTos99bDZ9bj7hWe29BkPeoH2w5sKsu1",
  },
  burnXrp: {
    role: "LP burn XTO/XRP",
    label: "XTO/XRP LP burn (blackholed)",
    address: "rXToGnNKppJVw64Grz7baZMTbkod5Y9ZM",
  },
  burnRlusd: {
    role: "LP burn XTO/RLUSD",
    label: "XTO/RLUSD LP burn (blackholed)",
    address: "rXTopgrc4gpNke5dCxUXVm5rhTtrTtBMQ",
  },
  jim: {
    role: "Jim",
    label: "Jim — xrpltoken market-making account",
    address: "rJiMszsH9EzRpcQDV8FDHdgDYhZWUqxpY3",
  },
  bob: {
    role: "Bob",
    label: "Bob — xrpltoken market-making account",
    address: "rBoBpWZmrVGxfC4dUEvS75RTonG3fPhxsW",
  },
  greenhead: {
    role: "Greenhead",
    label: "Liquidity market-making account",
    address: "rGPXHA1Q7ccrLkUpFRAr9YAABcmA8ckVKB",
  },
};

export const POOLS = [
  {
    pair: "XTO/XRP",
    amm: "rHyaqbwkmYWHoJHNEBKAthFdyXYtWoFNxP",
    burn: ACCOUNTS.burnXrp.address,
  },
  {
    pair: "XTO/RLUSD",
    amm: "rwAtmQzgULwLzCJQGb7zdt1EgY55XMcMWV",
    burn: ACCOUNTS.burnRlusd.address,
  },
];

export const MARKET_MAKERS = [ACCOUNTS.jim, ACCOUNTS.bob, ACCOUNTS.greenhead];

/** Published escrow schedule. Live objects replace this when the ledger answers. */
export const RECORDED_ESCROWS = [
  {
    owner: "Treasury",
    ownerAddress: ACCOUNTS.treasury.address,
    amount: "25000000000",
    tx: "1606CE4F52E1BD9CD8449CC011CDF84A741B516F39F55BC6670AB1A2FCE1E864",
    finishAfter: "2027-09-25T01:00:00.000Z",
    createdAt: "2026-09-26T18:08:10.000Z",
  },
  {
    owner: "Treasury",
    ownerAddress: ACCOUNTS.treasury.address,
    amount: "25000000000",
    tx: "7379EE4BF57C8B398584E9E99A544639FBC0BF48ACF58A6DC99CCFDDC8E3342B",
    finishAfter: "2027-09-25T01:00:00.000Z",
    createdAt: "2026-09-25T01:02:30.000Z",
  },
  {
    owner: "Founder",
    ownerAddress: ACCOUNTS.founder.address,
    amount: "5000000000",
    tx: "B0BE57152B52E39392FC08446802D6527979B5E7E33BEF4E260588BB559068C4",
    finishAfter: "2027-09-25T01:00:00.000Z",
    createdAt: "2026-09-25T00:55:50.000Z",
  },
];

export const LOGO_FILES = [
  {
    href: "/xto-logo.png",
    title: "XTO logo",
    width: 512,
    height: 512,
    file: "public/xto-logo.png",
  },
  {
    href: "/xto-logo-1024.png",
    title: "XTO logo 1024",
    width: 1024,
    height: 1024,
    file: "public/xto-logo-1024.png",
  },
  {
    href: "/tokenphoto.jpg",
    title: "Token photo",
    width: 1024,
    height: 1024,
    file: "public/tokenphoto.jpg",
  },
];
