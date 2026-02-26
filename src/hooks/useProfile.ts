import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { useGameProgram, PROFILE_SEED } from './useGameProgram';
import { useSessionKeyManager } from '@magicblock-labs/gum-react-sdk';
import { useConnection } from '@solana/wallet-adapter-react';

export function useProfile() {
    const { program, wallet, erConnection } = useGameProgram();
    const { connection } = useConnection();
    const [isInitializing, setIsInitializing] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);

    const getProfilePDA = useCallback(() => {
        if (!wallet?.publicKey || !program) return null;
        const [profilePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(PROFILE_SEED), wallet.publicKey.toBuffer()],
            program.programId
        );
        return profilePDA;
    }, [wallet?.publicKey, program]);

    // Session key management
    // Mock the wallet publicKey to prevent Gum SDK IndexedDB from throwing "Cannot read property toString of null"
    const sessionDummyWallet = useMemo(() => {
        return {
            ...wallet,
            publicKey: wallet?.publicKey || new PublicKey("11111111111111111111111111111111")
        };
    }, [wallet]);

    const sessionWallet = useSessionKeyManager(sessionDummyWallet as any, connection, "devnet");
    const { sessionToken, createSession: sdkCreateSession, isLoading: isSessionLoading } = sessionWallet;

    // Stable Refs for session volatile properties to prevent infinite loop re-renders in UI / Zustand
    const sdkRef = useRef({ sessionToken, sessionWallet });
    useEffect(() => {
        sdkRef.current = { sessionToken, sessionWallet };
    }, [sessionToken, sessionWallet]);

    const createSession = useCallback(async () => {
        if (!program) throw new Error("Program not initialized");
        await sdkCreateSession(program.programId);
        return "session-created";
    }, [program, sdkCreateSession]);

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

    const checkProfileExists = useCallback(async () => {
        if (!program || !wallet?.publicKey) return false;
        const profilePDA = getProfilePDA();
        if (!profilePDA) return false;
        try {
            const account = await (program.account as any).profile.fetch(profilePDA);
            return !!account;
        } catch (e) {
            return false;
        }
    }, [program, wallet?.publicKey, getProfilePDA]);

    const initializeProfile = useCallback(async () => {
        if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");

        const profilePDA = getProfilePDA();
        if (!profilePDA) throw new Error("Could not derive PDA");

        try {
            setIsInitializing(true);
            const tx = await program.methods
                .initializeProfile()
                .accounts({
                    profile: profilePDA,
                    authority: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log("Profile initialized! Tx:", tx);
            return tx;
        } catch (error) {
            console.error("Error initializing profile:", error);
            throw error;
        } finally {
            setIsInitializing(false);
        }
    }, [program, wallet?.publicKey, getProfilePDA]);

    const delegateGame = useCallback(async () => {
        if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");

        try {
            setIsDelegating(true);
            const tx = await program.methods
                .delegateGame()
                .accounts({ payer: wallet.publicKey })
                .rpc({ skipPreflight: true });

            console.log("Game Delegated! Tx:", tx);
            return tx;
        } catch (error) {
            console.error("Error delegating game:", error);
            throw error;
        } finally {
            setIsDelegating(false);
        }
    }, [program, wallet?.publicKey]);

    const startGame = useCallback(async () => {
        if (!program || !wallet?.publicKey) return;
        const profilePDA = getProfilePDA();
        if (!profilePDA) return;
        try {
            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
            if (!signer) throw new Error("No valid signer");
            await sendErTx(
                program.methods
                    .startGame()
                    .accounts({
                        profile: profilePDA,
                        signer: signer as PublicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );
            console.log("ER: Game Started");
        } catch (error) {
            console.error("Error starting game:", error);
            throw error;
        }
    }, [program, wallet?.publicKey, getProfilePDA, sendErTx]);

    const killZombie = useCallback(async (reward: number) => {
        if (!program || !wallet?.publicKey) return;
        const profilePDA = getProfilePDA();
        if (!profilePDA) return;
        try {
            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
            if (!signer) throw new Error("No valid signer");
            await sendErTx(
                program.methods
                    .killZombie(new BN(reward))
                    .accounts({
                        profile: profilePDA,
                        signer: signer as PublicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );
            console.log(`ER: Killed zombie, reward ${reward}`);
        } catch (error) {
            console.error("Error killing zombie:", error);
        }
    }, [program, wallet?.publicKey, getProfilePDA, sendErTx]);

    const endGame = useCallback(async () => {
        if (!program || !wallet?.publicKey) return;
        const profilePDA = getProfilePDA();
        if (!profilePDA) return;
        try {
            const { sessionToken, sessionWallet } = sdkRef.current;
            const useSession = !!sessionToken && !!sessionWallet?.publicKey;
            const signer = useSession ? sessionWallet.publicKey : wallet.publicKey;
            if (!signer) throw new Error("No valid signer");
            await sendErTx(
                program.methods
                    .endGame()
                    .accounts({
                        profile: profilePDA,
                        signer: signer as PublicKey,
                        sessionToken: useSession ? sessionToken : null as any,
                    })
            );
            console.log("ER: Game Ended");
        } catch (error) {
            console.error("Error ending game:", error);
        }
    }, [program, wallet?.publicKey, getProfilePDA, sendErTx]);

    const undelegateGame = useCallback(async () => {
        if (!program || !wallet?.publicKey) return;
        const profilePDA = getProfilePDA();
        if (!profilePDA) return;
        try {
            const tx = await sendErTx(
                program.methods
                    .undelegateGame()
                    .accounts({
                        payer: wallet.publicKey,
                        profile: profilePDA,
                    }),
                true // forceWalletSigning
            );
            console.log("Score Committed to Base Layer! Tx:", tx);
            return tx;
        } catch (error) {
            console.error("Error undelegating game:", error);
            throw error;
        }
    }, [program, wallet?.publicKey, getProfilePDA, sendErTx]);

    return {
        initializeProfile,
        delegateGame,
        startGame,
        killZombie,
        endGame,
        undelegateGame,
        isInitializing,
        isDelegating,
        getProfilePDA,
        checkProfileExists,
        createSession,
        isSessionLoading,
        sessionToken,
    };
}
