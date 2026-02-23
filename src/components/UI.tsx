import { baseCharacters, useStore } from "../store";
import { useUIStore } from "../uiStore";
import { HelpMenu } from "./HelpMenu";

export const UI = () => {
    const {
        selectedCharacter, setSelectedCharacter,
        selectedVariant, setSelectedVariant,
        selectedPet, setSelectedPet,
        gamePhase, setGamePhase
    } = useStore();
    const toggleHelp = useUIStore((state) => state.toggleHelp);

    if (gamePhase === 'intro') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)",
                zIndex: 1000, color: "white", textAlign: "center", pointerEvents: "all"
            }}>
                <h1 style={{
                    fontSize: "6rem",
                    margin: 0,
                    fontFamily: "'Creepster', cursive, serif",
                    color: "#ff3d00",
                    textShadow: "0 0 20px rgba(255, 61, 0, 0.5), 5px 5px 0px #000",
                    letterSpacing: "0.5rem",
                    transform: "rotate(-2deg) scale(1.1)",
                    animation: "pulse 2s infinite ease-in-out"
                }}>
                    APOCALYPSE
                </h1>
                <p style={{
                    fontSize: "1.2rem",
                    marginTop: "20px",
                    opacity: 0.8,
                    letterSpacing: "0.2rem",
                    fontFamily: "monospace"
                }}>
                    THE DEAD WALK AMONG US
                </p>
                <button
                    onClick={() => setGamePhase('selection')}
                    style={{
                        marginTop: "60px",
                        padding: "20px 60px",
                        fontSize: "2rem",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: "900",
                        background: "transparent",
                        border: "2px solid #ff3d00",
                        color: "#ff3d00",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 0 15px rgba(255, 61, 0, 0.3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.2rem"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ff3d00";
                        e.currentTarget.style.color = "black";
                        e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 61, 0, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#ff3d00";
                        e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 61, 0, 0.3)";
                    }}
                >
                    ENTER ARENA
                </button>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
                    @keyframes pulse {
                        0% { transform: rotate(-2deg) scale(1.1); }
                        50% { transform: rotate(-2deg) scale(1.15); }
                        100% { transform: rotate(-2deg) scale(1.1); }
                    }
                `}</style>
            </div>
        );
    }

    if (gamePhase === 'selection') {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
                zIndex: 1000, color: "white", pointerEvents: "all"
            }}>
                <h2 style={{ fontSize: "3rem", marginBottom: "40px", fontFamily: "'Inter', sans-serif", fontWeight: 900, color: "#4facfe" }}>EQUIP YOURSELF</h2>

                <div style={{ display: "flex", gap: "40px", alignItems: "stretch" }}>
                    {/* Character Column */}
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", width: "300px" }}>
                        <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", opacity: 0.6 }}>CHOOSE SURVIVOR</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {baseCharacters.map((char) => (
                                <button key={char} onClick={() => setSelectedCharacter(char)} style={{
                                    padding: "15px", borderRadius: "10px", border: "none",
                                    background: selectedCharacter === char ? "#4caf50" : "rgba(255, 255, 255, 0.05)",
                                    color: "white", cursor: "pointer", fontSize: "1.1rem", transition: "all 0.2s ease",
                                    textAlign: "left", fontWeight: selectedCharacter === char ? "bold" : "normal"
                                }}>
                                    {char}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Weapon Column */}
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", width: "300px" }}>
                        <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", opacity: 0.6 }}>SELECT LOADOUT</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <button onClick={() => setSelectedVariant('Standard')} style={{
                                padding: "20px", borderRadius: "10px", border: "none",
                                background: selectedVariant === 'Standard' ? "#2196f3" : "rgba(255, 255, 255, 0.05)",
                                color: "white", cursor: "pointer", fontSize: "1.1rem", transition: "all 0.2s ease"
                            }}>
                                <div style={{ fontWeight: "bold" }}>DUAL WIELD</div>
                                <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "5px" }}>Maximum firepower</div>
                            </button>
                            <button onClick={() => setSelectedVariant('SingleWeapon')} style={{
                                padding: "20px", borderRadius: "10px", border: "none",
                                background: selectedVariant === 'SingleWeapon' ? "#2196f3" : "rgba(255, 255, 255, 0.05)",
                                color: "white", cursor: "pointer", fontSize: "1.1rem", transition: "all 0.2s ease"
                            }}>
                                <div style={{ fontWeight: "bold" }}>SINGLE WEAPON</div>
                                <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "5px" }}>Balanced control</div>
                            </button>
                        </div>

                        <h3 style={{ margin: "30px 0 20px 0", fontSize: "1.2rem", opacity: 0.6 }}>COMPANION</h3>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {['Pug', 'GermanShepherd'].map((pet) => (
                                <button key={pet} onClick={() => setSelectedPet(pet)} style={{
                                    flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                                    background: selectedPet === pet ? "#ff9800" : "rgba(255, 255, 255, 0.05)",
                                    color: "white", cursor: "pointer", fontSize: "0.9rem"
                                }}>
                                    {pet}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setGamePhase('playing')}
                    style={{
                        marginTop: "50px",
                        padding: "20px 80px",
                        fontSize: "1.5rem",
                        borderRadius: "50px",
                        background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
                        border: "none",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 10px 20px rgba(79, 172, 254, 0.4)",
                        transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = "0 15px 30px rgba(79, 172, 254, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 10px 20px rgba(79, 172, 254, 0.4)";
                    }}
                >
                    READY TO SURVIVE
                </button>
            </div>
        );
    }

    return (
        <>
            <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 100 }}>
                <button onClick={toggleHelp} style={{
                    width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.1)",
                    color: "white", cursor: "pointer", fontSize: "1.2rem", backdropFilter: "blur(10px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(255, 255, 255, 0.2)", transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}>
                    ?
                </button>
            </div>

            <HelpMenu />
        </>
    );
};
