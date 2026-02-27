import { useStore } from "../store";
import { useUIStore } from "../uiStore";
import { HelpMenu } from "./HelpMenu";
import { CharacterConfig, type CharacterType } from "../config/GameConfig";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from "../hooks/useProfile";
import { useBattle } from "../hooks/useBattle";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from 'react';


export const UI = () => {
    const { connected } = useWallet();
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
        selectedCharacter,
        selectedVariant, setSelectedVariant,
        gamePhase, setGamePhase,
        playerHealth,
        survivalTimeRemaining, decrementSurvivalTime,
        battleRoomId, setOnZombieKilled,
        maxPlayers, setMaxPlayers
    } = useStore();
    const toggleHelp = useUIStore((state) => state.toggleHelp);

    const [isUndelegating, setIsUndelegating] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");

    // Rollup sequence states
    const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [spDelegateStatus, setSpDelegateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [spStartStatus, setSpStartStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [hostCreateStatus, setHostCreateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
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
        if (gamePhase === 'playing' && playerHealth <= 0 && survivalTimeRemaining > 0) {
            console.log("Player died. Triggering game over sequence...");
            setGamePhase('over');
            endGame();
        }
    }, [playerHealth, gamePhase, setGamePhase, survivalTimeRemaining, endGame]);

    // Handle Victory
    useEffect(() => {
        if (gamePhase === 'playing' && survivalTimeRemaining <= 0 && playerHealth > 0) {
            console.log("Player survived. Triggering won sequence...");
            setGamePhase('won');
            endGame();
        }
    }, [survivalTimeRemaining, gamePhase, playerHealth, setGamePhase, endGame]);

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
        if (pathname === '/multiplayer' && gamePhase !== 'playing' && battleRoomId && battleAccount) {
            const isActive = battleAccount.active;
            const isJoinSuccess = joinStatus === 'done';

            if (isActive || isJoinSuccess) {
                console.log("Battle active or joined. Entering arena...");
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
                    background: "rgba(0,0,0,0.9)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 style={{ fontSize: "5rem", fontFamily: "'Creepster', cursive", color: "#ff4500" }}>APOCALYPSE</h1>
                    <div style={{ marginTop: "50px" }}>
                        <WalletMultiButton />
                    </div>
                </div>
            );
        }
        if (gamePhase === 'profile') {
            return (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.95)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 style={{ fontFamily: "'Creepster', cursive", color: "#ff4500", fontSize: "4rem" }}>INITIALIZE IDENTITY</h1>
                    <button
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
                            padding: "18px 64px", background: "rgba(255,69,0,0.1)", border: "1px solid #ff4500",
                            color: "#ff6030", cursor: "pointer", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.2rem"
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
                    background: "rgba(0,0,0,0.95)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 style={{ fontFamily: "'Creepster', cursive", color: "#00f2fe", fontSize: "4rem" }}>AUTHORIZE SESSION</h1>
                    <button
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
                            padding: "18px 64px", background: "rgba(0,242,254,0.1)", border: "1px solid #00f2fe",
                            color: "#00f2fe", cursor: "pointer", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.2rem"
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
                    background: "rgba(0,0,0,0.8)", zIndex: 1000, color: "white", textAlign: "center"
                }}>
                    <h1 style={{ fontFamily: "'Creepster', cursive", color: "#ff4500", fontSize: "5rem" }}>READY</h1>
                    <div
                        onClick={() => navigate('/choose')}
                        style={{
                            marginTop: "20px", padding: "15px 40px", border: "2px solid #ff4500",
                            borderRadius: "4px", background: "rgba(255,69,0,0.1)", cursor: "pointer"
                        }}
                    >
                        <p style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>PRESS [ ENTER ] TO SURVIVE</p>
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
                background: "rgba(0,0,0,0.97)", zIndex: 1000, color: "white", textAlign: "center"
            }}>
                <h1 style={{ fontFamily: "'Creepster', cursive", color: "#ff4500", fontSize: "5rem", marginBottom: "50px" }}>CHOOSE YOUR FATE</h1>
                <div style={{ display: "flex", gap: "40px" }}>
                    <div style={{
                        width: "350px", padding: "40px", background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                        border: "1px solid rgba(255,100,0,0.2)", transition: "0.3s all"
                    }}>
                        <h2 style={{ color: "#ff8050", letterSpacing: "4px" }}>SINGLE PLAYER</h2>
                        <p style={{ fontSize: "0.9rem", opacity: 0.6, marginBottom: "30px" }}>Explore the ruins alone and survive the horde.</p>
                        <button
                            onClick={() => navigate('/singleplayer')}
                            style={{
                                width: "100%", padding: "18px", background: "rgba(255,100,0,0.1)", border: "1px solid #ff4500",
                                color: "#ff8050", fontWeight: "bold", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px"
                            }}
                        >
                            {(profileAccount && profileAccount.gameActive) ? "RESUME SESSION" : "ENTER ARENA"}
                        </button>
                    </div>
                    <div style={{
                        width: "350px", padding: "40px", background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                        border: "1px solid rgba(0,242,254,0.2)", transition: "0.3s all"
                    }}>
                        <h2 style={{ color: "#00f2fe", letterSpacing: "4px" }}>MULTIPLAYER</h2>
                        <p style={{ fontSize: "0.9rem", opacity: 0.6, marginBottom: "30px" }}>Join other survivors in the wasteland.</p>
                        <button
                            onClick={() => navigate('/multiplayer')}
                            style={{
                                width: "100%", padding: "18px", background: "rgba(0,242,254,0.1)", border: "1px solid #00f2fe",
                                color: "#00f2fe", fontWeight: "bold", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px"
                            }}
                        >
                            {(isBattleDelegated && battleAccount) ? "RESUME BATTLE" : "ENTER LOBBY"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pathname === '/singleplayer' && gamePhase !== 'playing') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.9)", zIndex: 1000, color: "white", textAlign: "center"
            }}>
                <h1 style={{ fontFamily: "'Creepster', cursive", color: "#ff4500", fontSize: "4rem", marginBottom: "30px" }}>SINGLE PLAYER</h1>
                <div style={{
                    width: "400px", padding: "40px", background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                    border: "1px solid rgba(255,100,0,0.2)"
                }}>
                    {!isDelegated ? (
                        <>
                            <p style={{ opacity: 0.7, marginBottom: "30px" }}>Delegate your session to the Ephemeral Rollup to begin survival.</p>
                            <button
                                onClick={async () => {
                                    setSpDelegateStatus('loading');
                                    try {
                                        await delegateGame();
                                        setSpDelegateStatus('done');
                                    } catch (e) {
                                        console.error(e);
                                        setSpDelegateStatus('idle');
                                    }
                                }}
                                style={{
                                    width: "100%", padding: "18px", background: "rgba(255,100,0,0.1)", border: "1px solid #ff4500",
                                    color: "#ff8050", fontWeight: "bold", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px"
                                }}
                            >
                                {spDelegateStatus === 'loading' ? "DELEGATING..." : "DELEGATE TO ER"}
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ opacity: 0.7, marginBottom: "30px" }}>Ready for extraction. Enter the wasteland.</p>
                            <button
                                onClick={async () => {
                                    setSpStartStatus('loading');
                                    try {
                                        await startGame();
                                        setSpStartStatus('done');
                                        setGamePhase('playing');
                                    } catch (e) {
                                        console.error(e);
                                        setSpStartStatus('idle');
                                    }
                                }}
                                style={{
                                    width: "100%", padding: "18px", background: "rgba(255,100,0,0.2)", border: "1px solid #ff4500",
                                    color: "white", fontWeight: "bold", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px"
                                }}
                            >
                                {spStartStatus === 'loading' ? "STARTING..." : "START SURVIVAL"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (pathname === '/multiplayer' && gamePhase !== 'playing') {
        const isFull = battleAccount && battleAccount.playerCount >= battleAccount.maxPlayers;

        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(160deg, rgba(8,8,18,0.97) 0%, rgba(15,12,25,0.98) 50%, rgba(8,8,18,0.97) 100%)",
                backdropFilter: "blur(16px)", zIndex: 1000, color: "white", pointerEvents: "all"
            }}>
                <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}><WalletMultiButton /></div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", marginBottom: "40px", fontFamily: "'Inter', sans-serif", fontWeight: 800, background: "linear-gradient(135deg, #ff4500, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.15rem" }}>
                    {battleRoomId ? "STAGING AREA" : "MULTIPLAYER LOBBY"}
                </h2>

                {battleRoomId ? (
                    <div style={{ width: "600px", background: "rgba(255,255,255,0.02)", borderRadius: "24px", border: "1px solid rgba(255,69,0,0.15)", padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.9rem", color: "#ff8c00", letterSpacing: "2px", marginBottom: "8px" }}>ROOM ID</div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", fontFamily: "monospace" }}>#{battleRoomId}</div>
                        </div>
                        <div style={{ padding: "20px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                <span style={{ opacity: 0.6 }}>SURVIVORS</span>
                                <span style={{ color: "#00f2fe", fontWeight: "bold" }}>{battleAccount?.playerCount || 0} / {battleAccount?.maxPlayers || 2}</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ width: `${((battleAccount?.playerCount || 0) / (battleAccount?.maxPlayers || 2)) * 100}%`, height: "100%", background: "#ff4500", transition: "width 0.5s ease" }} />
                            </div>
                        </div>
                        {!isFull ? (
                            <div style={{ textAlign: "center", padding: "20px" }}>
                                <p style={{ fontSize: "1.1rem", color: "#ff4500", fontWeight: "bold", margin: "0 0 10px 0" }}>ARENA LIVE</p>
                                <p style={{ fontSize: "0.9rem", opacity: 0.6, margin: 0 }}>Players in room...</p>
                            </div>
                        ) : !battleAccount?.active ? (
                            <div style={{ textAlign: "center", padding: "20px" }}>
                                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(0,242,254,0.2)", borderTop: "3px solid #00f2fe", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
                                <p style={{ fontSize: "1.1rem", opacity: 0.8, margin: 0 }}>Room full! Waiting for host to start the battle...</p>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: "20px" }}>
                                <p style={{ fontSize: "1.2rem", color: "#00f2fe", fontWeight: "bold", margin: 0 }}>BATTLE READY - PREPARING ARENA</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: "30px" }}>
                        <div style={{ width: "320px", background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "20px" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", letterSpacing: "1px" }}>HOST BATTLE</h3>

                            {hostingStep === 'idle' && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", opacity: 0.7 }}>
                                        <span>MAX SURVIVORS</span>
                                        <span>{maxPlayers}</span>
                                    </div>
                                    <input
                                        type="range" min="2" max="4" step="1"
                                        value={maxPlayers}
                                        onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                                        style={{ width: "100%", accentColor: "#ff4500", cursor: "pointer" }}
                                    />
                                    <button
                                        onClick={async () => {
                                            const newRoomId = Math.floor(100000 + Math.random() * 900000);
                                            setHostCreateStatus('loading');
                                            try {
                                                await createBattleAccount(newRoomId, maxPlayers);
                                                setHostingStep('created');
                                                setHostCreateStatus('done');
                                            } catch (e) {
                                                console.error(e);
                                                setHostCreateStatus('idle');
                                            }
                                        }}
                                        style={{
                                            marginTop: "10px", padding: "15px", background: "rgba(255,69,0,0.15)",
                                            border: "1px solid #ff4500", color: "#ff4500", fontWeight: "bold",
                                            cursor: "pointer", borderRadius: "8px"
                                        }}
                                    >
                                        {hostCreateStatus === 'loading' ? "INITIALIZING..." : "CREATE ROOM"}
                                    </button>
                                </div>
                            )}

                            {hostingStep === 'created' && (
                                <button
                                    onClick={async () => {
                                        if (!battleRoomId) return;
                                        setHostCreateStatus('loading');
                                        try {
                                            await delegateBattleAccount(battleRoomId);
                                            setHostingStep('delegated');
                                            setHostCreateStatus('done');
                                        } catch (e) {
                                            console.error(e);
                                            setHostCreateStatus('idle');
                                        }
                                    }}
                                    style={{
                                        padding: "15px", background: "rgba(255,69,0,0.25)",
                                        border: "1px solid #ff4500", color: "white", fontWeight: "bold",
                                        cursor: "pointer", borderRadius: "8px"
                                    }}
                                >
                                    {hostCreateStatus === 'loading' ? "DELEGATING..." : "DELEGATE ROOM"}
                                </button>
                            )}

                            {hostingStep === 'delegated' && (
                                <button
                                    onClick={async () => {
                                        if (!battleRoomId) return;
                                        setHostCreateStatus('loading');
                                        try {
                                            await startBattle(battleRoomId);
                                            broadcastGameStart(battleRoomId.toString());
                                            setHostingStep('started');
                                            setHostCreateStatus('done');
                                        } catch (e) {
                                            console.error(e);
                                            setHostCreateStatus('idle');
                                        }
                                    }}
                                    style={{
                                        padding: "15px", background: "linear-gradient(135deg, #ff4500, #ff8c00)",
                                        border: "none", color: "white", fontWeight: "bold",
                                        cursor: "pointer", borderRadius: "8px", boxShadow: "0 0 15px rgba(255,69,0,0.3)"
                                    }}
                                >
                                    {hostCreateStatus === 'loading' ? "STARTING..." : "START GAME"}
                                </button>
                            )}

                            {hostingStep === 'started' && (
                                <div style={{ textAlign: "center", color: "#ff8c00", fontWeight: "bold", letterSpacing: "1px" }}>
                                    ARENA LIVE - WAITING...
                                </div>
                            )}
                        </div>
                        <div style={{ width: "320px", background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "20px" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", letterSpacing: "1px" }}>JOIN INSTANCE</h3>
                            <input type="number" placeholder="ROOM ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} style={{ padding: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", outline: "none", fontFamily: "monospace", fontSize: "1.1rem" }} />
                            <button onClick={async () => { if (!joinRoomId) return; setJoinStatus('loading'); try { await joinBattle(parseInt(joinRoomId)); setJoinStatus('done'); } catch (e) { console.error(e); setJoinStatus('idle'); } }} style={{ padding: "15px", background: "rgba(0,242,254,0.15)", border: "1px solid #00f2fe", color: "#00f2fe", fontWeight: "bold", cursor: "pointer", borderRadius: "8px" }}>
                                {joinStatus === 'loading' ? "JOINING..." : "JOIN ROOM"}
                            </button>
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
