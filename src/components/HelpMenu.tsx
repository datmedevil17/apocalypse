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
        <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "30px",
            borderRadius: "20px",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "white",
            zIndex: 1000,
            minWidth: "300px",
            fontFamily: "sans-serif",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0 }}>Shortcuts</h2>
                <button
                    onClick={toggleHelp}
                    style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        padding: "5px"
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Movement: WASD / Arrows</p>
                <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Sprint: Shift (Hold)</p>
                <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Jump: Space</p>
            </div>

            <h3 style={{ fontSize: "1rem", marginBottom: "15px", color: "#4caf50" }}>
                {isAnimal ? "Animal Actions" : "Human Actions"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {shortcuts.map((s) => (
                    <div key={s.key} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{
                            background: "rgba(255,255,255,0.1)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            border: "1px solid rgba(255,255,255,0.2)"
                        }}>
                            {s.key}
                        </span>
                        <span style={{ fontSize: "0.9rem" }}>{s.action}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
