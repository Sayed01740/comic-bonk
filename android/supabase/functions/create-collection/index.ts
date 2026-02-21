
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "https://esm.sh/@solana/web3.js@1.90.0"
import { createCreateMasterEditionV3Instruction, createCreateMetadataAccountV3Instruction, PROGRAM_ID } from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.0"
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "https://esm.sh/@solana/spl-token@0.3.11"
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts"

const HELIUS_RPC_URL = Deno.env.get("HELIUS_RPC_URL")!;
const BACKEND_AUTHORITY_KEY = Deno.env.get("BACKEND_AUTHORITY_KEY")!; // Base64 encoded private key

serve(async (req: Request) => {
  try {
    const connection = new Connection(HELIUS_RPC_URL, "confirmed");
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(BACKEND_AUTHORITY_KEY)));

    // 1. Create Mint
    const mint = await createMint(
      connection,
      authority,
      authority.publicKey,
      authority.publicKey,
      0
    );

    // 2. Create Token Account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      authority.publicKey
    );

    // 3. Mint 1 token
    await mintTo(
      connection,
      authority,
      mint,
      tokenAccount.address,
      authority,
      1
    );

    // 4. Create Metadata
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      PROGRAM_ID
    );

    const createMetadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint: mint,
        mintAuthority: authority.publicKey,
        payer: authority.publicKey,
        updateAuthority: authority.publicKey,
      },
      {
        createMetadataAccountV2Args: {
          data: {
            name: "Comic Bonk Game Pass Collection",
            symbol: "CBGP",
            uri: "https://comicbonk.com/collection.json",
            sellerFeeBasisPoints: 0,
            creators: [{ address: authority.publicKey, verified: true, share: 100 }],
            collection: null,
            uses: null,
          },
          isMutable: true,
          updateAuthorityIsSigner: true,
        },
      }
    );

    // 5. Create Master Edition
    const [masterEditionAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      PROGRAM_ID
    );

    const createMasterEditionIx = createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionAddress,
        mint: mint,
        updateAuthority: authority.publicKey,
        mintAuthority: authority.publicKey,
        payer: authority.publicKey,
        metadata: metadataAddress,
      },
      {
        createMasterEditionArgs: {
          maxSupply: 0,
        },
      }
    );

    const tx = new Transaction().add(createMetadataIx, createMasterEditionIx);
    await sendAndConfirmTransaction(connection, tx, [authority]);

    return new Response(JSON.stringify({ collectionMint: mint.toBase58() }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
});
