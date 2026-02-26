import { useStore } from "../store";
import { useUIStore } from "../uiStore";
import { HelpMenu } from "./HelpMenu";
import { CharacterConfig, type CharacterType } from "../config/GameConfig";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProfile } from "../hooks/useProfile";
import { useBattle } from "../hooks/useBattle";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from 'react';

const CHARACTER_TYPES = ["Sam", "Shaun", "Lis", "Matt", "Pug", "GermanShepherd"] as CharacterType[];

export const UI = () => {
    const { connected } = useWallet();
    const { initializeProfile, checkProfileExists } = useProfile();
    const { 
        createBattleAccount, delegateBattleAccount, startBattle, joinBattle,
        endBattle, commitBattle
    } = useBattle();
    
    const {
        selectedCharacter, setSelectedCharacter,
        selectedVariant, setSelectedVariant,
        gamePhase, setGamePhase,
        playerHealth,
        gaslessNotifications,
        survivalTimeRemaining, decrementSurvivalTime,
        maxPlayers, setMaxPlayers, battleRoomId,
        remotePlayers
    } = useStore();
    const { broadcastGameStart } = useSocket();
    const toggleHelp = useUIStore((state) => state.toggleHelp);
    
    const [isUndelegating, setIsUndelegating] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");

    // Rollup sequence states
    const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [hostCreateStatus, setHostCreateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [hostDelegateStatus, setHostDelegateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [hostStartStatus, setHostStartStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'done'>('idle');

    // (killZombie logic handled differently now or safely unused here directly via UI)
    // useEffect(() => {
    //     setOnZombieKilled(killZombie);
    // }, [killZombie, setOnZombieKilled]);

    // Auto-check if profile exists when connected
    useEffect(() => {
        if (connected) {
            checkProfileExists().then(exists => {
                if (exists) {
                    setInitStatus('done');
                }
            });
        } else {
            setInitStatus('idle');
        }
    }, [connected, checkProfileExists]);

    // Handle Game Over
    useEffect(() => {
        if (gamePhase === 'playing' && playerHealth <= 0 && survivalTimeRemaining > 0) {
            console.log("Player died. Triggering game over sequence...");
            setGamePhase('over');
        }
    }, [playerHealth, gamePhase, setGamePhase, survivalTimeRemaining]);

    // Handle Victory
    useEffect(() => {
        if (gamePhase === 'playing' && survivalTimeRemaining <= 0 && playerHealth > 0) {
            console.log("Player survived. Triggering won sequence...");
            setGamePhase('won');
        }
    }, [survivalTimeRemaining, gamePhase, playerHealth, setGamePhase]);

    // Timer Tick
    useEffect(() => {
        if (gamePhase === 'playing') {
            const interval = setInterval(() => {
                decrementSurvivalTime();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gamePhase, decrementSurvivalTime]);

    if (gamePhase === 'intro') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(ellipse at 50% 30%, rgba(120,30,0,0.35) 0%, rgba(0,0,0,0.97) 70%)",
                zIndex: 1000, color: "white", textAlign: "center", pointerEvents: "all",
                overflow: "hidden"
            }}>
                {/* Animated light rays */}
                <div style={{
                    position: "absolute", top: "-20%", left: "50%", width: "200%", height: "140%",
                    transform: "translateX(-50%)",
                    background: "conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(255,80,0,0.04) 10deg, transparent 20deg, transparent 40deg, rgba(255,120,0,0.03) 50deg, transparent 60deg, transparent 80deg, rgba(255,60,0,0.05) 90deg, transparent 100deg, transparent 160deg, rgba(255,100,0,0.03) 170deg, transparent 180deg, transparent 340deg, rgba(255,80,0,0.04) 350deg, transparent 360deg)",
                    animation: "rotateRays 20s linear infinite",
                    pointerEvents: "none"
                }} />

                {/* Floating particles */}
                {[...Array(12)].map((_, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        width: `${2 + Math.random() * 3}px`,
                        height: `${2 + Math.random() * 3}px`,
                        background: `rgba(255, ${60 + Math.random() * 80}, 0, ${0.3 + Math.random() * 0.4})`,
                        borderRadius: "50%",
                        left: `${10 + Math.random() * 80}%`,
                        bottom: "-5%",
                        animation: `floatUp ${6 + Math.random() * 8}s ${Math.random() * 5}s infinite linear`,
                        filter: "blur(1px)",
                        pointerEvents: "none"
                    }} />
                ))}

                {/* Horizontal light accent */}
                <div style={{
                    position: "absolute", top: "50%", left: 0, width: "100%", height: "1px",
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,80,0,0.15) 30%, rgba(255,120,0,0.3) 50%, rgba(255,80,0,0.15) 70%, transparent 100%)",
                    transform: "translateY(-60px)",
                    filter: "blur(8px)",
                    pointerEvents: "none"
                }} />

                <h1 style={{
                    fontSize: "clamp(3rem, 8vw, 7rem)",
                    margin: 0,
                    fontFamily: "'Creepster', cursive, serif",
                    color: "#ff4500",
                    textShadow: "0 0 40px rgba(255,69,0,0.6), 0 0 80px rgba(255,69,0,0.3), 0 4px 8px rgba(0,0,0,0.8)",
                    letterSpacing: "0.6rem",
                    transform: "rotate(-1.5deg)",
                    animation: "titlePulse 3s ease-in-out infinite",
                    position: "relative", zIndex: 2
                }}>
                    APOCALYPSE
                </h1>

                <div style={{
                    width: "280px", height: "1px", margin: "24px auto",
                    background: "linear-gradient(90deg, transparent, rgba(255,69,0,0.5), transparent)",
                    position: "relative", zIndex: 2
                }} />

                <p style={{
                    fontSize: "clamp(0.8rem, 1.5vw, 1.1rem)",
                    margin: 0, opacity: 0.6,
                    letterSpacing: "0.4rem",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    textTransform: "uppercase",
                    position: "relative", zIndex: 2
                }}>
                    The Dead Walk Among Us
                </p>
                {!connected ? (
                    <div style={{ position: "relative", zIndex: 2, marginTop: "70px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <p style={{ fontFamily: "monospace", opacity: 0.6, letterSpacing: "2px" }}>CONNECT TO BEGIN</p>
                        <WalletMultiButton style={{ padding: "18px 48px", background: "rgba(255,69,0,0.2)", border: "1px solid rgba(255,69,0,0.6)", borderRadius: "8px" }} />
                    </div>
                ) : (
                    <button
                        onClick={async () => {
                            if (initStatus !== 'done') {
                                setInitStatus('loading');
                                try {
                                    await initializeProfile();
                                    setInitStatus('done');
                                } catch (e) {
                                    console.error("Init failed", e);
                                    setInitStatus('idle');
                                    return;
                                }
                            }
                            setGamePhase('lobby');
                        }}
                        style={{
                            marginTop: "70px",
                            padding: "18px 64px",
                            fontSize: "1.1rem",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            background: "transparent",
                            border: "1px solid rgba(255,69,0,0.6)",
                            color: "#ff6030",
                            cursor: "pointer",
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            textTransform: "uppercase",
                            letterSpacing: "0.3rem",
                            position: "relative", zIndex: 2,
                            boxShadow: "0 0 20px rgba(255,69,0,0.15), inset 0 0 20px rgba(255,69,0,0.05)"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,69,0,0.12)";
                            e.currentTarget.style.borderColor = "rgba(255,69,0,0.9)";
                            e.currentTarget.style.boxShadow = "0 0 40px rgba(255,69,0,0.3), inset 0 0 30px rgba(255,69,0,0.08)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.color = "#ff8050";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "rgba(255,69,0,0.6)";
                            e.currentTarget.style.boxShadow = "0 0 20px rgba(255,69,0,0.15), inset 0 0 20px rgba(255,69,0,0.05)";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.color = "#ff6030";
                        }}
                    >
                        {initStatus === 'loading' ? "INITIALIZING..." : "ENTER ARENA"}
                    </button>
                )}

                <p style={{
                    position: "absolute", bottom: "30px",
                    fontSize: "0.65rem", opacity: 0.25,
                    letterSpacing: "0.15rem", fontFamily: "monospace",
                    textTransform: "uppercase"
                }}>
                    Press any key to continue
                </p>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Inter:wght@300;400;600;700;800;900&display=swap');
                    @keyframes titlePulse {
                        0%, 100% { transform: rotate(-1.5deg) scale(1); filter: brightness(1); }
                        50% { transform: rotate(-1.5deg) scale(1.03); filter: brightness(1.15); }
                    }
                    @keyframes rotateRays {
                        from { transform: translateX(-50%) rotate(0deg); }
                        to { transform: translateX(-50%) rotate(360deg); }
                    }
                    @keyframes floatUp {
                        0% { transform: translateY(0) scale(1); opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
                    }
                `}</style>
            </div>
        );
    }

    if (gamePhase === 'lobby') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(160deg, rgba(8,8,18,0.97) 0%, rgba(15,12,25,0.98) 50%, rgba(8,8,18,0.97) 100%)",
                backdropFilter: "blur(16px)", zIndex: 1000, color: "white", pointerEvents: "all"
            }}>
                <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
                    <WalletMultiButton />
                </div>

                <h2 style={{
                    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", marginBottom: "40px",
                    fontFamily: "'Inter', sans-serif", fontWeight: 800,
                    background: "linear-gradient(135deg, #ff4500, #ff8c00)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    letterSpacing: "0.15rem"
                }}>
                    {(hostCreateStatus === 'done' || joinStatus === 'done') ? "STAGING AREA" : "MULTIPLAYER LOBBY"}
                </h2>

                {(hostCreateStatus === 'done' || joinStatus === 'done') ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "30px", alignItems: "center", width: "100%", maxWidth: "800px" }}>
                        {/* Status Header */}
                        <div style={{
                            display: "flex", justifyContent: "space-between", width: "100%",
                            background: "rgba(0,0,0,0.6)", padding: "20px 30px", borderRadius: "16px",
                            border: "1px solid rgba(255,255,255,0.1)", alignItems: "center"
                        }}>
                            <div>
                                <div style={{ fontSize: "0.8rem", opacity: 0.6, letterSpacing: "2px", marginBottom: "4px" }}>ROOM CODE</div>
                                <div style={{ fontSize: "2.5rem", fontWeight: "bold", letterSpacing: "6px", color: "#00f2fe", textShadow: "0 0 15px rgba(0,242,254,0.3)" }}>
                                    {battleRoomId}
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.8rem", opacity: 0.6, letterSpacing: "2px", marginBottom: "4px" }}>PLAYERS CONNECTED</div>
                                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#8eff8e" }}>
                                    {Object.keys(remotePlayers).length + 1} <span style={{ fontSize: "1rem", opacity: 0.6 }}>/ {maxPlayers}</span>
                                </div>
                            </div>
                        </div>

                        {/* Character Selection */}
                        <div style={{ width: "100%", background: "rgba(0,0,0,0.4)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <h3 style={{ margin: "0 0 20px 0", letterSpacing: "2px", color: "white", textAlign: "center", fontSize: "1.2rem", fontWeight: 600 }}>CHOOSE YOUR AGENT</h3>
                            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", justifyContent: "center" }}>
                                {CHARACTER_TYPES.map(char => (
                                    <div 
                                        key={char}
                                        onClick={() => setSelectedCharacter(char)}
                                        style={{
                                            padding: "16px 24px", background: selectedCharacter === char ? "rgba(255,69,0,0.3)" : "rgba(255,255,255,0.05)",
                                            border: selectedCharacter === char ? "2px solid #ff4500" : "2px solid transparent",
                                            borderRadius: "12px", cursor: "pointer", transition: "0.2s all",
                                            color: selectedCharacter === char ? "white" : "rgba(255,255,255,0.6)",
                                            fontWeight: selectedCharacter === char ? "bold" : "normal",
                                            boxShadow: selectedCharacter === char ? "0 0 20px rgba(255,69,0,0.2)" : "none",
                                            transform: selectedCharacter === char ? "scale(1.05)" : "scale(1)"
                                        }}
                                    >
                                        {char.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Panel */}
                        <div style={{ display: "flex", gap: "20px", width: "100%", justifyContent: "center" }}>
                            {hostCreateStatus === 'done' ? (
                                <>
                                    <button 
                                        disabled={hostDelegateStatus !== 'idle'}
                                        onClick={async () => {
                                            if (!battleRoomId) return;
                                            try {
                                                setHostDelegateStatus('loading');
                                                await delegateBattleAccount(battleRoomId);
                                                setHostDelegateStatus('done');
                                            } catch (e) {
                                                console.error("Failed to delegate room", e);
                                                setHostDelegateStatus('idle');
                                            }
                                        }}
                                        style={{ 
                                            flex: 1, padding: "20px", background: hostDelegateStatus === 'done' ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.1)", 
                                            border: hostDelegateStatus === 'done' ? "1px solid #4CAF50" : "1px solid rgba(255,255,255,0.2)", 
                                            color: hostDelegateStatus === 'done' ? "#8eff8e" : "white", fontWeight: "bold", borderRadius: "12px", 
                                            cursor: hostDelegateStatus !== 'idle' ? "not-allowed" : "pointer", transition: "0.3s", letterSpacing: "1px"
                                        }}
                                    >
                                        {hostDelegateStatus === 'done' ? "✓ ROOM DELEGATED" : hostDelegateStatus === 'loading' ? "DELEGATING..." : "1. DELEGATE TO L2"}
                                    </button>

                                    <button 
                                        disabled={hostDelegateStatus !== 'done' || hostStartStatus !== 'idle'}
                                        onClick={async () => {
                                            if (!battleRoomId) return;
                                            try {
                                                setHostStartStatus('loading');
                                                await startBattle(battleRoomId);
                                                setHostStartStatus('done');
                                                broadcastGameStart(battleRoomId);
                                                setGamePhase('playing');
                                            } catch (e) {
                                                console.error("Failed to start room", e);
                                                setHostStartStatus('idle');
                                            }
                                        }}
                                        style={{ 
                                            flex: 1, padding: "20px", background: hostStartStatus === 'done' ? "rgba(76,175,80,0.2)" : "rgba(255,69,0,0.3)", 
                                            border: hostStartStatus === 'done' ? "1px solid #4CAF50" : "1px solid #ff4500", 
                                            color: hostStartStatus === 'done' ? "#8eff8e" : "white", fontWeight: "bold", borderRadius: "12px", 
                                            cursor: (hostDelegateStatus !== 'done' || hostStartStatus !== 'idle') ? "not-allowed" : "pointer", transition: "0.3s",
                                            opacity: hostDelegateStatus !== 'done' ? 0.3 : 1, letterSpacing: "1px"
                                        }}
                                    >
                                        {hostStartStatus === 'done' ? "✓ STARTED" : hostStartStatus === 'loading' ? "STARTING..." : "2. START MATCH"}
                                    </button>
                                </>
                            ) : (
                                <div style={{ padding: "24px", background: "rgba(0,242,254,0.1)", border: "1px solid rgba(0,242,254,0.3)", borderRadius: "12px", width: "100%", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.2rem", color: "#00f2fe", fontWeight: "bold", letterSpacing: "2px", animation: "titlePulse 2.5s infinite" }}>
                                        WAITING FOR HOST TO START MATCH...
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: "40px", alignItems: "stretch" }}>
                        {/* HOST ROOM PANE */}
                        <div style={{
                            background: "rgba(0,0,0,0.5)", padding: "30px", borderRadius: "16px",
                            border: "1px solid rgba(255,69,0,0.3)", width: "320px", display: "flex", flexDirection: "column", gap: "12px"
                        }}>
                            <h3 style={{ margin: "0 0 20px 0", letterSpacing: "2px", color: "#ff8c00" }}>HOST ROOM</h3>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.8rem", opacity: 0.7 }}>
                                    PLAYERS ({maxPlayers})
                                </label>
                                <input 
                                    type="range" min="1" max="4" value={maxPlayers} 
                                    onChange={e => setMaxPlayers(parseInt(e.target.value))} 
                                    style={{ width: "100%" }}
                                />
                            </div>
                            
                            <button 
                                disabled={hostCreateStatus !== 'idle'}
                                onClick={async () => {
                                    try {
                                        setHostCreateStatus('loading');
                                        const newRoomId = Math.floor(100000 + Math.random() * 900000); // 6-digit
                                        await createBattleAccount(newRoomId, maxPlayers);
                                        setHostCreateStatus('done');
                                    } catch (e) {
                                        console.error("Failed to create room", e);
                                        setHostCreateStatus('idle');
                                    }
                                }}
                                style={{ 
                                    padding: "16px", background: "rgba(255,69,0,0.2)", 
                                    border: "1px solid #ff4500", 
                                    color: "white", fontWeight: "bold", borderRadius: "8px", 
                                    cursor: hostCreateStatus !== 'idle' ? "not-allowed" : "pointer", transition: "0.3s",
                                    marginTop: "auto"
                                }}
                            >
                                {hostCreateStatus === 'loading' ? "CREATING..." : "CREATE ROOM"}
                            </button>
                        </div>

                        {/* JOIN ROOM PANE */}
                        <div style={{
                            background: "rgba(0,0,0,0.5)", padding: "30px", borderRadius: "16px",
                            border: "1px solid rgba(0,242,254,0.3)", width: "320px", display: "flex", flexDirection: "column"
                        }}>
                            <h3 style={{ margin: "0 0 20px 0", letterSpacing: "2px", color: "#00f2fe" }}>JOIN ROOM</h3>
                            
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.8rem", opacity: 0.7 }}>
                                    ENTER 6-DIGIT CODE
                                </label>
                                <input 
                                    type="text" maxLength={6} value={joinRoomId} 
                                    onChange={e => setJoinRoomId(e.target.value.replace(/\D/g, ''))} 
                                    style={{ 
                                        width: "100%", padding: "12px", background: "rgba(0,0,0,0.3)", color: "white",
                                        border: "1px solid rgba(0,242,254,0.3)", borderRadius: "8px", fontSize: "1.2rem",
                                        textAlign: "center", letterSpacing: "8px", fontWeight: "bold"
                                    }}
                                />
                            </div>
                            
                            <button 
                                disabled={joinStatus === 'loading' || joinRoomId.length !== 6}
                                onClick={async () => {
                                    try {
                                        console.log("Attempting to join parsed ID:", parseInt(joinRoomId));
                                        setJoinStatus('loading');
                                        await joinBattle(parseInt(joinRoomId));
                                        console.log("Join Success!");
                                        setJoinStatus('done');
                                    } catch (e) {
                                        console.error("Failed to join room", e);
                                        setJoinStatus('idle');
                                    }
                                }}
                                style={{ 
                                    padding: "16px", background: "rgba(0,242,254,0.2)", border: "1px solid #00f2fe", 
                                    color: "white", fontWeight: "bold", borderRadius: "8px", 
                                    cursor: (joinStatus === 'loading' || joinRoomId.length !== 6) ? "not-allowed" : "pointer",
                                    marginTop: "auto", transition: "0.3s", opacity: (joinStatus === 'loading' || joinRoomId.length !== 6) ? 0.5 : 1
                                }}
                            >
                                {joinStatus === 'loading' ? "JOINING..." : "JOIN ROOM"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

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

            {/* Gasless Notifications Area */}
            <div style={{
                position: "fixed", top: "80px", right: "20px",
                display: "flex", flexDirection: "column", gap: "8px", zIndex: 100,
                pointerEvents: "none", alignItems: "flex-end"
            }}>
                {gaslessNotifications.map(notification => (
                    <div key={notification.id} style={{
                        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
                        border: "1px solid rgba(0, 242, 254, 0.4)",
                        padding: "10px 16px", borderRadius: "8px",
                        display: "flex", alignItems: "center", gap: "10px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 10px rgba(0,242,254,0.15)",
                        animation: "slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                        color: "#b0e0ff", fontFamily: "'Inter', sans-serif"
                    }}>
                        <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: "#00f2fe", boxShadow: "0 0 8px #00f2fe"
                        }} />
                        <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.5px" }}>Gasless TX</div>
                            <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{notification.message}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Right Controls (Wallet & Help) */}
            <div style={{ 
                position: "absolute", top: "20px", right: "20px", zIndex: 100,
                display: "flex", gap: "12px", alignItems: "center" 
            }}>
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
