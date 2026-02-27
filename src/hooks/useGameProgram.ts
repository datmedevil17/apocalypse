import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import idl from '../../apocalypse-contracts/app/src/idl/counter.json';
import type { Counter } from '../../apocalypse-contracts/app/src/idl/counter';

export const PROGRAM_ID = new PublicKey((idl as any).address);
export const PROFILE_SEED = "profile";
export const BATTLE_SEED = "battle";

export function useGameProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const program = useMemo(() => {
        // Only require publicKey + signTransaction — signAllTransactions is optional
        if (!wallet.publicKey || !wallet.signTransaction) {
            return null;
        }

        // Create an Anchor Provider for base layer
        const provider = new AnchorProvider(
            connection,
            wallet as any,
            AnchorProvider.defaultOptions()
        );

        // Initialize the base Program
        return new Program(idl as Counter, provider);
    }, [connection, wallet]);

    const erConnection = useMemo(() => new Connection('https://devnet.magicblock.app', {
        wsEndpoint: 'wss://devnet.magicblock.app',
        commitment: "confirmed",
    }), []);

    const erProgram = useMemo(() => {
        // Only require publicKey + signTransaction — signAllTransactions is optional
        if (!wallet.publicKey || !wallet.signTransaction) {
            return null;
        }

        // Create an Anchor Provider for ER
        const erProvider = new AnchorProvider(
            erConnection,
            wallet as any,
            AnchorProvider.defaultOptions()
        );

        return new Program(idl as Counter, erProvider);
    }, [erConnection, wallet]);

    return { program, wallet, connection, erProgram, erConnection };
}
