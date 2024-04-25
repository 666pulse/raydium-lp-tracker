import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import {
  TOKEN_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V3,
  Market,
  LiquidityPoolKeysV4,
} from "@raydium-io/raydium-sdk";

const RAYDIUM_POOL_V4_PROGRAM_ID =
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const HTTP_URL = ""
const WSS_URL = ""

const RAYDIUM = new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);
const INSTRUCTION_NAME = "initialize2";

const conn = new Connection(HTTP_URL);
const wssConn = new Connection(HTTP_URL, {
  wsEndpoint: WSS_URL,
});

const metaplex = new Metaplex(conn);

async function startConnection(
  connection: Connection,
  programAddress: PublicKey,
  searchInstruction: string,
): Promise<void> {
  console.log("Monitoring logs for program:", programAddress.toString());

  connection.onLogs(
    programAddress,
    ({ logs, err, signature }) => {
      if (err) return;

      if (logs && logs.some((log) => log.includes(searchInstruction))) {
        console.log(
          "Signature for initialize2:",
          `https://explorer.solana.com/tx/${signature}`,
        );
        fetchRaydiumMints(signature, wssConn);
      }
    },
    "finalized",
  );
}

async function fetchMarketInfo(conn: Connection, marketId: PublicKey) {
  const marketAccountInfo = await conn.getAccountInfo(marketId);
  if (!marketAccountInfo) {
    throw new Error(
      "Failed to fetch market info for market id " + marketId.toBase58(),
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
   const accounts = (tx?.transaction.message.instructions).find(ix => ix.programId.toBase58() === RAYDIUM_POOL_V4_PROGRAM_ID).accounts as PublicKey[];

    if (!accounts) {
      console.log("No accounts found in the transaction.");
      return;
    }

    const poolIndex = 4;
    const marketIdIndex = 16;
    const lpMintIndex = 7;
    const tokenAIndex = 8;
    const tokenBIndex = 9;

    // console.log("accounts: ", accounts);

    const poolAddrPk = accounts[poolIndex];
    const tokenA = accounts[tokenAIndex];
    const tokenB = accounts[tokenBIndex];
    const marketIdPk = accounts[marketIdIndex];

    const poolAddr = poolAddrPk.toString();
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

    const displayData = [
      {
        Addr: mintAddr,
        poolAddr: poolAddr,
        name: name,
        symbol: symbol,
        decimals: decimals,
        mintAuthority: mintAuthority,
        freezeAuthority: freezeAuthority,
      },
      { Addr: tokenB.toBase58() },
    ];

    console.log("New LP Found");
    console.table(displayData);
    console.log();

    const marketInfo = await fetchMarketInfo(connection, marketIdPk);

    console.log(/marketInfo/);
    console.log(marketInfo);
    console.log(/marketInfo/);
  } catch {
    console.log("Error fetching transaction:", txId);
    return;
  }
}

startConnection(wssConn, RAYDIUM, INSTRUCTION_NAME).catch(console.error);
