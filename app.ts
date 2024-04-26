import {
  Connection,
  PublicKey,
  ParsedInstruction,
  ParsedInnerInstruction,
} from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { OpenOrders } from "@project-serum/serum";
import {
  Market,
  TOKEN_PROGRAM_ID,
  LiquidityPoolKeysV4,
  MARKET_STATE_LAYOUT_V3,
} from "@raydium-io/raydium-sdk";

const HTTP_URL = ""
const WSS_URL = ""

const RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const OPENBOOK_PROGRAM_ID = "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX";
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

function findMintToInInnerInstructionsByMintAddress(
  innerInstructions: Array<ParsedInnerInstruction>,
  mintAddress: PublicKey,
): ParsedInstruction | null {
  for (let i = 0; i < innerInstructions.length; i++) {
    for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
      const instruction = innerInstructions[i].instructions[
        y
      ] as ParsedInstruction;
      if (!instruction.parsed) {
        continue;
      }
      if (
        instruction.parsed.type === "mintTo" &&
        instruction.parsed.info.mint === mintAddress.toBase58()
      ) {
        return instruction;
      }
    }
  }

  return null;
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
    const openOrdersIndex = 6;
    const lpMintIndex = 7;
    const tokenAIndex = 8;
    const tokenBIndex = 9;
    const marketIdIndex = 16;

    // console.log("accounts: ", accounts);

    const poolAddrPk = accounts[poolIndex];
    const tokenA = accounts[tokenAIndex];
    const tokenB = accounts[tokenBIndex];
    const marketIdPk = accounts[marketIdIndex];
    const openOrdersAccount = accounts[openOrdersIndex];
    const lpMintAccount = accounts[lpMintIndex];

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
    console.log(JSON.stringify(marketInfo));
    console.log(/marketInfo/);

    const lpMintInstruction = findMintToInInnerInstructionsByMintAddress(
      tx?.meta?.innerInstructions ?? [],
      lpMintAccount,
    );
    if (!lpMintInstruction) {
      throw new Error("Failed to find lp mint to instruction in lp init tx");
    }

    const _baseTokenAmount = await connection.getTokenAccountBalance(
      new PublicKey(marketInfo.baseVault),
    );

    const _quoteTokenAmount = await connection.getTokenAccountBalance(
      new PublicKey(marketInfo.quoteVault),
    );

    const lpVaultAccount = new PublicKey(lpMintInstruction.parsed.info.account);
    const _lpVault = await connection.getTokenAccountBalance(lpVaultAccount);

    const baseTokenAmount = _baseTokenAmount.value?.uiAmount;
    const quoteTokenAmount = _quoteTokenAmount.value?.uiAmount;
    const lpVault = _lpVault.value?.uiAmount;

    console.log();
    console.log(baseTokenAmount);
    console.log(quoteTokenAmount);
    console.log(lpVault);
    console.log();

    const openOrders = await OpenOrders.load(
      connection,
      openOrdersAccount,
      new PublicKey(OPENBOOK_PROGRAM_ID),
    );

    console.log(/openOrders/);
    console.log(JSON.stringify(openOrders));
    console.log(/openOrders/);

  } catch {
    console.log("Error fetching transaction:", txId);
    return;
  }
}

startConnection(wssConn, RAYDIUM, INSTRUCTION_NAME).catch(console.error);
