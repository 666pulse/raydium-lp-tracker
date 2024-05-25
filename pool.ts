import assert from "assert";
import Decimal from "decimal.js";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  Market,
  Liquidity,
  ApiPoolInfoV4,
  jsonInfo2PoolKeys,
  LiquidityPoolKeys,
  SPL_MINT_LAYOUT,
  MARKET_STATE_LAYOUT_V3,
  LIQUIDITY_STATE_LAYOUT_V4,
} from "@raydium-io/raydium-sdk";

const rpc = "";
const connection = new Connection(rpc);

async function formatAmmKeysById(
  id: string,
  conn: Connection,
): Promise<ApiPoolInfoV4> {
  const account = await conn.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount = await conn.getAccountInfo(marketId);
  if (marketAccount === null) throw Error(" get market info error");
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = info.lpMint;
  const lpMintAccount = await conn.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint.toString(),
    quoteMint: info.quoteMint.toString(),
    lpMint: info.lpMint.toString(),
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: account.owner,
    }).publicKey.toString(),
    openOrders: info.openOrders.toString(),
    targetOrders: info.targetOrders.toString(),
    baseVault: info.baseVault.toString(),
    quoteVault: info.quoteVault.toString(),
    withdrawQueue: info.withdrawQueue.toString(),
    lpVault: info.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: info.marketProgramId.toString(),
    marketId: info.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
}

async function main() {
  // https://v2.raydium.io/pools/
  // https://v2.raydium.io/liquidity/add/?coin0=sol&coin1=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB&fixed=coin0&ammId=7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX

  // 7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX
  const targetPool = "7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX";

  console.log("\n", targetPool);

  const targetPoolInfo = await formatAmmKeysById(targetPool, connection);
  assert(targetPoolInfo, "can not find the target pool");

  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys });

  let baseF = 10 ** extraPoolInfo.baseDecimals;
  let quoteF = 10 ** extraPoolInfo.quoteDecimals;

  const info = {
    time: new Date().toISOString(),
    baseMint: poolKeys.baseMint.toString(),
    quoteMint: poolKeys.quoteMint.toString(),
    baseReserve: new Decimal(extraPoolInfo.baseReserve.toString())
      .div(baseF)
      .toString(),
    quoteReserve: new Decimal(extraPoolInfo.quoteReserve.toString())
      .div(quoteF)
      .toString(),
  };

  console.table(info);
  console.log();
}

main();
