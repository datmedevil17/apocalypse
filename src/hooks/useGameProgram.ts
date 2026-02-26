import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, type Idl } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import idl from '../../apocalypse-contracts/app/src/idl/counter.json';

export const PROGRAM_ID = new PublicKey((idl as any).address);
export const PROFILE_SEED = "profile";
export const BATTLE_SEED = "battle";

export function useGameProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const program = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

        // Create an Anchor Provider for base layer
        const provider = new AnchorProvider(
            connection,
            wallet as any,
            AnchorProvider.defaultOptions()
        );

        // Initialize the base Program
        return new Program(idl as Idl, provider);
    }, [connection, wallet]);

    const erConnection = useMemo(() => new Connection('https://devnet.magicblock.app', {
        wsEndpoint: 'wss://devnet.magicblock.app',
        commitment: "confirmed",
    }), []);

    const erProgram = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

        // Create an Anchor Provider for ER
        const erProvider = new AnchorProvider(
            erConnection,
            wallet as any,
            AnchorProvider.defaultOptions()
        );

        return new Program(idl as Idl, erProvider);
    }, [erConnection, wallet]);

    return { program, wallet, connection, erProgram, erConnection };
}
