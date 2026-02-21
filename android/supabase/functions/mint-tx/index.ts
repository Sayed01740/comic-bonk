
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "https://esm.sh/@solana/web3.js@1.90.0";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
} from "https://esm.sh/@solana/spl-token@0.3.11";
import {
  createCreateMetadataAccountV3Instruction,
  createVerifySizedCollectionItemInstruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.0";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// Helper function to safely parse environment variables
const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

// --- Environment & Constants ---
const HELIUS_RPC_URL = getEnv("HELIUS_RPC_URL");
const BACKEND_AUTHORITY_SECRET_KEY = getEnv("BACKEND_AUTHORITY_KEY");
const COLLECTION_MINT_ADDRESS = getEnv("COLLECTION_MINT");
const TREASURY_WALLET_ADDRESS = getEnv("TREASURY_WALLET");

const MINT_PRICE_LAMPORTS = 1000000; // 0.001 SOL
const NFT_NAME = "Game Pass";
const NFT_SYMBOL = "PASS";
const NFT_URI = "https://comicbonk.com/game-pass.json"; // Example URI

serve(async (req: Request) => {
  try {
    const { walletPublicKey } = await req.json();
    if (!walletPublicKey) {
      throw new Error("Missing walletPublicKey");
    }

    // --- Initializations ---
    const connection = new Connection(HELIUS_RPC_URL, "confirmed");
    const feePayer = new PublicKey(walletPublicKey);
    const treasury = new PublicKey(TREASURY_WALLET_ADDRESS);
    const collectionMint = new PublicKey(COLLECTION_MINT_ADDRESS);

    // Decode backend authority key
    const backendAuthority = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(BACKEND_AUTHORITY_SECRET_KEY))
    );

    // --- New NFT Accounts ---
    const nftMint = Keypair.generate();
    const userAta = await getAssociatedTokenAddress(nftMint.publicKey, feePayer);

    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const [collectionMetadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from("edition"),
      ],
      METADATA_PROGRAM_ID
    );

    // --- Transaction Instructions ---
    const tx = new Transaction();

    // 1. Transfer SOL to Treasury
    tx.add(
      SystemProgram.transfer({
        fromPubkey: feePayer,
        toPubkey: treasury,
        lamports: MINT_PRICE_LAMPORTS,
      })
    );

    // 2. Create Mint Account for the NFT
    const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: feePayer,
        newAccountPubkey: nftMint.publicKey,
        space: 82, // Mint account size
        lamports: rentLamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      // 3. Initialize the Mint Account
      createInitializeMintInstruction(
        nftMint.publicKey,
        0, // 0 decimals for NFT
        backendAuthority.publicKey, // Mint Authority
        backendAuthority.publicKey  // Freeze Authority
      )
    );

    // 4. Create User's Associated Token Account
    tx.add(
      createAssociatedTokenAccountInstruction(
        feePayer,
        userAta,
        feePayer,
        nftMint.publicKey
      )
    );

    // 5. Create NFT Metadata
    tx.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataAddress,
          mint: nftMint.publicKey,
          mintAuthority: backendAuthority.publicKey,
          payer: feePayer,
          updateAuthority: backendAuthority.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: NFT_NAME,
              symbol: NFT_SYMBOL,
              uri: NFT_URI,
              sellerFeeBasisPoints: 0,
              creators: [{ address: backendAuthority.publicKey, verified: true, share: 100 }],
              collection: { verified: false, key: collectionMint },
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );

    // 6. Mint 1 Token to User's ATA
    tx.add(
      createMintToInstruction(
        nftMint.publicKey,
        userAta,
        backendAuthority.publicKey,
        1
      )
    );

    // 7. Verify the NFT is part of the collection
    tx.add(
      createVerifySizedCollectionItemInstruction({
        payer: feePayer,
        metadata: metadataAddress,
        collectionMint: collectionMint,
        collection: collectionMetadataAddress,
        collectionMasterEdition: collectionMasterEdition,
        collectionAuthority: backendAuthority.publicKey,
      })
    );


    // --- Finalize and Sign ---
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = feePayer;

    // The backend authority signs for minting and collection verification
    // The new mint account keypair signs for its own creation
    tx.partialSign(backendAuthority, nftMint);

    // --- Serialize and Return ---
    const serializedTx = tx.serialize({
      requireAllSignatures: false, // User signature is still needed
    });
    const txBase64 = Buffer.from(serializedTx).toString("base64");

    return new Response(JSON.stringify({ txBase64: txBase64 }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
