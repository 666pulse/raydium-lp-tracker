import { Metaplex } from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";
import { MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";

const HTTP_URL = "";
const WSS_URL = "";

const OPENBOOK_PROGRAM_ID = "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX";
const raydiumAuthority = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";

const RAYDIUM_POOL_V4_PROGRAM_ID =
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM = new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);
const INSTRUCTION_NAME = "initialize2";

const SOL_TOKEN = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;

const conn = new Connection(HTTP_URL);
const wssConn = new Connection(HTTP_URL, {
  wsEndpoint: WSS_URL,
});

const metaplex = new Metaplex(conn);

async function startConnection(
  connection: Connection,
  programAddress: PublicKey,
  searchInstruction: string
): Promise<void> {
  console.log("Monitoring logs for program: ", programAddress.toString());

  connection.onLogs(
    programAddress,
    ({ logs, err, signature }) => {
      if (err) return;

      if (logs && logs.some((log) => log.includes(searchInstruction))) {
        console.log();
        console.log("--------------------");
        console.log(
          "Signature for initialize2:",
          `https://explorer.solana.com/tx/${signature}`
        );

        console.log(`https://solscan.io/tx/${signature}`);

        fetchRaydiumMints(signature, wssConn);
      }
    },
    "finalized"
  );
}

function findLogEntry(
  needle: string,
  logEntries: Array<string>
): string | null {
  for (const element of logEntries) {
    if (element.includes(needle)) {
      return element;
    }
  }

  return null;
}

function extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string): {
  nonce: number;
  open_time: number;
  init_pc_amount: number;
  init_coin_amount: number;
} {
  const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf("{");

  return JSON.parse(
    fixRelaxedJsonInLpLogEntry(
      lpLogEntry.substring(lpInitializationLogEntryInfoStart)
    )
  );
}

function fixRelaxedJsonInLpLogEntry(relaxedJson: string): string {
  return relaxedJson.replace(
    /([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    '$1"$2":'
  );
}

async function fetchMarketInfo(conn: Connection, marketId: PublicKey) {
  const marketAccountInfo = await conn.getAccountInfo(marketId);
  if (!marketAccountInfo) {
    throw new Error(
      "Failed to fetch market info for market id " + marketId.toBase58()
    );
  }

  return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
}

async function fetchRaydiumMints(txId: string, connection: Connection) {
  try {
    const tx = await connection.getParsedTransaction(txId, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    //@ts-ignore
    const accounts = tx?.transaction.message.instructions.find(
      (ix) => ix.programId.toBase58() === RAYDIUM_POOL_V4_PROGRAM_ID
    )?.programId as PublicKey[];

    if (!accounts) {
      console.log("No accounts found in the transaction");
      return;
    }

    const poolIndex = 4;
    const openOrdersIndex = 6;
    const lpMintIndex = 7;
    const tokenAIndex = 8;
    const tokenBIndex = 9;
    const baseVaultIndex = 10;
    const quoteVaultIndex = 11;
    const marketIdIndex = 16;
    const walletSignerIndex = 17;

    const poolAccount = accounts[poolIndex];
    const tokenA = accounts[tokenAIndex];
    const tokenB = accounts[tokenBIndex];
    const marketIdAccount = accounts[marketIdIndex];

    const poolAddr = poolAccount.toString();
    const mintAddr = tokenA.toString();
    const mintAddressPk = new PublicKey(mintAddr);

    const nft = await metaplex
      .nfts()
      .findByMint({ mintAddress: mintAddressPk });

    let name = nft.name;
    let symbol = nft.symbol;
    let uri = nft.uri;

    let updateAuthority = nft.updateAuthorityAddress?.toString();
    let mintAuthority = nft.mint.mintAuthorityAddress?.toString();
    let freezeAuthority = nft.mint.freezeAuthorityAddress?.toString();
    let decimals = nft.mint.decimals;

    const baseAndQuoteSwapped = tokenA.toBase58() === SOL_TOKEN;

    const lpInitializationLogEntryInfo =
      extractLPInitializationLogEntryInfoFromLogEntry(
        findLogEntry("init_pc_amount", tx?.meta?.logMessages ?? []) ?? ""
      );

    const initCoinAmount = lpInitializationLogEntryInfo.init_coin_amount;
    const initPcAmount = lpInitializationLogEntryInfo.init_pc_amount;
    const openTime = lpInitializationLogEntryInfo.open_time;

    let pnl = 0;
    if (baseAndQuoteSwapped) {
      pnl = initCoinAmount / 10 ** SOL_DECIMALS;
    } else {
      pnl = initPcAmount / 10 ** SOL_DECIMALS;
    }

    const displayData = [
      {
        pair1Addr: mintAddr,
        pair2Addr: tokenB.toBase58(),
        poolAddr: poolAddr,
        liquidity: `${pnl} SOL`,
        openTime: openTime,
        name: name,
        symbol: symbol,
        decimals: decimals,
        mintAuthority: mintAuthority,
        freezeAuthority: freezeAuthority,
      },
    ];

    console.log("New LP Found");
    console.table(displayData);
    console.log();

    // await fetchMarketInfo(connection, marketIdAccount);
  } catch {
    console.log("Error fetching transaction:", txId);
    return;
  }
}

startConnection(wssConn, RAYDIUM, INSTRUCTION_NAME).catch(console.error);
