import { useStore, baseCharacters } from "../store";
import { useUIStore } from "../uiStore";
import { HelpMenu } from "./HelpMenu";
import { CharacterConfig, type CharacterType } from "../config/GameConfig";
import { WalletMultiButton, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from "../hooks/useProfile";
import { useBattle } from "../hooks/useBattle";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from 'react';


export const UI = () => {
    const { connected, publicKey } = useWallet();
    const { setVisible: setWalletModalVisible } = useWalletModal();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { initializeProfile, checkProfileExists, createSession, sessionToken,
        delegateGame, startGame, killZombie, endGame, undelegateGame,
        profileAccount, isDelegated
    } = useProfile();
    const {
        createBattleAccount,
        delegateBattleAccount,
        joinBattle,
        killZombieBattle,
        endBattle,
        commitBattle,
        battleAccount,
        isBattleDelegated,
        fetchBattleAccount,
        startBattle,
    } = useBattle();
    const { broadcastGameStart } = useSocket();

    const {
        selectedCharacter, setSelectedCharacter,
        selectedVariant, setSelectedVariant,
        gamePhase, setGamePhase,
        playerHealth,
        hitReactTrigger,
        survivalTimeRemaining, decrementSurvivalTime, resetSurvivalTime,
        battleRoomId, setBattleRoomId, setOnZombieKilled,
        setIsHost,
        maxPlayers, setMaxPlayers,
        remotePlayers, clearRemotePlayers
    } = useStore();
    const toggleHelp = useUIStore((state) => state.toggleHelp);

    const [isUndelegating, setIsUndelegating] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");

    // Rollup sequence states
    const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [spStatus, setSpStatus] = useState<'idle' | 'delegating' | 'starting' | 'done'>('idle');

    const [hostCreateStatus, setHostCreateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [hostCreateError, setHostCreateError] = useState<string | null>(null);
    const [hostingStep, setHostingStep] = useState<'idle' | 'created' | 'delegated' | 'started'>('idle');
    const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'done'>('idle');

    // Link zombie kill event to blockchain
    useEffect(() => {
        setOnZombieKilled((reward: number) => {
            if (battleRoomId) {
                killZombieBattle(battleRoomId, reward);
            } else {
                killZombie(reward);
            }
        });
    }, [killZombie, killZombieBattle, battleRoomId, setOnZombieKilled]);

    // Auto-check if profile exists when connected
    useEffect(() => {
        if (connected) {
            if (gamePhase === 'intro') setGamePhase('profile');
            checkProfileExists().then(exists => {
                if (exists) {
                    setInitStatus('done');
                    // Skip session check if already delegated? No, session is still needed for gasless.
                    if (gamePhase === 'profile') setGamePhase('session');
                }
            });
        } else {
            setInitStatus('idle');
            setGamePhase('intro');
        }
    }, [connected, checkProfileExists, gamePhase, setGamePhase]);

    useEffect(() => {
        if (connected && (gamePhase === 'session' || gamePhase === 'profile') && sessionToken) {
            setSessionStatus('done');
            setGamePhase('ready_to_enter');
        }
    }, [connected, gamePhase, sessionToken, setGamePhase]);

    // Handle Enter key for transitioning from ready_to_enter to mode_selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gamePhase === 'ready_to_enter' && e.key === 'Enter') {
                navigate('/choose');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gamePhase, setGamePhase]);

    // Refresh delegation status when entering mode selection
    useEffect(() => {
        if (connected && gamePhase === 'mode_selection') {
            checkProfileExists();
        }
    }, [connected, gamePhase, checkProfileExists]);

    // Handle Game Over
    useEffect(() => {
        if (gamePhase === 'playing') {
            const isLocalDead = playerHealth <= 0;
            const remotePlayersArr = Object.values(useStore.getState().remotePlayers);
            const allRemoteDead = remotePlayersArr.length > 0 && remotePlayersArr.every(rp => rp.animation === "Death");
            
            // In multiplayer, loss is if ALL are dead. In singleplayer, just you.
            const isGameOver = battleRoomId ? (isLocalDead && (remotePlayersArr.length === 0 || allRemoteDead)) : isLocalDead;

            if (isGameOver && survivalTimeRemaining > 0) {
                console.log("Game over condition met. Triggering sequence...");
                setGamePhase('over');
                endGame();
            }
        }
    }, [playerHealth, gamePhase, setGamePhase, survivalTimeRemaining, endGame, battleRoomId]);

    // Handle Victory
    useEffect(() => {
        if (gamePhase === 'playing' && survivalTimeRemaining <= 0) {
            // In multiplayer, if you are alive or ANY teammate is alive, it's a win.
            // Actually, if the timer hits 0, the people still alive "won".
            // The dead ones are already in 'over' state? No, 'over' triggers immediately.
            // If any survivor reaches 0, we'll call it a win for the room.
            if (playerHealth > 0) {
                console.log("Survival achieved. Triggering won sequence...");
                setGamePhase('won');
                endGame();
            } else {
                // If I'm already dead, I should already be in 'over' state or spectator.
                // For now, let's just let the 'over' state handle it.
            }
        }
    }, [survivalTimeRemaining, gamePhase, playerHealth, setGamePhase, endGame]);

    // Guest Auto-Join logic
    useEffect(() => {
        const currentPhase = useStore.getState().gamePhase;
        const roomId = useStore.getState().battleRoomId;
        const isHost = useStore.getState().isHost;

        if (currentPhase === 'playing' && roomId && !isHost && joinStatus === 'idle') {
            console.log(`Guest detected game start for Room ${roomId}. Auto-joining on-chain...`);
            setJoinStatus('loading');
            joinBattle(roomId).then(() => {
                setJoinStatus('done');
            }).catch(e => {
                console.error("Auto-join failed:", e);
                setJoinStatus('idle');
            });
        }
    }, [gamePhase, battleRoomId, joinBattle, joinStatus]);

    // Timer Tick
    useEffect(() => {
        if (gamePhase === 'playing') {
            const interval = setInterval(() => {
                decrementSurvivalTime();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gamePhase, decrementSurvivalTime]);

    // Fetch battle account in lobby or multiplayer route
    useEffect(() => {
        if ((gamePhase === 'lobby' || pathname === '/multiplayer') && battleRoomId) {
            fetchBattleAccount(battleRoomId);
        }
    }, [gamePhase, pathname, battleRoomId, fetchBattleAccount]);

    // Multiplayer transition logic: Enter arena as soon as active/joined
    useEffect(() => {
        // ONLY transition to 'playing' if we are in a pre-game setup state
        // This prevents infinite loops from 'won' or 'over' back to 'playing'
        const isPreGame = gamePhase === 'ready_to_enter' || gamePhase === 'intro' || gamePhase === 'profile' || gamePhase === 'session' || gamePhase === 'mode_selection' || gamePhase === 'lobby';
        const isInMultiplayerLobby = pathname === '/multiplayer' && !gamePhase; // Default state when entering route

        if (pathname === '/multiplayer' && (isPreGame || isInMultiplayerLobby) && battleRoomId && battleAccount) {
            const isActive = battleAccount.active;
            const isJoinSuccess = joinStatus === 'done';

            if (isActive || isJoinSuccess) {
                console.log("Battle active or joined. Entering arena...");
                resetSurvivalTime(); // Reset timer for the new match
                setGamePhase('playing');
            }
        }
    }, [pathname, gamePhase, battleRoomId, battleAccount, joinStatus, setGamePhase]);

    // Survival Timer: Tick as soon as playing
    useEffect(() => {
        if (gamePhase === 'playing' && battleRoomId) {
            const timer = setInterval(() => {
                decrementSurvivalTime();
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gamePhase, battleRoomId, decrementSurvivalTime]);

    // ── High Priority Overlays (Over / Won) ──
    if (gamePhase === 'over') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                background: "rgba(10, 0, 0, 0.9)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                zIndex: 2000, color: "red", fontFamily: "'Creepster', cursive, serif"
            }}>
                <h1 style={{ fontSize: "6rem", margin: 0, textShadow: "0 0 20px rgba(255,0,0,0.5)" }}>YOU DIED</h1>
                <p style={{ fontFamily: "'Inter', sans-serif", color: "white", marginBottom: "40px", letterSpacing: "2px", opacity: 0.8 }}>
                    The protocol must be undelegated to record your final score.
                </p>
                <button
                    disabled={isUndelegating}
                    onClick={async () => {
                        try {
                            setIsUndelegating(true);
                            if (battleRoomId) {
                                await endBattle(battleRoomId);
                                await commitBattle(battleRoomId);
                            } else {
                                await undelegateGame();
                            }
                            window.location.reload();
                        } catch (e) {
                            console.error(e);
                        } finally {
                            setIsUndelegating(false);
                        }
                    }}
                    style={{
                        padding: "16px 32px", background: "linear-gradient(135deg, #f44336, #b71c1c)", color: "white",
                        border: "none", cursor: isUndelegating ? "not-allowed" : "pointer",
                        fontWeight: "bold", fontSize: "1.2rem", borderRadius: "8px", textTransform: "uppercase",
                        boxShadow: "0 4px 15px rgba(255,0,0,0.4)", opacity: isUndelegating ? 0.7 : 1
                    }}
                >
                    {isUndelegating ? "COMMITTING TO BASE LAYER..." : "COMMIT SCORE & RESTART"}
                </button>
            </div>
        );
    }

    if (gamePhase === 'won') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                background: "radial-gradient(ellipse at center, rgba(10, 30, 10, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                zIndex: 2000, color: "#8eff8e"
            }}>
                <h1 style={{ fontSize: "4.5rem", margin: 0, textShadow: "0 0 20px rgba(76,175,80,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 900, textTransform: "uppercase", letterSpacing: "4px" }}>YOU SURVIVED</h1>
                <p style={{ fontFamily: "'Inter', sans-serif", color: "white", marginBottom: "40px", letterSpacing: "2px", opacity: 0.8 }}>
                    Dawn has arrived. The protocol must be undelegated to record your victory.
                </p>
                <button
                    disabled={isUndelegating}
                    onClick={async () => {
                        try {
                            setIsUndelegating(true);
                            if (battleRoomId) {
                                await endBattle(battleRoomId);
                                await commitBattle(battleRoomId);
                            } else {
                                await undelegateGame();
                            }
                            window.location.reload();
                        } catch (e) {
                            console.error(e);
                        } finally {
                            setIsUndelegating(false);
                        }
                    }}
                    style={{
                        padding: "16px 32px", background: "linear-gradient(135deg, #4CAF50, #1B5E20)", color: "white",
                        border: "none", cursor: isUndelegating ? "not-allowed" : "pointer",
                        fontWeight: "bold", fontSize: "1.2rem", borderRadius: "8px", textTransform: "uppercase",
                        boxShadow: "0 4px 15px rgba(76,175,80,0.4)", opacity: isUndelegating ? 0.7 : 1
                    }}
                >
                    {isUndelegating ? "COMMITTING TO BASE LAYER..." : "COMMIT SCORE & RESTART"}
                </button>
            </div>
        );
    }

    // ── Route Based Overlays (Intro / Choose / Singleplayer / Multiplayer Lobby) ──
    if (pathname === '/') {
        if (gamePhase === 'intro') {
            return (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(8,8,18,0.9)", backdropFilter: "blur(10px)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 className="text-glow-orange pulse-orange-btn" style={{ fontSize: "5rem", marginBottom: "40px", textShadow: "0 0 20px #ff4500" }}>APOCALYPSE</h1>
                    <WalletMultiButton style={{ background: "transparent", border: "2px solid #ff4500", borderRadius: "8px", padding: "12px 32px", fontSize: "1.2rem", fontWeight: "bold", fontFamily: "Rajdhani" }} className="cyber-button text-glow-orange box-glow-orange" />
                </div>
            );
        }

        if (gamePhase === 'profile') {
            return (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(8,8,18,0.9)", backdropFilter: "blur(10px)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 className="text-glow-cyan" style={{ fontSize: "4rem", marginBottom: "10px" }}>SURVIVOR PROFILE</h1>
                    <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.7)", marginBottom: "40px" }}>You must register to enter the wasteland.</p>
                    <button
                        className="cyber-button box-glow-cyan"
                        onClick={async () => {
                            setInitStatus('loading');
                            try {
                                await initializeProfile();
                                setInitStatus('done');
                                setGamePhase('session');
                            } catch (e) {
                                console.error(e);
                                setInitStatus('idle');
                            }
                        }}
                        style={{
                            padding: "16px 48px", background: "rgba(0,242,254,0.1)", border: "2px solid #00f2fe", borderRadius: "8px",
                            color: "#00f2fe", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "2px"
                        }}
                    >
                        {initStatus === 'loading' ? "INITIALIZING..." : "CREATE PROFILE"}
                    </button>
                </div>
            );
        }

        if (gamePhase === 'session') {
            return (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(8,8,18,0.95)", backdropFilter: "blur(15px)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 className="text-glow-cyan" style={{ fontSize: "4rem" }}>AUTHORIZE SESSION</h1>
                    <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.6)", marginBottom: "40px", maxWidth: "400px" }}>Gasless session token required to sign transactions automatically.</p>
                    <button
                        className="cyber-button box-glow-cyan"
                        onClick={async () => {
                            setSessionStatus('loading');
                            try {
                                await createSession();
                                setSessionStatus('done');
                                setGamePhase('ready_to_enter');
                            } catch (e) {
                                console.error(e);
                                setSessionStatus('idle');
                            }
                        }}
                        style={{
                            padding: "18px 64px", background: "rgba(0,242,254,0.1)", border: "2px solid #00f2fe", borderRadius: "8px",
                            color: "#00f2fe", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "2px"
                        }}
                    >
                        {sessionStatus === 'loading' ? "AUTHORIZING..." : "CREATE SESSION"}
                    </button>
                </div>
            );
        }

        if (gamePhase === 'ready_to_enter') {
            return (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(8,8,18,0.8)", backdropFilter: "blur(5px)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 className="text-glow-orange" style={{ fontSize: "5rem", marginBottom: "0" }}>READY</h1>
                    <div
                        className="cyber-button pulse-orange-btn box-glow-orange"
                        onClick={() => navigate('/choose')}
                        style={{
                            marginTop: "40px", padding: "20px 60px", border: "2px solid #ff4500",
                            borderRadius: "8px", background: "rgba(255,69,0,0.1)", cursor: "pointer"
                        }}
                    >
                        <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#fff", letterSpacing: "4px" }}>PRESS [ ENTER ] TO SURVIVE</p>
                    </div>
                </div>
            );
        }
    }

    if (pathname === '/choose') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(8,8,18,0.9)", backdropFilter: "blur(10px)", zIndex: 1000, color: "white", textAlign: "center"
            }}>
                {/* Back Button */}
                <button
                    className="cyber-button"
                    onClick={() => navigate('/')}
                    style={{
                        position: "absolute", top: "40px", left: "40px", pointerEvents: "auto",
                        padding: "12px 24px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px",
                        color: "white", fontWeight: "bold", cursor: "pointer", backdropFilter: "blur(4px)"
                    }}
                >
                    ← BACK TO START
                </button>
                <h1 className="text-glow-orange" style={{ fontSize: "5rem", marginBottom: "50px" }}>CHOOSE YOUR FATE</h1>
                <div style={{ display: "flex", gap: "40px", marginBottom: "40px" }}>
                    <div className="glass-panel box-glow-orange" style={{
                        width: "350px", padding: "40px", borderRadius: "16px",
                        border: "1px solid rgba(255,100,0,0.5)", transition: "0.3s all"
                    }}>
                        <h2 className="text-glow-orange" style={{ color: "#ff8050", letterSpacing: "4px" }}>SINGLE PLAYER</h2>
                        <p style={{ fontSize: "1.1rem", opacity: 0.8, marginBottom: "30px", fontWeight: "bold" }}>Explore the ruins alone and survive the horde.</p>
                        <button
                            className="cyber-button box-glow-orange"
                            onClick={() => navigate('/singleplayer')}
                            style={{
                                width: "100%", padding: "18px", background: "rgba(255,100,0,0.1)", border: "1px solid #ff4500", borderRadius: "8px",
                                color: "#ff8050", fontWeight: "bold", cursor: "pointer", fontSize: "1.1rem", letterSpacing: "2px"
                            }}
                        >
                            {(profileAccount && profileAccount.gameActive) ? "RESUME SESSION" : "ENTER ARENA"}
                        </button>
                    </div>
                    <div className="glass-panel box-glow-cyan" style={{
                        width: "350px", padding: "40px", borderRadius: "16px",
                        border: "1px solid rgba(0,242,254,0.5)", transition: "0.3s all"
                    }}>
                        <h2 className="text-glow-cyan" style={{ color: "#00f2fe", letterSpacing: "4px" }}>MULTIPLAYER</h2>
                        <p style={{ fontSize: "1.1rem", opacity: 0.8, marginBottom: "30px", fontWeight: "bold" }}>Join other survivors in the wasteland.</p>
                        <button
                            className="cyber-button box-glow-cyan"
                            onClick={() => navigate('/multiplayer')}
                            style={{
                                width: "100%", padding: "18px", background: "rgba(0,242,254,0.1)", border: "1px solid #00f2fe", borderRadius: "8px",
                                color: "#00f2fe", fontWeight: "bold", cursor: "pointer", fontSize: "1.1rem", letterSpacing: "2px"
                            }}
                        >
                            {(isBattleDelegated && battleAccount) ? "RESUME BATTLE" : "ENTER LOBBY"}
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/inventory')}
                    style={{
                        padding: "18px 60px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "30px",
                        color: "white", fontWeight: "bold", cursor: "pointer", textTransform: "uppercase", letterSpacing: "2px",
                        transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    OPEN INVENTORY
                </button>
            </div>
        );
    }

    if (pathname === '/inventory') {
        const charKeys = Object.keys(CharacterConfig) as CharacterType[];
        const currentIndex = charKeys.indexOf(selectedCharacter as CharacterType);
        const currentStats = CharacterConfig[selectedCharacter as CharacterType];
        const isPet = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd';

        const handlePrevious = () => {
            const nextIdx = (currentIndex - 1 + charKeys.length) % charKeys.length;
            setSelectedCharacter(charKeys[nextIdx]);
        };

        const handleNext = () => {
            const nextIdx = (currentIndex + 1) % charKeys.length;
            setSelectedCharacter(charKeys[nextIdx]);
        };

        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                zIndex: 1000, color: "white", pointerEvents: "none", padding: "40px"
            }}>
                {/* Top Bar: Back Button */}
                <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", pointerEvents: "none" }}>
                    <button
                        className="cyber-button"
                        onClick={() => navigate('/choose')}
                        style={{
                            pointerEvents: "auto",
                            padding: "12px 24px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px",
                            color: "white", fontWeight: "bold", cursor: "pointer", backdropFilter: "blur(4px)"
                        }}
                    >
                        ← BACK TO MENU
                    </button>
                </div>

                {/* Bottom Panel: Character Select */}
                <div className={isPet ? "glass-panel box-glow-cyan" : "glass-panel box-glow-orange"} style={{
                    width: "100%", maxWidth: "600px", padding: "30px", borderRadius: "24px",
                    border: isPet ? "1px solid rgba(0,242,254,0.3)" : "1px solid rgba(255,69,0,0.3)",
                    pointerEvents: "auto", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: "20px", transition: "all 0.3s ease"
                }}>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", alignSelf: "flex-end", letterSpacing: "1px", fontStyle: "italic" }}>Drag to rotate character preview</div>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        {/* Left Arrow */}
                        <button 
                            className="cyber-button"
                            onClick={handlePrevious}
                            style={{
                                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%",
                                width: "60px", height: "60px", color: "white", fontSize: "2rem",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = isPet ? "rgba(0,242,254,0.3)" : "rgba(255,69,0,0.3)"; e.currentTarget.style.borderColor = isPet ? "#00f2fe" : "#ff4500"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        {/* Character Details */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <div style={{ textAlign: "center" }}>
                                <div className={isPet ? "text-glow-cyan" : "text-glow-orange"} style={{ fontWeight: "bold", fontSize: "2.5rem", letterSpacing: "4px" }}>{selectedCharacter.toUpperCase()}</div>
                                <div style={{ fontSize: "1rem", color: isPet ? "#00f2fe" : "#ff8c00", marginTop: "4px", letterSpacing: "3px", fontWeight: "bold" }}>
                                    {isPet ? "PET COMPANION" : "SURVIVOR"}
                                </div>
                            </div>
                            
                            <div style={{ display: "flex", gap: "20px", marginTop: "15px", background: "rgba(0,0,0,0.4)", padding: "15px 30px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "1px" }}>MAX HP</span>
                                    <span style={{ color: "white", fontSize: "1.4rem", fontWeight: "bold" }}>{currentStats?.maxHealth || 100}</span>
                                </div>
                                <div style={{ width: "1px", background: "rgba(255,255,255,0.2)" }} />
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "1px" }}>SPEED</span>
                                    <span style={{ color: "white", fontSize: "1.4rem", fontWeight: "bold" }}>{currentStats?.speedMultiplier || 1.0}x</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Arrow */}
                        <button 
                            className="cyber-button"
                            onClick={handleNext}
                            style={{
                                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%",
                                width: "60px", height: "60px", color: "white", fontSize: "2rem",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = isPet ? "rgba(0,242,254,0.3)" : "rgba(255,69,0,0.3)"; e.currentTarget.style.borderColor = isPet ? "#00f2fe" : "#ff4500"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pathname === '/singleplayer' && gamePhase !== 'playing') {
        const spLabel = spStatus === 'delegating' ? 'DELEGATING...' :
                        spStatus === 'starting'   ? 'STARTING...'   : 'ENTER ARENA';
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(8,8,18,0.9)", backdropFilter: "blur(10px)", zIndex: 1000, color: "white", textAlign: "center"
            }}>
                {/* Back Button */}
                <button
                    className="cyber-button"
                    onClick={() => navigate('/choose')}
                    style={{
                        position: "absolute", top: "40px", left: "40px", pointerEvents: "auto",
                        padding: "12px 24px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px",
                        color: "white", fontWeight: "bold", cursor: "pointer", backdropFilter: "blur(4px)"
                    }}
                >
                    ← BACK TO MENU
                </button>
                <h1 className="text-glow-orange pulse-orange-btn" style={{ fontSize: "4rem", marginBottom: "30px" }}>SINGLE PLAYER</h1>
                <div className="glass-panel" style={{
                    width: "400px", padding: "40px", borderRadius: "16px",
                    border: "1px solid rgba(255,100,0,0.2)"
                }}>
                    <p style={{ opacity: 0.8, marginBottom: "30px", fontSize: "1.1rem" }}>Delegate to ER and survive the horde.</p>
                    <button
                        className={spStatus === 'idle' ? "cyber-button box-glow-orange" : ""}
                        disabled={spStatus !== 'idle'}
                        onClick={async () => {
                            try {
                                // Step 1: Delegate to ER if not already delegated
                                if (!isDelegated) {
                                    setSpStatus('delegating');
                                    await delegateGame();
                                }
                                // Step 2: Start the game on ER
                                setSpStatus('starting');
                                await startGame();
                                // Step 3: Enter
                                resetSurvivalTime();
                                setGamePhase('playing');
                                setSpStatus('done');
                            } catch (e) {
                                console.error("SP entry error:", e);
                                setSpStatus('idle');
                            }
                        }}
                        style={{
                            width: "100%", padding: "18px", borderRadius: "8px",
                            background: spStatus === 'idle' ? "rgba(255,100,0,0.2)" : "rgba(255,255,255,0.05)",
                            border: spStatus === 'idle' ? "2px solid #ff4500" : "2px solid rgba(255,255,255,0.1)",
                            color: "white", fontWeight: "bold", fontSize: "1.1rem",
                            cursor: spStatus === 'idle' ? "pointer" : "not-allowed",
                            letterSpacing: "2px"
                        }}
                    >
                        {spLabel}
                    </button>
                </div>
            </div>
        );
    }

    if (pathname === '/multiplayer' && gamePhase !== 'playing') {
        const isFull = battleAccount && battleAccount.playerCount >= battleAccount.maxPlayers;
        if (isFull) console.log("Room is currently full."); // Use variable to satisfy lint


        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(160deg, rgba(8,8,18,0.97) 0%, rgba(15,12,25,0.98) 50%, rgba(8,8,18,0.97) 100%)",
                backdropFilter: "blur(16px)", zIndex: 1000, color: "white", pointerEvents: "all"
            }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate('/choose')}
                    style={{
                        position: "absolute", top: "40px", left: "40px", pointerEvents: "auto", zIndex: 2000,
                        padding: "12px 24px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px",
                        color: "white", fontWeight: "bold", cursor: "pointer", backdropFilter: "blur(4px)"
                    }}
                >
                    ← BACK TO MENU
                </button>
                <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10, display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Session Status / Create Session */}
                    {connected && (
                        sessionToken ? (
                            <div style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)",
                                color: "#4ade80", padding: "8px 14px", borderRadius: "8px",
                                fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "1.5px"
                            }}>
                                <div style={{
                                    width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80",
                                    boxShadow: "0 0 6px #4ade80", animation: "pulse-green 2s infinite"
                                }} />
                                SESSION ACTIVE
                            </div>
                        ) : (
                            <button
                                onClick={async () => {
                                    setSessionStatus('loading');
                                    try {
                                        await createSession();
                                        setSessionStatus('done');
                                    } catch (e) {
                                        console.error(e);
                                        setSessionStatus('idle');
                                    }
                                }}
                                disabled={sessionStatus === 'loading'}
                                style={{
                                    display: "flex", alignItems: "center", gap: "8px",
                                    background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.4)",
                                    color: "#ff8c00", padding: "8px 14px", borderRadius: "8px",
                                    fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "1.5px",
                                    cursor: "pointer"
                                }}
                            >
                                {sessionStatus === 'loading' ? (
                                    <>
                                        <div style={{ width: "10px", height: "10px", border: "2px solid rgba(255,140,0,0.3)", borderTop: "2px solid #ff8c00", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                        AUTHORIZING...
                                    </>
                                ) : "CREATE SESSION"}
                            </button>
                        )
                    )}
                    <WalletMultiButton />
                </div>
                <style>{`
                    @keyframes pulse-green {
                        0%, 100% { opacity: 1; box-shadow: 0 0 6px #4ade80; }
                        50% { opacity: 0.5; box-shadow: 0 0 12px #4ade80; }
                    }
                `}</style>
                <h2 className="text-glow-orange pulse-orange-btn" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", marginBottom: "40px", WebkitBackgroundClip: "text", letterSpacing: "0.15rem" }}>
                    {battleRoomId ? "STAGING AREA" : "MULTIPLAYER LOBBY"}
                </h2>

                {/* Character Selection (Global for Lobby) */}
                {!battleRoomId && (
                    <div className="glass-panel" style={{ width: "670px", marginBottom: "40px", padding: "30px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "0.9rem", color: "#ff8c00", letterSpacing: "3px", marginBottom: "20px", textAlign: "center", fontWeight: "bold" }}>SELECT YOUR IDENTITY</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
                            {baseCharacters.map((char) => (
                                <div
                                    key={char}
                                    onClick={() => setSelectedCharacter(char)}
                                    className={selectedCharacter === char ? "box-glow-orange" : ""}
                                    style={{
                                        padding: "16px", borderRadius: "12px", background: selectedCharacter === char ? "rgba(255,69,0,0.2)" : "rgba(255,255,255,0.05)",
                                        border: `2px solid ${selectedCharacter === char ? "#ff4500" : "rgba(255,255,255,0.1)"}`,
                                        cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                                        transform: selectedCharacter === char ? "scale(1.05)" : "scale(1)"
                                    }}
                                >
                                    <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: selectedCharacter === char ? "white" : "rgba(255,255,255,0.5)", letterSpacing: "1px" }}>{char.toUpperCase()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {battleRoomId ? (
                    <div className="glass-panel" style={{ width: "600px", borderRadius: "24px", border: "1px solid rgba(255,69,0,0.3)", padding: "40px", display: "flex", flexDirection: "column", gap: "24px", boxShadow: "0 0 30px rgba(255,69,0,0.1)" }}>
                        <div style={{ textAlign: "center" }}>
                            <div className="text-glow-orange" style={{ fontSize: "1rem", color: "#ff8c00", letterSpacing: "3px", marginBottom: "8px", fontWeight: "bold" }}>ROOM ID</div>
                            <div className="text-glow-cyan" style={{ fontSize: "3rem", fontWeight: "bold", color: "#00f2fe", letterSpacing: "4px" }}>#{battleRoomId}</div>
                        </div>
                        <div style={{ padding: "24px", background: "rgba(0,0,0,0.4)", borderRadius: "16px", border: "1px solid rgba(0,242,254,0.2)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                <span style={{ opacity: 0.8, fontWeight: "bold", letterSpacing: "1px" }}>SURVIVORS CONNECTED</span>
                                <span className="text-glow-cyan" style={{ color: "#00f2fe", fontWeight: "bold", fontSize: "1.2rem" }}>{Object.keys(remotePlayers).length + 1} / {battleAccount?.maxPlayers || 2}</span>
                            </div>
                            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}>
                                <div style={{ width: `${((Object.keys(remotePlayers).length + 1) / (battleAccount?.maxPlayers || 2)) * 100}%`, height: "100%", background: "#00f2fe", transition: "width 0.5s ease", boxShadow: "0 0 10px #00f2fe" }} />
                            </div>
                        </div>

                        {/* Host Controls in Staging Area */}
                        {battleAccount && publicKey && battleAccount.host.equals(publicKey) && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
                                {!isBattleDelegated ? (
                                    <button
                                        className={sessionToken ? "cyber-button box-glow-orange" : ""}
                                        onClick={async () => {
                                            if (!battleRoomId) return;
                                            setHostCreateStatus('loading');
                                            try { await delegateBattleAccount(battleRoomId); setHostCreateStatus('done'); } catch (e) { console.error(e); setHostCreateStatus('idle'); }
                                        }}
                                        disabled={!sessionToken || hostCreateStatus === 'loading'}
                                        style={{
                                            padding: "18px",
                                            background: sessionToken ? "rgba(255,69,0,0.2)" : "rgba(255,255,255,0.05)",
                                            border: sessionToken ? "2px solid #ff4500" : "1px solid rgba(255,255,255,0.2)",
                                            color: sessionToken ? "white" : "rgba(255,255,255,0.4)",
                                            fontWeight: "bold", cursor: sessionToken ? "pointer" : "not-allowed", borderRadius: "8px",
                                            letterSpacing: "2px", fontSize: "1.1rem"
                                        }}
                                    >
                                        {hostCreateStatus === 'loading' ? "DELEGATING..." : "DELEGATE ROOM (REQ)"}
                                    </button>
                                ) : !battleAccount.active ? (
                                    <button
                                        className={sessionToken ? "cyber-button pulse-cyan box-glow-cyan" : ""}
                                        onClick={async () => {
                                            if (!battleRoomId) return;
                                            setHostCreateStatus('loading');
                                            try {
                                                await startBattle(battleRoomId);
                                                broadcastGameStart(battleRoomId.toString());
                                                setHostCreateStatus('done');
                                            } catch (e) { console.error(e); setHostCreateStatus('idle'); }
                                        }}
                                        disabled={!sessionToken || hostCreateStatus === 'loading'}
                                        style={{
                                            padding: "20px",
                                            background: sessionToken ? "rgba(0,242,254,0.15)" : "rgba(255,255,255,0.05)",
                                            border: sessionToken ? "2px solid #00f2fe" : "1px solid rgba(255,255,255,0.2)",
                                            color: sessionToken ? "#00f2fe" : "rgba(255,255,255,0.4)",
                                            fontWeight: "bold", cursor: sessionToken ? "pointer" : "not-allowed",
                                            borderRadius: "12px", letterSpacing: "3px", fontSize: "1.3rem"
                                        }}
                                    >
                                        {hostCreateStatus === 'loading' ? "STARTING..." : "START BATTLE NOW"}
                                    </button>
                                ) : (
                                    <div className="text-glow-cyan" style={{ textAlign: "center", color: "#00f2fe", fontWeight: "bold", letterSpacing: "2px", fontSize: "1.2rem", padding: "10px" }}>BATTLE IN PROGRESS</div>
                                )}
                                {!sessionToken && !battleAccount.active && (
                                    <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#ff0055", marginTop: "5px", fontWeight: "bold" }}>
                                        ⚠ Active Session Required to Proceed
                                    </div>
                                )}
                            </div>
                        )}

                        {!battleAccount?.active && (!publicKey || !battleAccount?.host.equals(publicKey)) && (
                            <div style={{ textAlign: "center", padding: "30px", background: "rgba(0,0,0,0.3)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.2)" }}>
                                <div style={{ width: "50px", height: "50px", border: "4px solid rgba(0,242,254,0.1)", borderTop: "4px solid #00f2fe", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px", boxShadow: "0 0 15px rgba(0,242,254,0.3)" }} />
                                <p style={{ fontSize: "1.2rem", opacity: 0.9, margin: 0, letterSpacing: "1px" }}>Awaiting Host Authorization...</p>
                            </div>
                        )}

                        {/* Character Selection Grid */}
                        <div style={{ marginTop: "10px" }}>
                            <div style={{ fontSize: "0.8rem", color: "#ff8c00", letterSpacing: "2px", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>YOUR LOADOUT</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                                {baseCharacters.map((char) => (
                                    <div
                                        key={char}
                                        onClick={() => setSelectedCharacter(char)}
                                        className={selectedCharacter === char ? "box-glow-orange" : ""}
                                        style={{
                                            padding: "12px", borderRadius: "8px", background: selectedCharacter === char ? "rgba(255,69,0,0.2)" : "rgba(255,255,255,0.05)",
                                            border: `2px solid ${selectedCharacter === char ? "#ff4500" : "rgba(255,255,255,0.1)"}`,
                                            cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                                            transform: selectedCharacter === char ? "scale(1.05)" : "scale(1)"
                                        }}
                                    >
                                        <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: selectedCharacter === char ? "white" : "rgba(255,255,255,0.5)" }}>{char.toUpperCase()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Room Members List */}
                        <div style={{ marginTop: "15px", padding: "24px", background: "rgba(0,0,0,0.4)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00f2fe", letterSpacing: "3px", marginBottom: "20px", fontWeight: "bold", textAlign: "center" }}>SQUAD ROSTER</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {/* Local Player */}
                                <div className="box-glow-cyan" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,242,254,0.1)", borderRadius: "8px", border: "1px solid rgba(0,242,254,0.3)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00f2fe", boxShadow: "0 0 10px #00f2fe" }} />
                                        <span style={{ fontSize: "1rem", color: "#fff", fontWeight: "bold", letterSpacing: "2px" }}>YOU</span>
                                    </div>
                                    <div style={{ fontSize: "0.9rem", color: "#00f2fe", fontWeight: "bold" }}>{selectedCharacter.toUpperCase()}</div>
                                </div>
                                {/* Remote Players */}
                                {Object.entries(remotePlayers).map(([id, player], idx) => (
                                    <div key={id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff4500", boxShadow: "0 0 10px #ff4500" }} />
                                            <span style={{ fontSize: "1rem", opacity: 0.9, fontWeight: "bold", letterSpacing: "1px" }}>PLAYER_{id.slice(0, 4).toUpperCase()}</span>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>{player.selectedCharacter?.toUpperCase() || "UNKNOWN"}</div>
                                    </div>
                                ))}
                                {Object.keys(remotePlayers).length === 0 && (
                                    <div style={{ fontSize: "0.9rem", opacity: 0.5, textAlign: "center", padding: "20px", fontStyle: "italic" }}>Scanning for other survivors...</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: "40px" }}>
                        <div className="glass-panel" style={{ width: "350px", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,100,0,0.3)", display: "flex", flexDirection: "column", gap: "25px" }}>
                            <h3 className="text-glow-orange" style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "2px", color: "#ff8c00", textAlign: "center" }}>HOST NEW SQUAD</h3>

                            {hostingStep === 'idle' && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", opacity: 0.9, fontWeight: "bold" }}>
                                        <span>CAPACITY</span>
                                        <span className="text-glow-orange" style={{ color: "#ff8c00" }}>{maxPlayers}</span>
                                    </div>
                                    <input
                                        type="range" min="2" max="4" step="1"
                                        value={maxPlayers}
                                        onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                                        style={{ width: "100%", accentColor: "#ff4500", cursor: "pointer", height: "8px", borderRadius: "4px" }}
                                    />
                                    <button
                                        className={connected && sessionToken ? "cyber-button box-glow-orange" : ""}
                                        onClick={async () => {
                                            if (!connected) {
                                                setWalletModalVisible(true);
                                                return;
                                            }
                                            const newRoomId = Math.floor(100000 + Math.random() * 900000);
                                            setHostCreateStatus('loading');
                                            setHostCreateError(null);
                                            try {
                                                await createBattleAccount(newRoomId, maxPlayers);
                                                setHostingStep('created');
                                                clearRemotePlayers(); // Wipe stale ghost players
                                                setGamePhase('lobby');
                                                setHostCreateStatus('done');
                                            } catch (e: any) {
                                                console.error("Create Room error:", e);
                                                const msg = e?.message || e?.toString() || "Unknown error";
                                                setHostCreateError(msg);
                                                setHostCreateStatus('idle');
                                            }
                                        }}
                                        disabled={!connected || !sessionToken || hostCreateStatus === 'loading'}
                                        style={{
                                            marginTop: "15px", padding: "18px",
                                            background: (connected && sessionToken) ? "rgba(255,69,0,0.15)" : "rgba(255,255,255,0.05)",
                                            border: (connected && sessionToken) ? "2px solid #ff4500" : "1px solid rgba(255,255,255,0.2)",
                                            color: (connected && sessionToken) ? "white" : "rgba(255,255,255,0.4)", fontWeight: "bold",
                                            cursor: (connected && sessionToken) ? "pointer" : "not-allowed", borderRadius: "8px", width: "100%",
                                            letterSpacing: "2px", fontSize: "1.1rem"
                                        }}
                                    >
                                        {!connected ? "WALLET REQ" : !sessionToken ? "SESSION REQ" : hostCreateStatus === 'loading' ? "INITIALIZING..." : "CREATE ROOM"}
                                    </button>
                                    {connected && !sessionToken && (
                                        <div style={{ fontSize: "0.85rem", color: "#ff0055", textAlign: "center", fontWeight: "bold" }}>
                                            ⚠ Active Session Required (Top Right)
                                        </div>
                                    )}
                                    {hostCreateError && (
                                        <div style={{
                                            marginTop: "10px", padding: "12px 16px", background: "rgba(255,0,85,0.1)",
                                            border: "1px solid rgba(255,0,85,0.3)", borderRadius: "8px",
                                            color: "#ff0055", fontSize: "0.85rem", wordBreak: "break-word", fontWeight: "bold"
                                        }}>
                                            ⚠ {hostCreateError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="glass-panel" style={{ width: "350px", padding: "40px", borderRadius: "24px", border: "1px solid rgba(0,242,254,0.3)", display: "flex", flexDirection: "column", gap: "25px" }}>
                            <h3 className="text-glow-cyan" style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "2px", color: "#00f2fe", textAlign: "center" }}>JOIN SQUAD</h3>
                            <input 
                                type="number" 
                                placeholder="Enter Room ID..." 
                                value={joinRoomId} 
                                onChange={(e) => setJoinRoomId(e.target.value)} 
                                style={{ 
                                    padding: "16px", background: "rgba(0,0,0,0.5)", border: "2px solid rgba(0,242,254,0.3)", 
                                    borderRadius: "8px", color: "white", outline: "none", fontFamily: "monospace", 
                                    fontSize: "1.3rem", textAlign: "center", letterSpacing: "2px" 
                                }} 
                            />
                            <button 
                                className={joinRoomId && connected && sessionToken ? "cyber-button box-glow-cyan" : ""}
                                onClick={async () => { 
                                    if (!joinRoomId) return;
                                    if (!connected) { setWalletModalVisible(true); return; }
                                    clearRemotePlayers();
                                    setBattleRoomId(parseInt(joinRoomId));
                                    setIsHost(false);
                                    setGamePhase('lobby');
                                    console.log(`Guest entered lobby for Room ${joinRoomId}`);
                                }} 
                                disabled={!joinRoomId || !connected || !sessionToken}
                                style={{
                                    padding: "18px",
                                    background: (connected && sessionToken && joinRoomId) ? "rgba(0,242,254,0.15)" : "rgba(255,255,255,0.05)",
                                    border: (connected && sessionToken && joinRoomId) ? "2px solid #00f2fe" : "1px solid rgba(255,255,255,0.2)",
                                    color: (connected && sessionToken && joinRoomId) ? "white" : "rgba(255,255,255,0.4)",
                                    fontWeight: "bold", cursor: (connected && sessionToken && joinRoomId) ? "pointer" : "not-allowed", borderRadius: "8px",
                                    letterSpacing: "2px", fontSize: "1.1rem"
                                }}
                            >
                                {!connected ? "WALLET REQ" : !sessionToken ? "SESSION REQ" : "ENTER SQUAD"}
                            </button>
                            {connected && !sessionToken && (
                                <div style={{ fontSize: "0.85rem", color: "#ff0055", textAlign: "center", fontWeight: "bold" }}>
                                    ⚠ Active Session Required (Top Right)
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── Playing HUD ──
    const stats = CharacterConfig[selectedCharacter as CharacterType] || CharacterConfig.Lis;
    const healthPercent = (playerHealth / stats.maxHealth) * 100;

    const getHealthColor = () => {
        if (healthPercent > 50) return '#4CAF50';
        if (healthPercent > 25) return '#FF9800';
        return '#F44336';
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <>
            {/* Damage Vignette Flash */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200,
                background: `radial-gradient(ellipse at center, transparent 50%, rgba(200,0,0,${Math.min(0.9, (1 - healthPercent / 100) * 0.7 + (hitReactTrigger % 2 === 0 ? 0 : 0.4))}) 100%)`,
                transition: "background 0.15s ease-out",
                animation: hitReactTrigger > 0 ? "hit-flash 0.3s ease-out" : undefined
            }} />
            <style>{`
                @keyframes hit-flash {
                    0%   { box-shadow: inset 0 0 80px rgba(255,0,0,0.8); }
                    100% { box-shadow: inset 0 0 0px rgba(255,0,0,0); }
                }
            `}</style>
            {/* Survival Timer */}
            <div style={{
                position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center",
                background: "rgba(0,0,0,0.6)", padding: "12px 32px", borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                zIndex: 50
            }}>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>SURVIVAL TIME</span>
                <span style={{
                    fontSize: "2.5rem", fontWeight: "bold", fontFamily: "monospace",
                    color: survivalTimeRemaining <= 10 ? "#ff4444" : "#ffffff",
                    textShadow: survivalTimeRemaining <= 10 ? "0 0 15px rgba(255,68,68,0.5)" : "none",
                    animation: survivalTimeRemaining <= 10 ? "pulse-timer-red 1s infinite alternate" : "none"
                }}>
                    {formatTime(survivalTimeRemaining)}
                </span>
            </div>

            <style>{`
                @keyframes pulse-timer-red {
                    from { opacity: 1; }
                    to { opacity: 0.5; }
                }
            `}</style>

            {/* Low health warning effect */}
            {healthPercent <= 25 && healthPercent > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    border: '10px solid rgba(244, 67, 54, 0.2)',
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    zIndex: 999,
                    animation: 'pulse-red 1s infinite alternate'
                }} />
            )}


            {/* Top Right Controls (Wallet & Help) */}
            <div style={{
                position: "absolute", top: "20px", right: "20px", zIndex: 100,
                display: "flex", gap: "12px", alignItems: "center"
            }}>
                {sessionToken && (
                    <div style={{
                        background: "rgba(0, 242, 254, 0.1)",
                        border: "1px solid rgba(0, 242, 254, 0.5)",
                        color: "#00f2fe",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        boxShadow: "0 0 10px rgba(0, 242, 254, 0.2)"
                    }}>
                        SESSION ACTIVE
                    </div>
                )}
                <WalletMultiButton style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1rem",
                    fontSize: "0.85rem",
                    height: "36px",
                    lineHeight: "36px",
                    padding: "0 16px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
                }} />

                <button onClick={toggleHelp} style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.9rem",
                    backdropFilter: "blur(12px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.25s ease",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    fontFamily: "'Inter', sans-serif", fontWeight: 600
                }} onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    }}>
                    ?
                </button>
            </div>

            {/* HUD Container — bottom center */}
            <div style={{
                position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: "20px", zIndex: 100, alignItems: "flex-end", pointerEvents: "all"
            }}>
                {/* Health Bar — to the left of weapons */}
                <div style={{
                    display: "flex", flexDirection: "column", gap: "8px",
                    padding: "16px", borderRadius: "12px",
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    width: "220px"
                }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        color: "white", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "1px"
                    }}>
                        <span style={{ fontWeight: 800, color: "#8eff8e" }}>HP</span>
                        <span style={{ opacity: 0.6 }}>{Math.ceil(playerHealth)} / {stats.maxHealth}</span>
                    </div>

                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        padding: '1px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${Math.max(0, healthPercent)}%`,
                            height: '100%',
                            background: getHealthColor(),
                            borderRadius: '4px',
                            transition: 'width 0.3s ease-out, background 0.3s ease',
                            boxShadow: '0 0 10px ' + getHealthColor() + '44'
                        }} />
                    </div>

                    <div style={{
                        color: playerHealth < stats.maxHealth * 0.25 ? "#ff4500" : "rgba(255,255,255,0.3)",
                        fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1px",
                        textTransform: "uppercase", marginTop: "2px"
                    }}>
                        Condition: {playerHealth <= 0 ? "TERMINATED" : playerHealth < stats.maxHealth * 0.25 ? "CRITICAL" : "STABLE"}
                    </div>
                </div>

                {/* Weapon HUD */}
                <div style={{
                    display: "flex", gap: "6px",
                    padding: "6px 8px", borderRadius: "12px",
                    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
                }}>
                    {([
                        { label: 'FISTS', variant: 'Unarmed' as const, icon: '👊' },
                        { label: 'MELEE', variant: 'SingleWeapon' as const, icon: '🗡️' },
                        { label: 'GUN', variant: 'Standard' as const, icon: '🔫' },
                    ]).map(({ label, variant, icon }, idx) => (
                        <div
                            key={label}
                            onClick={() => setSelectedVariant(variant)}
                            style={{
                                position: "relative",
                                width: "60px", height: "60px",
                                background: selectedVariant === variant
                                    ? "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)"
                                    : "rgba(255,255,255,0.02)",
                                border: selectedVariant === variant
                                    ? "1px solid rgba(255,255,255,0.3)"
                                    : "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "8px",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", transition: "all 0.2s ease",
                                boxShadow: selectedVariant === variant
                                    ? "0 0 20px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)"
                                    : "none",
                                transform: selectedVariant === variant ? "translateY(-4px)" : "translateY(0)",
                            }}
                        >
                            <span style={{
                                fontSize: "1.3rem",
                                filter: selectedVariant === variant ? "none" : "grayscale(0.8) opacity(0.4)"
                            }}>{icon}</span>
                            <span style={{
                                color: selectedVariant === variant ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                                fontSize: "0.5rem", marginTop: "3px",
                                letterSpacing: "0.08rem", fontFamily: "'Inter', sans-serif", fontWeight: 600
                            }}>{label}</span>
                            {/* Hotkey indicator */}
                            <span style={{
                                position: "absolute", top: "3px", right: "5px",
                                fontSize: "0.45rem", color: "rgba(255,255,255,0.2)",
                                fontFamily: "monospace"
                            }}>{idx + 1}</span>
                        </div>
                    ))}
                    <div style={{
                        color: "rgba(255,255,255,0.15)", fontSize: "0.5rem",
                        fontFamily: "monospace", marginBottom: "5px", marginLeft: "6px",
                        writingMode: "vertical-rl", letterSpacing: "0.05rem"
                    }}>M</div>
                </div>
            </div>

            {/* Crosshair */}
            <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none", zIndex: 50
            }}>
                <div style={{
                    width: "2px", height: "16px",
                    background: "rgba(255,255,255,0.25)",
                    position: "absolute", top: "-8px", left: "-1px"
                }} />
                <div style={{
                    width: "16px", height: "2px",
                    background: "rgba(255,255,255,0.25)",
                    position: "absolute", top: "-1px", left: "-8px"
                }} />
                <div style={{
                    width: "3px", height: "3px", borderRadius: "50%",
                    background: "rgba(255,255,255,0.4)",
                    position: "absolute", top: "-1.5px", left: "-1.5px"
                }} />
            </div>

            <style>{`
                @keyframes pulse-red {
                    from { border-color: rgba(244, 67, 54, 0.1); }
                    to { border-color: rgba(244, 67, 54, 0.4); }
                }
                @keyframes slideInRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
            <HelpMenu />
        </>
    );
};
