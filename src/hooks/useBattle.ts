import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { useGameProgram, BATTLE_SEED } from './useGameProgram';
import { useSessionKeyManager } from '@magicblock-labs/gum-react-sdk';
import { useStore } from '../store';
import { useToastTx } from '../components/Toast';

export const useBattle = () => {
    const { program, wallet, erConnection, erProgram } = useGameProgram();
    const { connection } = useConnection();

    // Mock the wallet publicKey to prevent Gum SDK IndexedDB from throwing
    const sessionDummyWallet = useMemo(() => {
        return {
            ...wallet,
            publicKey: wallet?.publicKey || new PublicKey("11111111111111111111111111111111")
        };
    }, [wallet]);

    const sessionWallet = useSessionKeyManager(sessionDummyWallet as any, connection, "devnet");
    const { sessionToken } = sessionWallet;
    const { setBattleRoomId, setIsHost, setMaxPlayers, setPlayerCount } = useStore();

    const [isBattleLoading, setIsBattleLoading] = useState(false);
    const [battleAccount, setBattleAccount] = useState<any>(null);
    const [isBattleDelegated, setIsBattleDelegated] = useState(false);
    const toastTx = useToastTx();

    const sdkRef = useRef({ sessionToken, sessionWallet });
    useEffect(() => {
        sdkRef.current = { sessionToken, sessionWallet };
    }, [sessionToken, sessionWallet]);

    const getBattlePDA = useCallback((roomId: number) => {
        if (!program) return null;
        const roomBuffer = Buffer.alloc(8);
        roomBuffer.writeBigUInt64LE(BigInt(roomId));
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from(BATTLE_SEED), roomBuffer],
            program.programId
        );
        return pda;
    }, [program]);

    const fetchBattleAccount = useCallback(async (roomId: number) => {
        if (!program) return;
        const pda = getBattlePDA(roomId);
        if (!pda) return;
        try {
            // Check base layer
            const account = await (program.account as any).battle.fetch(pda);
            setBattleAccount(account);
            setPlayerCount(account.playerCount);
            setMaxPlayers(account.maxPlayers);

            // Check delegation
            const info = await connection.getAccountInfo(pda);
            if (info) {
                const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
                setIsBattleDelegated(info.owner.equals(DELEGATION_PROGRAM_ID));
            }
        } catch (e) {
            console.error("Failed to fetch battle account:", e);
        }
    }, [program, getBattlePDA, connection]);

    // ER Sync Listener for Multiplayer
    useEffect(() => {
        const roomId = useStore.getState().battleRoomId;
        if (!roomId || !erProgram || !erConnection || !isBattleDelegated) return;

        const pda = getBattlePDA(roomId);
        if (!pda) return;

        const sub = erConnection.onAccountChange(pda, (info) => {
            try {
                const decoded = erProgram.coder.accounts.decode("battle", info.data);
                // console.log("ER Battle Sync:", decoded);
                setBattleAccount(decoded);
                setPlayerCount(decoded.playerCount);
                setMaxPlayers(decoded.maxPlayers);
            } catch (e) {
                console.error("Failed to decode ER battle sync:", e);
            }
        }, "confirmed");

        return () => {
            erConnection.removeAccountChangeListener(sub);
        };
    }, [erProgram, erConnection, getBattlePDA, isBattleDelegated]);

    const sendErTx = useCallback(async (
        txBuilder: any,
        forceWalletSigning = false
    ): Promise<string> => {
        if (!erConnection || !wallet?.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

        let tx = await txBuilder.transaction();
        const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
        tx = new Transaction().add(computeIx, ...tx.instructions);

        const { sessionToken, sessionWallet } = sdkRef.current;
        const useSession = !forceWalletSigning && !!sessionToken && !!sessionWallet?.publicKey && !!sessionWallet?.signTransaction;

        // ER transactions that aren't forced must use session — never prompt wallet
        if (!useSession && !forceWalletSigning) {
            throw new Error("Session required for ER transaction. Please create a session first.");
        }

        tx.feePayer = useSession ? (sessionWallet.publicKey ?? undefined) : wallet.publicKey;
        tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

        if (useSession && sessionWallet.signTransaction) {
            tx = await sessionWallet.signTransaction(tx);
        } else {
            tx = await wallet.signTransaction(tx);
        }

        const sig = await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
        await erConnection.confirmTransaction(sig, "confirmed");
        return sig;
    }, [erConnection, wallet]);


    const createBattleAccount = useCallback(async (roomId: number, maxPlayers: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Program or wallet not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            await program.methods
                .createBattleAccount(new BN(roomId), maxPlayers)
                .accountsPartial({
                    battle: battlePda,
                    host: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setIsHost(true);
            setBattleRoomId(roomId);
            setMaxPlayers(maxPlayers);
            console.log(`Battle ${roomId} created at PDA: ${battlePda.toBase58()}`);
            return battlePda;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, setIsHost, setBattleRoomId, setMaxPlayers]);

    const delegateBattleAccount = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Program or wallet not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            const sig = await program.methods
                .delegateBattleAccount(new BN(roomId))
                .accounts({
                    payer: wallet.publicKey,
                    pda: battlePda as any,
                })
                .rpc({ skipPreflight: true });

            console.log(`Battle ${roomId} delegated to ER, sig: ${sig}`);
            await fetchBattleAccount(roomId);
            return sig;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA]);

    const startBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            return await toastTx(async () => {
                const { sessionToken, sessionWallet } = sdkRef.current;
                const useSession = !!sessionToken && !!sessionWallet?.publicKey;
                const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
                if (!signer) throw new Error("No valid signer");

                return await sendErTx(
                    program.methods
                        .startMultiplayerBattle()
                        .accounts({
                            battle: battlePda as any,
                            signer: signer as PublicKey,
                            sessionToken: useSession ? sessionToken : null as any,
                        })
                );
            }, {
                pending: "Starting multiplayer battle...",
                success: "Battle is live! Go hunt!",
                isEr: true
            });
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx, toastTx]);

    const joinBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            return await toastTx(async () => {
                const { sessionToken, sessionWallet } = sdkRef.current;
                const useSession = !!sessionToken && !!sessionWallet?.publicKey;
                const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
                if (!signer) throw new Error("No valid signer");

                const sig = await sendErTx(
                    (program.methods
                        .joinBattle() as any)
                        .accounts({
                            battle: battlePda as any,
                            signer: signer as any,
                            authority: wallet.publicKey as any,
                            sessionToken: (useSession ? sessionToken : null) as any,
                        })
                );
                setIsHost(false);
                setBattleRoomId(roomId);
                return sig;
            }, {
                pending: `Joining battle room ${roomId}...`,
                success: "Joined successfully! Good luck.",
                isEr: true
            });
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, setIsHost, setBattleRoomId, sendErTx, toastTx]);

    const killZombieBattle = useCallback(async (roomId: number, reward: number) => {
        if (!program || !wallet?.publicKey) return;

        return toastTx(async () => {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

            if (!signer) throw new Error("No valid signer");

            return await sendErTx(
                program.methods
                    .killZombieBattle(new BN(reward))
                    .accounts({
                        battle: battlePda as any,
                        signer: signer as PublicKey,
                        authority: wallet.publicKey as any,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );
        }, {
            pending: `Rewarding ${reward} points for team...`,
            success: "Kill recorded for room!",
            isEr: true
        });
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx, toastTx]);

    const endBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            return await toastTx(async () => {
                const { sessionToken, sessionWallet } = sdkRef.current;
                const useSession = !!sessionToken && !!sessionWallet?.publicKey;
                const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

                if (!signer) throw new Error("No valid signer");

                return await sendErTx(
                    program.methods
                        .endBattle()
                        .accounts({
                            battle: battlePda as any,
                            signer: signer as PublicKey,
                            sessionToken: useSession ? sessionToken : null as any,
                        })
                );
            }, {
                pending: "Ending battle on ER...",
                success: "Battle ended! Host can now commit scores.",
                isEr: true
            });
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx, toastTx]);

    const commitBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            return await toastTx(async () => {
                const userPubKey = wallet.publicKey;
                if (!userPubKey) throw new Error("Wallet not connected");

                return await sendErTx(
                    program.methods
                        .commitBattle()
                        .accountsPartial({
                            payer: userPubKey,
                            battle: battlePda,
                        }),
                    true // forceWalletSigning
                );
            }, {
                pending: "Committing battle scores to base layer...",
                success: "Scores committed! Room finalized.",
                isEr: false
            });
        } finally {
            setIsBattleLoading(false);
            await fetchBattleAccount(roomId);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx, toastTx, fetchBattleAccount]);

    return {
        createBattleAccount,
        delegateBattleAccount,
        startBattle,
        joinBattle,
        killZombieBattle,
        endBattle,
        commitBattle,
        isBattleLoading,
        battleAccount,
        isBattleDelegated,
        fetchBattleAccount,
    };
};
