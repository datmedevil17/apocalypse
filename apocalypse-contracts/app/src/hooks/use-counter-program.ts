import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { type Counter } from "../idl/counter";
import IDL from "../idl/counter.json";
import { useSessionKeyManager } from "@magicblock-labs/gum-react-sdk";

// ============================================================
// Constants
// ============================================================
const PROGRAM_ID = new PublicKey(IDL.address); // DcYYaAGLiY8BUMHeV9dziCdmJGgQCx3nUtiUyDG4jce4
const PROFILE_SEED = Buffer.from("profile");
const BATTLE_SEED = Buffer.from("battle");
const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

const ER_ENDPOINT = "https://devnet.magicblock.app";
const ER_WS_ENDPOINT = "wss://devnet.magicblock.app";

// ============================================================
// Types
// ============================================================
export interface ProfileAccount {
    authority: PublicKey;
    points: bigint;
    gameActive: boolean;
}

export interface BattleAccount {
    host: PublicKey;
    roomId: bigint;
    maxPlayers: number;
    playerCount: number;
    totalZombieKills: bigint;
    totalPoints: bigint;
    active: boolean;
}

export type DelegationStatus = "undelegated" | "delegated" | "checking";

// ============================================================
// PDA helpers (pure functions — no side effects)
// ============================================================
function deriveProfilePda(authority: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [PROFILE_SEED, authority.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

function deriveBattlePda(roomId: bigint): PublicKey {
    const roomIdBuf = Buffer.allocUnsafe(8);
    roomIdBuf.writeBigUInt64LE(roomId);
    const [pda] = PublicKey.findProgramAddressSync(
        [BATTLE_SEED, roomIdBuf],
        PROGRAM_ID
    );
    return pda;
}

function parseBattleRaw(raw: any): BattleAccount {
    return {
        host: raw.host,
        roomId: BigInt(raw.roomId.toString()),
        maxPlayers: raw.maxPlayers,
        playerCount: raw.playerCount,
        totalZombieKills: BigInt(raw.totalZombieKills.toString()),
        totalPoints: BigInt(raw.totalPoints.toString()),
        active: raw.active,
    };
}

// ============================================================
// Hook
// ============================================================
export function useCounterProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    // ---- State ----
    const [profilePubkey, setProfilePubkey] = useState<PublicKey | null>(null);
    const [profileAccount, setProfileAccount] = useState<ProfileAccount | null>(null);
    const [delegationStatus, setDelegationStatus] = useState<DelegationStatus>("checking");
    const [erProfilePoints, setErProfilePoints] = useState<bigint | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ---- ER Connection (stable reference) ----
    const erConnection = useMemo(() => new Connection(ER_ENDPOINT, {
        wsEndpoint: ER_WS_ENDPOINT,
        commitment: "confirmed",
    }), []);

    // ---- Base layer provider + program ----
    const program = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
        const provider = new AnchorProvider(connection, {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        }, { commitment: "confirmed" });
        setProvider(provider);
        return new Program<Counter>(IDL as Counter, provider);
    }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

    // ---- ER provider + program ----
    const erProvider = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
        return new AnchorProvider(erConnection, {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        }, { commitment: "confirmed" });
    }, [erConnection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

    const erProgram = useMemo(() => {
        if (!erProvider) return null;
        return new Program<Counter>(IDL as Counter, erProvider);
    }, [erProvider]);

    // ---- Session Keys ----
    const sessionWallet = useSessionKeyManager(wallet as any, connection, "devnet");
    const { sessionToken, createSession: sdkCreateSession, isLoading: isSessionLoading } = sessionWallet;

    const createSession = useCallback(async (): Promise<string> => {
        await sdkCreateSession(PROGRAM_ID);
        return "session-created";
    }, [sdkCreateSession]);

    // ---- Auto-derive profile PDA ----
    useEffect(() => {
        if (wallet.publicKey) {
            setProfilePubkey(deriveProfilePda(wallet.publicKey));
        } else {
            setProfilePubkey(null);
            setProfileAccount(null);
            setDelegationStatus("checking");
        }
    }, [wallet.publicKey]);

    // ---- Fetch profile from base layer ----
    const fetchProfile = useCallback(async () => {
        if (!program || !profilePubkey) { setProfileAccount(null); return; }
        try {
            const raw = await program.account.profile.fetch(profilePubkey);
            setProfileAccount({
                authority: raw.authority,
                points: BigInt(raw.points.toString()),
                gameActive: raw.gameActive,
            });
            setError(null);
        } catch {
            setProfileAccount(null);
        }
    }, [program, profilePubkey]);

    // ---- Check delegation status ----
    const checkDelegationStatus = useCallback(async () => {
        if (!profilePubkey) { setDelegationStatus("checking"); return; }
        try {
            setDelegationStatus("checking");
            const info = await connection.getAccountInfo(profilePubkey);
            if (!info) { setDelegationStatus("undelegated"); setErProfilePoints(null); return; }
            const delegated = info.owner.equals(DELEGATION_PROGRAM_ID);
            if (delegated) {
                setDelegationStatus("delegated");
                if (erProgram) {
                    try {
                        const erRaw = await erProgram.account.profile.fetch(profilePubkey);
                        setErProfilePoints(BigInt(erRaw.points.toString()));
                    } catch { /* ER not yet synced */ }
                }
            } else {
                setDelegationStatus("undelegated");
                setErProfilePoints(null);
            }
        } catch {
            setDelegationStatus("undelegated");
        }
    }, [profilePubkey, connection, erProgram]);

    // ---- Base layer WS: profile changes ----
    useEffect(() => {
        if (!program || !profilePubkey) return;
        fetchProfile();
        checkDelegationStatus();
        const sub = connection.onAccountChange(profilePubkey, (info) => {
            try {
                const decoded = program.coder.accounts.decode("profile", info.data);
                setProfileAccount({
                    authority: decoded.authority,
                    points: BigInt(decoded.points.toString()),
                    gameActive: decoded.gameActive,
                });
                checkDelegationStatus();
            } catch (e) { console.error("Failed to decode profile:", e); }
        }, "confirmed");
        return () => { connection.removeAccountChangeListener(sub); };
    }, [program, profilePubkey, connection, fetchProfile, checkDelegationStatus]);

    // ---- ER WS: profile changes (when delegated) ----
    useEffect(() => {
        if (!erProgram || !profilePubkey || delegationStatus !== "delegated") return;
        const sub = erConnection.onAccountChange(profilePubkey, (info) => {
            try {
                const decoded = erProgram.coder.accounts.decode("profile", info.data);
                setErProfilePoints(BigInt(decoded.points.toString()));
                setProfileAccount({
                    authority: decoded.authority,
                    points: BigInt(decoded.points.toString()),
                    gameActive: decoded.gameActive,
                });
            } catch (e) { console.error("Failed to decode ER profile:", e); }
        }, "confirmed");
        return () => { erConnection.removeAccountChangeListener(sub); };
    }, [erProgram, profilePubkey, erConnection, delegationStatus]);

    // ============================================================
    // ER transaction helper
    // Builds the tx from the base-layer program (so discriminator is
    // correct), sets blockhash + feePayer, then signs + sends to ER.
    // forceWalletSigning=true → always use main wallet (for instructions
    // that have `payer: Signer` with no session macro, e.g. CommitProfile).
    // ============================================================
    const sendErTx = useCallback(async (
        txBuilder: { transaction: () => Promise<Transaction> },
        label: string,
        forceWalletSigning = false
    ): Promise<string> => {
        if (!erProvider || !wallet.publicKey) throw new Error("Wallet not connected");
        setIsLoading(true);
        setError(null);
        try {
            let tx = await txBuilder.transaction();

            // Prepend compute budget to avoid ER compute exhaustion
            const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
            tx = new Transaction().add(computeIx, ...tx.instructions);

            const useSession = !forceWalletSigning && !!sessionToken && !!sessionWallet?.publicKey && !!sessionWallet?.signTransaction;
            tx.feePayer = useSession ? (sessionWallet.publicKey ?? undefined) : wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

            if (useSession && sessionWallet.signTransaction) {
                tx = await sessionWallet.signTransaction(tx);
            } else {
                tx = await erProvider.wallet.signTransaction(tx);
            }

            const sig = await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
            await erConnection.confirmTransaction(sig, "confirmed");
            return sig;
        } catch (err) {
            const msg = err instanceof Error ? err.message : `Failed: ${label}`;
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [erProvider, erConnection, wallet.publicKey, sessionToken, sessionWallet]);

    // ============================================================
    // Single-player instructions
    // ============================================================

    /** Initialize player profile on base layer (one-time). */
    const initializeProfile = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        setIsLoading(true);
        setError(null);
        try {
            const sig = await program.methods
                .initializeProfile()
                .accounts({ authority: wallet.publicKey })
                .rpc();
            await fetchProfile();
            return sig;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to initialize profile";
            setError(msg); throw err;
        } finally { setIsLoading(false); }
    }, [program, wallet.publicKey, fetchProfile]);

    /** Delegate player profile PDA to Ephemeral Rollup (base layer tx). */
    const delegateGame = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        setIsLoading(true);
        setIsDelegating(true);
        setError(null);
        try {
            const sig = await program.methods
                .delegateGame()
                .accounts({ payer: wallet.publicKey })
                .rpc({ skipPreflight: true });
            await new Promise(r => setTimeout(r, 2000));
            await checkDelegationStatus();
            return sig;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delegate game";
            setError(msg); throw err;
        } finally { setIsLoading(false); setIsDelegating(false); }
    }, [program, wallet.publicKey, checkDelegationStatus]);

    /** Mark game as active on ER. Session key supported. */
    const startGame = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !profilePubkey) throw new Error("Profile not found");
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        const sig = await sendErTx(
            program.methods.startGame().accounts({
                profile: profilePubkey,
                signer,
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "start game"
        );
        // Immediate ER re-read so UI flips gameActive without waiting for WS
        if (erProgram) {
            try {
                const raw = await erProgram.account.profile.fetch(profilePubkey);
                setProfileAccount({ authority: raw.authority, points: BigInt(raw.points.toString()), gameActive: raw.gameActive });
                setErProfilePoints(BigInt(raw.points.toString()));
            } catch { /* ignore — WS will catch it */ }
        }
        return sig;
    }, [program, erProgram, wallet.publicKey, profilePubkey, sessionToken, sessionWallet, sendErTx]);

    /** Award points for killing a zombie (ER, session key). */
    const killZombie = useCallback(async (reward: number): Promise<string> => {
        if (!program || !wallet.publicKey || !profilePubkey) throw new Error("Profile not found");
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.killZombie(new BN(reward)).accounts({
                profile: profilePubkey,
                signer,
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "kill zombie"
        );
    }, [program, wallet.publicKey, profilePubkey, sessionToken, sessionWallet, sendErTx]);

    /** End game session (ER, session key). */
    const endGame = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !profilePubkey) throw new Error("Profile not found");
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.endGame().accounts({
                profile: profilePubkey,
                signer,
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "end game"
        );
    }, [program, wallet.publicKey, profilePubkey, sessionToken, sessionWallet, sendErTx]);

    /** Commit + undelegate profile back to base (ER → Base).
     *  CommitProfile has `payer: Signer` — always uses main wallet (forceWalletSigning).
     *  Manual sendErTx path: wallet sign-only, send directly to erConnection.
     *  (erProgram.rpc() fails because Phantom rejects the devnet.magicblock.app cluster.) */
    const undelegateGame = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !profilePubkey) throw new Error("Profile not found");
        const sig = await sendErTx(
            program.methods.undelegateGame().accounts({
                payer: wallet.publicKey,
                profile: profilePubkey,
            } as any),
            "undelegate game",
            true // forceWalletSigning — CommitProfile.payer: Signer, no session macro
        );
        await new Promise(r => setTimeout(r, 2000));
        setDelegationStatus("undelegated");
        setErProfilePoints(null);
        await fetchProfile();
        return sig;
    }, [program, wallet.publicKey, profilePubkey, sendErTx, fetchProfile]);

    // ============================================================
    // Multiplayer battle instructions
    // ============================================================

    /** Create a shared battle room on base layer. Host only. */
    const createBattleAccount = useCallback(async (roomId: bigint, maxPlayers: number): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        setIsLoading(true);
        setError(null);
        try {
            return await program.methods
                .createBattleAccount(new BN(roomId.toString()), maxPlayers)
                .accounts({ host: wallet.publicKey })
                .rpc();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create battle account";
            setError(msg); throw err;
        } finally { setIsLoading(false); }
    }, [program, wallet.publicKey]);

    /** Delegate battle PDA to ER. Host only, base layer tx. */
    const delegateBattleAccount = useCallback(async (roomId: bigint): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        setIsLoading(true);
        setError(null);
        try {
            const sig = await program.methods
                .delegateBattleAccount(new BN(roomId.toString()))
                .accounts({ payer: wallet.publicKey })
                .rpc({ skipPreflight: true });
            await new Promise(r => setTimeout(r, 2000));
            return sig;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delegate battle account";
            setError(msg); throw err;
        } finally { setIsLoading(false); }
    }, [program, wallet.publicKey]);

    /** Start the multiplayer battle (host only, ER).
     *  #[session_auth_or] is on the instruction — host's session key is accepted. */
    const startMultiplayerBattle = useCallback(async (roomId: bigint): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        const battlePubkey = deriveBattlePda(roomId);
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.startMultiplayerBattle().accounts({
                battle: battlePubkey,
                signer,
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "start multiplayer battle"
        );
    }, [program, wallet.publicKey, sessionToken, sessionWallet, sendErTx]);

    /** Join an active battle room (ER).
     *  PlayerBattleAction: pass authority = player's wallet so their own session key is accepted. */
    const joinBattle = useCallback(async (roomId: bigint): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        const battlePubkey = deriveBattlePda(roomId);
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.joinBattle().accounts({
                battle: battlePubkey,
                signer,
                authority: wallet.publicKey, // player's own wallet — session authority
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "join battle"
        );
    }, [program, wallet.publicKey, sessionToken, sessionWallet, sendErTx]);

    /** Kill a zombie in multiplayer mode (ER, session key).
     *  PlayerBattleAction: pass authority = player's wallet so their own session key is accepted. */
    const killZombieBattle = useCallback(async (roomId: bigint, reward: number): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        const battlePubkey = deriveBattlePda(roomId);
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.killZombieBattle(new BN(reward)).accounts({
                battle: battlePubkey,
                signer,
                authority: wallet.publicKey, // player's own wallet — session authority
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "kill zombie battle"
        );
    }, [program, wallet.publicKey, sessionToken, sessionWallet, sendErTx]);

    /** Step 1: End battle — sets active=false on ER. Host only, session key supported. */
    const endBattle = useCallback(async (roomId: bigint): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        const battlePubkey = deriveBattlePda(roomId);
        const useSession = !!sessionToken && !!sessionWallet?.publicKey;
        const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
        return sendErTx(
            program.methods.endBattle().accounts({
                battle: battlePubkey,
                signer,
                sessionToken: useSession ? sessionToken : null,
            } as any),
            "end battle"
        );
    }, [program, wallet.publicKey, sessionToken, sessionWallet, sendErTx]);

    /** Step 2: Commit + undelegate battle account (ER → Base).
     *  Pure commit — NO state writes to battle. State was already updated by endBattle.
     *  Separating write and commit avoids the ER ownership-transfer conflict.
     *  CommitBattle.payer: Signer — always uses main wallet (forceWalletSigning). */
    const commitBattle = useCallback(async (roomId: bigint): Promise<string> => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        const battlePubkey = deriveBattlePda(roomId);
        const sig = await sendErTx(
            program.methods.commitBattle().accounts({
                payer: wallet.publicKey,
                battle: battlePubkey,
            } as any),
            "commit battle",
            true // forceWalletSigning — CommitBattle.payer: Signer
        );
        await new Promise(r => setTimeout(r, 2000));
        return sig;
    }, [program, wallet.publicKey, sendErTx]);

    // ============================================================
    // Battle account fetch helpers
    // ============================================================

    /** Fetch battle account from the base layer. */
    const fetchBattleAccount = useCallback(async (roomId: bigint): Promise<BattleAccount | null> => {
        if (!program) return null;
        try {
            const raw = await program.account.battle.fetch(deriveBattlePda(roomId));
            return parseBattleRaw(raw);
        } catch { return null; }
    }, [program]);

    /** Fetch battle account from the Ephemeral Rollup (live state while delegated). */
    const fetchBattleAccountEr = useCallback(async (roomId: bigint): Promise<BattleAccount | null> => {
        if (!erProgram) return null;
        try {
            const raw = await erProgram.account.battle.fetch(deriveBattlePda(roomId));
            return parseBattleRaw(raw);
        } catch { return null; }
    }, [erProgram]);

    // ============================================================
    // Expose
    // ============================================================
    return {
        program,
        erProgram,
        erConnection,

        // Profile state
        profilePubkey,
        profileAccount,
        delegationStatus,
        erProfilePoints,

        // Single-player
        initializeProfile,
        delegateGame,
        startGame,
        killZombie,
        endGame,
        undelegateGame,

        // Multiplayer
        createBattleAccount,
        delegateBattleAccount,
        startMultiplayerBattle,
        joinBattle,
        killZombieBattle,
        endBattle,
        commitBattle,
        fetchBattleAccount,
        fetchBattleAccountEr,
        deriveBattlePda,

        // Session
        createSession,
        sessionToken,
        isSessionLoading,

        // UI state
        isLoading,
        isDelegating,
        error,

        // Utils
        refetch: fetchProfile,
        checkDelegation: checkDelegationStatus,
    };
}
