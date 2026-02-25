import { useStore } from "../store";
import { useUIStore } from "../uiStore";

export const HelpMenu = () => {
    const selectedCharacter = useStore((state) => state.selectedCharacter);
    const { helpOpen, toggleHelp } = useUIStore();

    if (!helpOpen) return null;

    const isAnimal = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd';

    const shortcuts = isAnimal ? [
        { key: "1", action: "Attack" },
        { key: "2", action: "Eating" },
        { key: "3", action: "Idle_2" },
        { key: "4", action: "Idle_2_HeadLow" },
        { key: "5", action: "Run_Jump" },
        { key: "6", action: "Death" },
        { key: "7", action: "HitReact_Left" },
        { key: "8", action: "HitReact_Right" },
        { key: "9", action: "Walk (Action State)" },
        { key: "0", action: "Reset to Idle" },
    ] : [
        { key: "1", action: "Wave" },
        { key: "2", action: "Punch" },
        { key: "3", action: "Slash" },
        { key: "4", action: "Stab" },
        { key: "5", action: "Yes" },
        { key: "6", action: "No" },
        { key: "7", action: "Duck" },
        { key: "8", action: "HitReact" },
        { key: "9", action: "Death" },
        { key: "0", action: "Reset to Idle" },
    ];

    return (
        <>
            {/* Backdrop */}
            <div onClick={toggleHelp} style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                zIndex: 999
            }} />

            <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                background: "linear-gradient(145deg, rgba(12,12,24,0.95) 0%, rgba(8,8,18,0.97) 100%)",
                padding: "32px 36px", borderRadius: "16px",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "white", zIndex: 1000, minWidth: "360px",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
                animation: "helpFadeIn 0.2s ease-out"
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "24px", paddingBottom: "16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)"
                }}>
                    <h2 style={{
                        margin: 0, fontSize: "0.75rem", fontWeight: 600,
                        letterSpacing: "0.2rem", color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase"
                    }}>Controls</h2>
                    <button onClick={toggleHelp} style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", cursor: "pointer",
                        padding: "4px 10px", borderRadius: "6px", transition: "all 0.2s ease",
                        fontFamily: "'Inter', sans-serif"
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                        }}>
                        ESC
                    </button>
                </div>

                {/* Movement section */}
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        {[
                            { key: "WASD", action: "Move" },
                            { key: "SHIFT", action: "Sprint" },
                            { key: "SPACE", action: "Jump" },
                        ].map((s) => (
                            <div key={s.key} style={{
                                display: "flex", flexDirection: "column", alignItems: "center",
                                gap: "6px", padding: "10px 8px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.04)"
                            }}>
                                <span style={{
                                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08rem",
                                    color: "rgba(79,172,254,0.8)", fontFamily: "monospace"
                                }}>{s.key}</span>
                                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>{s.action}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions section */}
                <h3 style={{
                    fontSize: "0.6rem", margin: "0 0 14px 0", fontWeight: 600,
                    letterSpacing: "0.15rem",
                    color: isAnimal ? "rgba(255,152,0,0.6)" : "rgba(76,175,80,0.6)",
                    textTransform: "uppercase"
                }}>
                    {isAnimal ? "Animal Actions" : "Combat Actions"}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {shortcuts.map((s) => (
                        <div key={s.key} style={{
                            display: "flex", gap: "10px", alignItems: "center",
                            padding: "7px 10px", borderRadius: "6px",
                            background: "rgba(255,255,255,0.015)",
                            transition: "background 0.15s ease"
                        }}>
                            <span style={{
                                background: "rgba(255,255,255,0.06)",
                                padding: "2px 7px", borderRadius: "4px",
                                fontSize: "0.65rem", fontWeight: 700,
                                color: "rgba(255,255,255,0.5)",
                                fontFamily: "monospace",
                                border: "1px solid rgba(255,255,255,0.08)",
                                minWidth: "18px", textAlign: "center",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                            }}>
                                {s.key}
                            </span>
                            <span style={{
                                fontSize: "0.7rem", color: "rgba(255,255,255,0.45)",
                                fontWeight: 400
                            }}>{s.action}</span>
                        </div>
                    ))}
                </div>

                {/* Weapon hint */}
                <div style={{
                    marginTop: "18px", paddingTop: "14px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", justifyContent: "center", gap: "16px"
                }}>
                    {[
                        { key: "M", action: "Cycle Weapon" },
                        { key: "?", action: "Toggle Help" },
                    ].map((s) => (
                        <div key={s.key} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{
                                background: "rgba(255,255,255,0.06)", padding: "1px 6px",
                                borderRadius: "3px", fontSize: "0.55rem", fontWeight: 700,
                                color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
                                border: "1px solid rgba(255,255,255,0.08)"
                            }}>{s.key}</span>
                            <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.25)" }}>{s.action}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes helpFadeIn {
                    from { opacity: 0; transform: translate(-50%, -48%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </>
    );
};
