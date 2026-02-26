import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { useGameProgram, BATTLE_SEED } from './useGameProgram';
import { useSessionKeyManager } from '@magicblock-labs/gum-react-sdk';
import { useStore } from '../store';

export const useBattle = () => {
    const { program, wallet, erConnection } = useGameProgram();
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
    const { setBattleRoomId, setIsHost, setMaxPlayers } = useStore();

    const [isBattleLoading, setIsBattleLoading] = useState(false);

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

            await program.methods
                .delegateBattleAccount(new BN(roomId))
                .accounts({
                    payer: wallet.publicKey,
                    pda: battlePda as any,
                })
                .rpc({ skipPreflight: true });

            console.log(`Battle ${roomId} delegated to ER`);
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

            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

            if (!signer) throw new Error("No valid signer");

            const sig = await sendErTx(
                program.methods
                    .startMultiplayerBattle()
                    .accounts({
                        battle: battlePda as any,
                        signer: signer as PublicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );

            console.log(`Battle starting. Signature: ${sig}`);
            return sig;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx]);

    const joinBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

            if (!signer) throw new Error("No valid signer");

            const sig = await sendErTx(
                program.methods
                    .joinBattle()
                    .accounts({
                        battle: battlePda as any,
                        signer: signer as PublicKey,
                        authority: wallet.publicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );

            console.log(`Joined Battle. Signature: ${sig}`);
            setIsHost(false);
            setBattleRoomId(roomId);
            return sig;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, setIsHost, setBattleRoomId, sendErTx]);

    const killZombieBattle = useCallback(async (roomId: number, reward: number) => {
        if (!program || !wallet?.publicKey) return;

        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) return;

            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

            if (!signer) return;

            sendErTx(
                program.methods
                    .killZombieBattle(new BN(reward))
                    .accounts({
                        battle: battlePda as any,
                        signer: signer as PublicKey,
                        authority: wallet.publicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            ).catch(console.error);
        } catch (e) {
            console.error("Failed to commit zombie kill:", e);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx]);

    const endBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;

            if (!signer) throw new Error("No valid signer");

            const sig = await sendErTx(
                program.methods
                    .endBattle()
                    .accounts({
                        battle: battlePda as any,
                        signer: signer as PublicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );

            console.log(`Battle ${roomId} ended on ER. Sig: ${sig}`);
            return sig;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx]);

    const commitBattle = useCallback(async (roomId: number) => {
        if (!program || !wallet?.publicKey) throw new Error("Not initialized");

        setIsBattleLoading(true);
        try {
            const battlePda = getBattlePDA(roomId);
            if (!battlePda) throw new Error("Failed to derive battle PDA");

            const tx = await sendErTx(
                program.methods
                    .commitBattle()
                    .accounts({
                        payer: wallet.publicKey,
                        battle: battlePda as any,
                    }),
                true // forceWalletSigning
            );

            console.log(`Battle ${roomId} committed and undelegated!`);
            return tx;
        } finally {
            setIsBattleLoading(false);
        }
    }, [program, wallet?.publicKey, getBattlePDA, sendErTx]);

    return {
        createBattleAccount,
        delegateBattleAccount,
        startBattle,
        joinBattle,
        killZombieBattle,
        endBattle,
        commitBattle,
        isBattleLoading,
    };
};
