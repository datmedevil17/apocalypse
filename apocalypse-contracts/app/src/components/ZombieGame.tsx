import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
    Skull, Swords, User, Zap, Shield, Trophy, ChevronRight,
    Loader2, Radio, Users, KeyRound, Copy, RotateCcw, ExternalLink,
    Crown, Crosshair, Lock, Unlock, Activity, Hash,
} from "lucide-react";
import { useCounterProgram, type BattleAccount } from "../hooks/use-counter-program";
import { useToast, useToastTx } from "./Toast";
import { PublicKey } from "@solana/web3.js";

// ============================================================
// Shared small helpers
// ============================================================
function shortenKey(pk: PublicKey | string | null | undefined) {
    if (!pk) return "–";
    try {
        const s = typeof pk === "string" ? pk : pk.toBase58();
        return `${s.slice(0, 6)}…${s.slice(-4)}`;
    } catch { return "–"; }
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="ml-1 text-zinc-500 hover:text-violet-400 transition-colors"
            title="Copy"
        >
            {copied ? "✓" : <Copy className="w-3 h-3 inline" />}
        </button>
    );
}

function StatBadge({ label, value, accent = false, sub }: { label: string; value: string | number; accent?: boolean; sub?: string }) {
    return (
        <div className={`flex flex-col items-center p-3 rounded-xl border ${accent ? "border-violet-500/40 bg-violet-950/30" : "border-zinc-700/50 bg-zinc-800/40"}`}>
            <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</span>
            <span className={`text-lg font-bold ${accent ? "text-violet-300" : "text-white"}`}>{value}</span>
            {sub && <span className="text-[10px] text-zinc-600 mt-0.5">{sub}</span>}
        </div>
    );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <span className="text-violet-400">{icon}</span>
            <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
    );
}

function ActionButton({
    onClick, disabled, loading, children, variant = "primary", small = false, className = ""
}: {
    onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode;
    variant?: "primary" | "danger" | "ghost" | "green" | "amber"; small?: boolean; className?: string;
}) {
    const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`;
    const variants = {
        primary: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40",
        danger: "bg-red-600   hover:bg-red-500   text-white shadow-lg shadow-red-900/30",
        ghost: "border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white bg-zinc-800/50",
        green: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40",
        amber: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40",
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {children}
        </button>
    );
}

function FlowStep({ step, label, done, active }: { step: number; label: string; done: boolean; active: boolean }) {
    return (
        <div className={`flex items-center gap-2 text-xs transition-colors ${active ? "text-violet-300" : done ? "text-emerald-400" : "text-zinc-600"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${active ? "border-violet-400 text-violet-300" : done ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" : "border-zinc-700"}`}>
                {done ? "✓" : step}
            </div>
            {label}
        </div>
    );
}

// ============================================================
// Single Player Panel
// ============================================================
function SinglePlayerPanel() {
    const {
        profilePubkey, profileAccount, delegationStatus, erProfilePoints,
        initializeProfile, delegateGame, startGame, killZombie, endGame, undelegateGame,
        createSession, sessionToken, isLoading, checkDelegation, refetch,
    } = useCounterProgram();
    const { toast } = useToast();
    const txToast = useToastTx();
    const wallet = useWallet();

    const isDelegate = delegationStatus === "delegated";
    const isChecking = delegationStatus === "checking";
    const hasProfile = !!profileAccount;
    const hasSession = !!sessionToken;
    const gameActive = !!profileAccount?.gameActive;

    const handleInit = () => txToast(() => initializeProfile(), { pending: "Initializing profile…", success: "Profile initialized!" });
    const handleDelegate = () => txToast(() => delegateGame(), { pending: "Delegating to ER…", success: "Profile delegated to ER!" });
    const handleSession = () => txToast(() => createSession(), { pending: "Creating session key…", success: "Session key created!", isEr: true });
    const handleStartGame = () => txToast(() => startGame(), { pending: "Starting game on ER…", success: "Game started! Kill zombies! 🎮", isEr: true });
    const handleKill = (pts: number) => txToast(() => killZombie(pts), { pending: `Killing zombie (+${pts}pts)…`, success: `Zombie killed! +${pts} points 💀`, isEr: true });
    const handleEndGame = () => txToast(() => endGame(), { pending: "Ending game session…", success: "Game ended! Ready to settle.", isEr: true });
    const handleUndelegate = () => txToast(() => undelegateGame(), { pending: "Committing & undelegating…", success: "Points settled on-chain! 🏆", isEr: true });
    const handleRefresh = async () => { await refetch(); await checkDelegation(); toast({ type: "info", title: "State refreshed" }); };

    return (
        <div className="space-y-5">
            {/* Profile info */}
            <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/30 space-y-3">
                <SectionTitle icon={<User className="w-4 h-4" />} title="Player Profile" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatBadge label="Points (Base)" value={profileAccount ? profileAccount.points.toString() : "–"} />
                    <StatBadge label="Points (ER)" value={erProfilePoints !== null ? erProfilePoints.toString() : "–"} accent />
                    <StatBadge label="Game Active" value={gameActive ? "Yes" : "No"} />
                    <StatBadge label="ER Status" value={isChecking ? "…" : isDelegate ? "Delegated" : "Base"} accent={isDelegate} />
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                    Profile PDA: <span className="text-zinc-400 font-mono">{shortenKey(profilePubkey)}</span>
                    {profilePubkey && <CopyButton text={profilePubkey.toBase58()} />}
                    {wallet.publicKey && (
                        <a href={`https://explorer.solana.com/address/${profilePubkey?.toBase58()}?cluster=devnet`}
                            target="_blank" rel="noreferrer"
                            className="ml-2 text-violet-500 hover:text-violet-300 inline-flex items-center gap-1">
                            Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>

            {/* Flow steps */}
            <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/20">
                <SectionTitle icon={<ChevronRight className="w-4 h-4" />} title="Integration Flow" />
                <div className="flex flex-col gap-2">
                    <FlowStep step={1} label="Initialize Profile (Base Layer)" done={hasProfile} active={!hasProfile} />
                    <FlowStep step={2} label="Delegate Game to ER (Base Layer)" done={isDelegate} active={hasProfile && !isDelegate} />
                    <FlowStep step={3} label="Create Session Key (no-popup ER txns)" done={hasSession} active={!hasSession} />
                    <FlowStep step={4} label="Start Game (ER)" done={gameActive} active={isDelegate && !gameActive} />
                    <FlowStep step={5} label="Kill Zombies (ER, session key)" done={false} active={gameActive} />
                    <FlowStep step={6} label="End Game → Commit & Undelegate (ER → Base)" done={false} active={!gameActive && isDelegate && hasProfile} />
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/20 space-y-4">
                <SectionTitle icon={<Zap className="w-4 h-4" />} title="Actions" />

                <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Step 1 — Setup</p>
                    <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={handleInit} loading={isLoading} disabled={!wallet.publicKey}>
                            <User className="w-3.5 h-3.5" /> Initialize Profile
                        </ActionButton>
                        <ActionButton onClick={handleDelegate} loading={isLoading} disabled={!hasProfile || isDelegate} variant="ghost">
                            <Shield className="w-3.5 h-3.5" /> Delegate to ER
                        </ActionButton>
                        <ActionButton onClick={handleSession} loading={isLoading} disabled={!wallet.publicKey} variant="ghost">
                            <KeyRound className="w-3.5 h-3.5" /> {hasSession ? "Refresh Session" : "Create Session"}
                        </ActionButton>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Step 2 — Gameplay (ER)</p>
                    <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={handleStartGame} loading={isLoading} disabled={!isDelegate || gameActive} variant="green">
                            <Radio className="w-3.5 h-3.5" /> Start Game
                        </ActionButton>
                        {[10, 25, 50, 100].map(pts => (
                            <ActionButton key={pts} onClick={() => handleKill(pts)} loading={isLoading} disabled={!gameActive} variant="danger" small>
                                <Skull className="w-3 h-3" /> +{pts}pts
                            </ActionButton>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Step 3 — Settle</p>
                    <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={handleEndGame} loading={isLoading} disabled={!gameActive} variant="ghost">
                            End Game
                        </ActionButton>
                        <ActionButton onClick={handleUndelegate} loading={isLoading} disabled={!isDelegate} variant="ghost">
                            <Trophy className="w-3.5 h-3.5" /> Commit & Undelegate
                        </ActionButton>
                    </div>
                </div>

                <div className="pt-1 border-t border-zinc-700/40">
                    <ActionButton onClick={handleRefresh} loading={isLoading} variant="ghost" small>
                        <RotateCcw className="w-3 h-3" /> Refresh State
                    </ActionButton>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Multiplayer Panel
// ============================================================
function MultiplayerPanel() {
    const {
        createBattleAccount, delegateBattleAccount, startMultiplayerBattle,
        joinBattle, killZombieBattle, endBattle, commitBattle,
        fetchBattleAccount, fetchBattleAccountEr, deriveBattlePda,
        erProgram, erConnection,
        createSession, sessionToken, isLoading,
    } = useCounterProgram();
    const wallet = useWallet();
    const txToast = useToastTx();
    const { toast } = useToast();

    const [roomId, setRoomId] = useState<string>("1");
    const [maxPlayers, setMaxPlayers] = useState<string>("4");
    const [battleAccount, setBattleAccount] = useState<BattleAccount | null>(null);
    const [battlePubkey, setBattlePubkey] = useState<string>("");
    const [isFetching, setIsFetching] = useState(false);
    const [activityLog, setActivityLog] = useState<string[]>([]);
    const [isBattleDelegated, setIsBattleDelegated] = useState(false);

    const rid = BigInt(roomId || "0");
    const active = battleAccount?.active ?? false;
    const isHost = !!(wallet.publicKey && battleAccount?.host.equals(wallet.publicKey));

    // ---- Decode raw ER battle data ----
    const decodeBattle = useCallback((decoded: any): BattleAccount => ({
        host: decoded.host,
        roomId: BigInt(decoded.roomId.toString()),
        maxPlayers: decoded.maxPlayers,
        playerCount: decoded.playerCount,
        totalZombieKills: BigInt(decoded.totalZombieKills.toString()),
        totalPoints: BigInt(decoded.totalPoints.toString()),
        active: decoded.active,
    }), []);

    const addLog = useCallback((msg: string) => {
        setActivityLog(prev => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} ${msg}`, ...prev].slice(0, 8));
    }, []);

    // ---- Refresh: prefer ER (live when delegated), fallback to base ----
    const refreshBattle = useCallback(async () => {
        setIsFetching(true);
        try {
            const pda = deriveBattlePda(rid);
            setBattlePubkey(pda.toBase58());
            // ER returns data only when the account is delegated; base layer is the fallback
            const erData = await fetchBattleAccountEr(rid);
            const baseData = erData ? null : await fetchBattleAccount(rid);
            setIsBattleDelegated(!!erData);
            setBattleAccount(erData ?? baseData);
        } catch {
            setBattleAccount(null);
            setIsBattleDelegated(false);
        } finally { setIsFetching(false); }
    }, [fetchBattleAccount, fetchBattleAccountEr, deriveBattlePda, rid]);

    useEffect(() => { refreshBattle(); }, [roomId]);

    // ---- ER WS: live updates on battle PDA + toast other players' actions ----
    useEffect(() => {
        if (!erProgram || !erConnection || !battlePubkey) return;
        let pda: PublicKey;
        try { pda = new PublicKey(battlePubkey); } catch { return; }
        const sub = erConnection.onAccountChange(pda, (info) => {
            try {
                const prev = battleAccount;
                const decoded = erProgram.coder.accounts.decode("battle", info.data);
                const next = decodeBattle(decoded);
                setBattleAccount(next);

                // Show toasts for other players' actions.
                // Skip when isLoading is true — that means WE just sent the tx
                // and txToast already handles our own notification.
                const byOther = !isLoading;

                if (prev && next.totalZombieKills > prev.totalZombieKills) {
                    const kills = next.totalZombieKills - prev.totalZombieKills;
                    const pts = next.totalPoints - prev.totalPoints;
                    addLog(`💀 ${kills} zombie${kills > 1 ? "s" : ""} killed (+${pts} pts)`);
                    if (byOther) toast({ type: "info", title: `💀 Enemy fell! +${pts} pts`, message: `Room ${next.roomId} — total kills: ${next.totalZombieKills}` });
                }
                if (prev && next.playerCount > prev.playerCount) {
                    addLog(`👤 Player joined (${next.playerCount}/${next.maxPlayers})`);
                    if (byOther) toast({ type: "info", title: `👤 Player joined the battle!`, message: `Room ${next.roomId} — ${next.playerCount}/${next.maxPlayers} players` });
                }
                if (!prev?.active && next.active) {
                    addLog("🔥 Battle started!");
                    if (byOther) toast({ type: "success", title: "🔥 Battle started!", message: `Room ${next.roomId} is now live` });
                }
                if (prev?.active && !next.active) {
                    addLog("🏁 Battle ended.");
                    if (byOther) toast({ type: "info", title: "🏁 Battle has ended", message: `Final: ${next.totalPoints} pts / ${next.totalZombieKills} kills` });
                }
            } catch (e) { console.error("Failed to decode ER battle:", e); }
        }, "confirmed");
        return () => { erConnection.removeAccountChangeListener(sub); };
    }, [erProgram, erConnection, battlePubkey, decodeBattle, addLog, isLoading, toast]);  // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Action wrappers (post-tx re-fetch) ----
    const run = useCallback(async (
        fn: () => Promise<string>, pending: string, success: string, isEr = false, logMsg?: string
    ) => {
        await txToast(fn, { pending, success, isEr });
        await refreshBattle();
        if (logMsg) addLog(logMsg);
    }, [txToast, refreshBattle, addLog]);

    const handleCreate = () => run(() => createBattleAccount(rid, Number(maxPlayers)), "Creating battle room…", `Room ${roomId} created!`, false, `🏠 Room ${roomId} created (max ${maxPlayers} players)`);
    const handleDelegate = () => run(() => delegateBattleAccount(rid), "Delegating battle to ER…", "Battle room delegated to ER!", false, "⚡ Room delegated to Ephemeral Rollup");
    const handleSession = () => txToast(() => createSession(), { pending: "Creating session key…", success: "Session key ready!", isEr: true });
    const handleStart = () => run(() => startMultiplayerBattle(rid), "Starting multiplayer battle…", "Battle started! 🔥", true);
    const handleJoin = () => run(() => joinBattle(rid), `Joining room ${roomId}…`, `Joined room ${roomId}!`, true);
    const handleKill = (pts: number) => run(() => killZombieBattle(rid, pts), `Killing zombie (+${pts}pts)…`, `+${pts} pts! 💀`, true);
    const handleEnd = () => run(() => endBattle(rid), "Ending battle…", "Battle ended! 🏁", true);
    const handleCommit = () => run(() => commitBattle(rid), "Committing to base layer…", "Battle settled on-chain! 🏆", true);

    // ---- Player count progress ----
    const maxP = battleAccount?.maxPlayers ?? 4;
    const curP = battleAccount?.playerCount ?? 0;
    const pct = Math.round((curP / maxP) * 100);

    return (
        <div className="space-y-5">

            {/* ── Room Selector ── */}
            <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/30 space-y-4">
                <SectionTitle icon={<Hash className="w-4 h-4" />} title="Battle Room" />

                <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Room ID</label>
                        <input type="number" min="1" value={roomId} onChange={e => setRoomId(e.target.value)}
                            className="w-24 bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Max Players</label>
                        <input type="number" min="2" max="10" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
                            className="w-24 bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                    <ActionButton onClick={refreshBattle} loading={isFetching} variant="ghost" small>
                        <RotateCcw className="w-3 h-3" /> Refresh
                    </ActionButton>
                </div>

                {/* Battle PDA row */}
                {battlePubkey && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600">PDA:</span>
                        <span className="text-zinc-400 font-mono">{shortenKey(battlePubkey)}</span>
                        <CopyButton text={battlePubkey} />
                        <a href={`https://explorer.solana.com/address/${battlePubkey}?cluster=devnet`}
                            target="_blank" rel="noreferrer"
                            className="text-violet-500 hover:text-violet-300 inline-flex items-center gap-1">
                            Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>

            {/* ── Battle Status Card ── */}
            {battleAccount ? (
                <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/20 space-y-4">
                    {/* Status header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                            <span className={`text-sm font-semibold ${active ? "text-emerald-300" : "text-amber-300"}`}>
                                {active ? "ARENA LIVE" : "READY FOR ACTION"}
                            </span>
                            {isHost && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                    <Crown className="w-2.5 h-2.5" /> Host
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-zinc-600">Room #{battleAccount.roomId.toString()}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatBadge label="Players" value={`${curP}/${maxP}`} sub={`${pct}% full`} />
                        <StatBadge label="Total Kills" value={battleAccount.totalZombieKills.toString()} accent />
                        <StatBadge label="Total Points" value={battleAccount.totalPoints.toString()} accent />
                        <StatBadge label="Host" value={shortenKey(battleAccount.host)} />
                    </div>

                    {/* Player count bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500">
                            <span>Players</span><span>{curP}/{maxP}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-2xl border border-dashed border-zinc-700/50 bg-zinc-900/20 text-center">
                    <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-600">No battle room found for Room ID <span className="text-zinc-400">{roomId}</span></p>
                    <p className="text-xs text-zinc-700 mt-1">Create one below to become the host.</p>
                </div>
            )}

            {/* ── Flow Indicator ── */}
            <div className="p-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/20">
                <SectionTitle icon={<ChevronRight className="w-4 h-4" />} title="Multiplayer Flow" />
                <div className="flex flex-col gap-2">
                    <FlowStep step={1} label="Host: Create Battle Room (Base Layer)" done={!!battleAccount} active={!battleAccount} />
                    <FlowStep step={2} label="Host: Delegate Battle to ER (Base Layer)" done={false} active={!!battleAccount && !active} />
                    <FlowStep step={3} label="Create Session Key (no-popup ER txns)" done={!!sessionToken} active={!sessionToken} />
                    <FlowStep step={4} label="Host: Start Battle / Players: Join (ER)" done={active} active={!!battleAccount} />
                    <FlowStep step={5} label="All Players: Kill Zombies (ER, session keys)" done={false} active={active} />
                    <FlowStep step={6} label="Host: End Battle + Commit (ER → Base)" done={false} active={active && isHost} />
                </div>
            </div>

            {/* ── Actions — two role columns ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Role Column (Sequential Host Actions) */}
                <div className="p-4 rounded-2xl border border-amber-600/20 bg-amber-950/10 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-300">Host Actions</span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Battle Stage</p>
                        <div className="flex flex-col gap-2">
                            {/* Step 1: Create */}
                            {!battleAccount && (
                                <ActionButton onClick={handleCreate} loading={isLoading} disabled={!wallet.publicKey} variant="amber">
                                    <Users className="w-3.5 h-3.5" /> CREATE ROOM
                                </ActionButton>
                            )}

                            {/* Step 2: Delegate */}
                            {battleAccount && !isBattleDelegated && (
                                <ActionButton onClick={handleDelegate} loading={isLoading} variant="amber">
                                    <Lock className="w-3.5 h-3.5" /> DELEGATE TO ER
                                </ActionButton>
                            )}

                            {/* Step 3: Start */}
                            {battleAccount && isBattleDelegated && !active && (
                                <ActionButton onClick={handleStart} loading={isLoading} variant="green">
                                    <Radio className="w-3.5 h-3.5" /> START BATTLE
                                </ActionButton>
                            )}

                            {/* Step 4: Active */}
                            {active && (
                                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-center font-bold">
                                    🔥 ARENA LIVE
                                </div>
                            )}

                            {/* Settle/End - Only show if host */}
                            {isHost && (active || (isBattleDelegated && !active && curP > 0)) && (
                                <div className="pt-2 mt-2 border-t border-amber-600/20 flex flex-col gap-2">
                                    <ActionButton onClick={handleEnd} loading={isLoading} disabled={!active} variant="ghost" small>
                                        <Unlock className="w-3.5 h-3.5" /> End Battle
                                    </ActionButton>
                                    <ActionButton onClick={handleCommit} loading={isLoading} disabled={active || !isBattleDelegated} variant="danger" small>
                                        <Trophy className="w-3 h-3" /> Commit & Settle
                                    </ActionButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Player column */}
                <div className="p-4 rounded-2xl border border-violet-600/20 bg-violet-950/10 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Crosshair className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-violet-300">Player Actions</span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Session</p>
                        <ActionButton onClick={handleSession} loading={isLoading} disabled={!wallet.publicKey} variant="ghost">
                            <KeyRound className="w-3.5 h-3.5" /> {sessionToken ? "Refresh Session" : "Create Session"}
                        </ActionButton>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Join + Kill (ER)</p>
                        <div className="flex flex-col gap-2">
                            <ActionButton onClick={handleJoin} loading={isLoading} disabled={!active} variant="primary">
                                <Users className="w-3.5 h-3.5" /> Join Room
                            </ActionButton>
                            <div className="flex flex-wrap gap-1.5">
                                {[10, 25, 50, 100].map(pts => (
                                    <ActionButton key={pts} onClick={() => handleKill(pts)} loading={isLoading} disabled={!active} variant="danger" small>
                                        <Skull className="w-3 h-3" /> +{pts}
                                    </ActionButton>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Activity Log ── */}
            {activityLog.length > 0 && (
                <div className="p-4 rounded-2xl border border-zinc-700/30 bg-zinc-900/40 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Activity</span>
                    </div>
                    <div className="space-y-1">
                        {activityLog.map((entry, i) => (
                            <div key={i} className={`text-xs font-mono px-2 py-1 rounded-lg ${i === 0 ? "text-white bg-zinc-800/60" : "text-zinc-500"}`}>
                                {entry}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

// ============================================================
// Session Info Bar
// ============================================================
function SessionBar() {
    const { sessionToken } = useCounterProgram();
    const wallet = useWallet();
    if (!wallet.publicKey) return null;
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs border ${sessionToken ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" : "border-zinc-700/40 text-zinc-600"}`}>
            <KeyRound className="w-3 h-3" />
            {sessionToken
                ? <>Session key active — no wallet popup for ER transactions</>
                : <>No session key — ER transactions will require wallet approval</>
            }
        </div>
    );
}

// ============================================================
// Root component
// ============================================================
export function ZombieGame() {
    const [tab, setTab] = useState<"solo" | "multi">("solo");
    const wallet = useWallet();

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
                            <Skull className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white">Apocalypse</h1>
                            <p className="text-[10px] text-zinc-500">Zombie Game · MagicBlock ER · Devnet</p>
                        </div>
                    </div>
                    <WalletMultiButton style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "12px" }} />
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-5">
                {!wallet.publicKey ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-2">
                            <Skull className="w-8 h-8 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-bold">Connect your wallet to start</h2>
                        <p className="text-sm text-zinc-500 max-w-xs">Connect to Devnet to initialize your profile, delegate to the Ephemeral Rollup, and start killing zombies.</p>
                        <WalletMultiButton />
                    </div>
                ) : (
                    <>
                        <SessionBar />

                        {/* Tabs */}
                        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
                            {(["solo", "multi"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${tab === t ? "bg-violet-600 text-white shadow-lg" : "text-zinc-500 hover:text-white"}`}>
                                    {t === "solo"
                                        ? <><User className="w-3.5 h-3.5" /> Single Player</>
                                        : <><Swords className="w-3.5 h-3.5" /> Multiplayer</>
                                    }
                                </button>
                            ))}
                        </div>

                        {tab === "solo" && <SinglePlayerPanel />}
                        {tab === "multi" && <MultiplayerPanel />}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800/50 py-3 text-center text-[11px] text-zinc-700">
                MagicBlock Ephemeral Rollups · Solana Devnet · Session Keys enabled
            </footer>
        </div>
    );
}
