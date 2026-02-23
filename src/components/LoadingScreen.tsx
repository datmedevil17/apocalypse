import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

export const LoadingScreen = () => {
    const { progress, active } = useProgress();
    const [shown, setShown] = useState(true);

    useEffect(() => {
        if (!active && progress === 100) {
            const timeout = setTimeout(() => setShown(false), 500);
            return () => clearTimeout(timeout);
        }
    }, [progress, active]);

    if (!shown) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "radial-gradient(circle at center, #1a1a2e 0%, #16213e 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                transition: "opacity 0.8s ease-in-out",
                opacity: progress === 100 && !active ? 0 : 1,
                pointerEvents: "none",
            }}
        >
            <div style={{ marginBottom: "30px", textAlign: "center" }}>
                <h1
                    style={{
                        color: "white",
                        fontSize: "2.5rem",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 800,
                        letterSpacing: "0.2rem",
                        margin: 0,
                        textTransform: "uppercase",
                        textShadow: "0 0 20px rgba(74, 158, 255, 0.5)",
                    }}
                >
                    Apocalypse
                </h1>
                <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "10px", fontSize: "0.9rem", letterSpacing: "0.1rem" }}>
                    SURVIVE THE NIGHT
                </p>
            </div>

            <div
                style={{
                    width: "300px",
                    height: "4px",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
                        transition: "width 0.4s ease-out",
                        boxShadow: "0 0 15px rgba(79, 172, 254, 0.8)",
                    }}
                />
            </div>

            <div
                style={{
                    marginTop: "15px",
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "monospace",
                    fontSize: "1rem",
                    fontWeight: "bold",
                }}
            >
                {Math.round(progress)}%
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: "40px",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05rem",
                }}
            >
                Loading Assets and Shaders...
            </div>
        </div>
    );
};
