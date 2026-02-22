import { baseCharacters, useStore } from "../store";
import { useUIStore } from "../uiStore";
import { HelpMenu } from "./HelpMenu";

export const UI = () => {
    const { selectedCharacter, setSelectedCharacter, selectedVariant, setSelectedVariant } = useStore();
    const toggleHelp = useUIStore((state) => state.toggleHelp);

    const isAnimal = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd';

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

            <div style={{
                position: "absolute", top: "20px", left: "20px", display: "flex", flexDirection: "column",
                gap: "10px", zIndex: 100, background: "rgba(255, 255, 255, 0.1)", padding: "15px",
                borderRadius: "12px", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)", maxHeight: "80vh", overflowY: "auto", scrollbarWidth: "none",
            }}>
                <h2 style={{ color: "white", margin: "0 0 10px 0", fontSize: "1.2rem", fontFamily: "sans-serif" }}>Character</h2>
                {baseCharacters.map((char: string) => (
                    <button key={char} onClick={() => setSelectedCharacter(char)} style={{
                        padding: "10px 20px", borderRadius: "8px", border: "none",
                        background: selectedCharacter === char ? "#4caf50" : "rgba(255, 255, 255, 0.2)",
                        color: "white", cursor: "pointer", fontSize: "1rem", transition: "all 0.2s ease",
                        fontFamily: "sans-serif", fontWeight: selectedCharacter === char ? "bold" : "normal", textAlign: "left"
                    }} onMouseEnter={(e) => selectedCharacter !== char && (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                        onMouseLeave={(e) => selectedCharacter !== char && (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}>
                        {char}
                    </button>
                ))}

                {!isAnimal && (
                    <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                        <p style={{ color: "white", fontSize: "0.8rem", margin: "0 0 8px 0", opacity: 0.7 }}>WEAPONS</p>
                        <div style={{ display: "flex", gap: "5px" }}>
                            <button onClick={() => setSelectedVariant('Standard')} style={{
                                flex: 1, padding: "5px", fontSize: "0.7rem", borderRadius: "4px", border: "none",
                                background: selectedVariant === 'Standard' ? "#2196f3" : "rgba(255,255,255,0.1)",
                                color: "white", cursor: "pointer"
                            }}>
                                Dual
                            </button>
                            <button onClick={() => setSelectedVariant('SingleWeapon')} style={{
                                flex: 1, padding: "5px", fontSize: "0.7rem", borderRadius: "4px", border: "none",
                                background: selectedVariant === 'SingleWeapon' ? "#2196f3" : "rgba(255,255,255,0.1)",
                                color: "white", cursor: "pointer"
                            }}>
                                Single
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
