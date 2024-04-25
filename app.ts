import { Connection, PublicKey } from "@solana/web3.js";

const RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const HTTP_URL = ""
const WSS_URL = ""

const RAYDIUM = new PublicKey(RAYDIUM_PUBLIC_KEY);
const INSTRUCTION_NAME = "initialize2";

const connection = new Connection(HTTP_URL, {
  wsEndpoint: WSS_URL,
});

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
        fetchRaydiumMints(signature, connection);
      }
    },
    "finalized",
  );
}

async function fetchRaydiumMints(txId: string, connection: Connection) {
  try {
    const tx = await connection.getParsedTransaction(txId, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

   //@ts-ignore
   const accounts = (tx?.transaction.message.instructions).find(ix => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY).accounts as PublicKey[];

    if (!accounts) {
      console.log("No accounts found in the transaction.");
      return;
    }

    const tokenAIndex = 8;
    const tokenBIndex = 9;

    console.log("accounts: ", accounts);

    const tokenAAccount = accounts[tokenAIndex];
    const tokenBAccount = accounts[tokenBIndex];

    const displayData = [
      { Token: "A", "Account Public Key": tokenAAccount.toBase58() },
      { Token: "B", "Account Public Key": tokenBAccount.toBase58() },
    ];

    console.log("New LP Found");
    console.table(displayData);
    console.log();
  } catch {
    console.log("Error fetching transaction:", txId);
    return;
  }
}

startConnection(connection, RAYDIUM, INSTRUCTION_NAME).catch(console.error);

// https://www.quicknode.com/guides/solana-development/3rd-party-integrations/track-raydium-lps
