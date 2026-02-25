import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

export const LoadingScreen = () => {
    const { progress, active } = useProgress();
    const [shown, setShown] = useState(true);

    useEffect(() => {
        if (!active && progress === 100) {
            const timeout = setTimeout(() => setShown(false), 800);
            return () => clearTimeout(timeout);
        }
    }, [progress, active]);

    if (!shown) return null;

    const isDone = progress === 100 && !active;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "radial-gradient(ellipse at 50% 40%, rgba(10,10,24,1) 0%, rgba(4,4,12,1) 100%)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 2000, transition: "opacity 1s ease-in-out",
            opacity: isDone ? 0 : 1, pointerEvents: "none", overflow: "hidden"
        }}>
            {/* Ambient glow */}
            <div style={{
                position: "absolute", top: "35%", left: "50%", width: "500px", height: "500px",
                transform: "translate(-50%, -50%)",
                background: "radial-gradient(circle, rgba(79,172,254,0.06) 0%, transparent 70%)",
                borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none"
            }} />

            {/* Scanning line */}
            <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                background: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)",
                pointerEvents: "none"
            }} />

            {/* Animated sweep */}
            <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                background: "linear-gradient(180deg, transparent 0%, rgba(79,172,254,0.03) 50%, transparent 100%)",
                animation: "loadingSweep 3s ease-in-out infinite",
                pointerEvents: "none"
            }} />

            <div style={{ marginBottom: "40px", textAlign: "center", position: "relative", zIndex: 1 }}>
                <h1 style={{
                    color: "white", fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                    fontFamily: "'Inter', sans-serif", fontWeight: 800,
                    letterSpacing: "0.35rem", margin: 0, textTransform: "uppercase",
                    background: "linear-gradient(135deg, #ffffff 0%, #a0c4ff 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                    Apocalypse
                </h1>
                <p style={{
                    color: "rgba(255,255,255,0.25)", marginTop: "12px",
                    fontSize: "0.65rem", letterSpacing: "0.25rem", fontFamily: "monospace"
                }}>
                    INITIALIZING SYSTEMS
                </p>
            </div>

            {/* Progress bar */}
            <div style={{ position: "relative", width: "280px", zIndex: 1 }}>
                <div style={{
                    width: "100%", height: "2px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "2px", overflow: "hidden",
                    boxShadow: "0 0 20px rgba(0,0,0,0.5)"
                }}>
                    <div style={{
                        height: "100%", width: `${progress}%`,
                        background: "linear-gradient(90deg, #4facfe, #00f2fe)",
                        transition: "width 0.4s ease-out",
                        boxShadow: "0 0 12px rgba(79,172,254,0.6), 0 0 30px rgba(79,172,254,0.2)",
                        borderRadius: "2px"
                    }} />
                </div>

                {/* Progress text */}
                <div style={{
                    display: "flex", justifyContent: "space-between", marginTop: "12px",
                    fontFamily: "monospace", fontSize: "0.6rem",
                    color: "rgba(255,255,255,0.3)", letterSpacing: "0.05rem"
                }}>
                    <span>LOADING</span>
                    <span style={{ color: "rgba(79,172,254,0.7)", fontWeight: 600 }}>
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>

            {/* Bottom status */}
            <div style={{
                position: "absolute", bottom: "36px",
                fontSize: "0.55rem", color: "rgba(255,255,255,0.15)",
                letterSpacing: "0.12rem", fontFamily: "monospace", textTransform: "uppercase"
            }}>
                Assets &middot; Shaders &middot; Models
            </div>

            <style>{`
                @keyframes loadingSweep {
                    0%, 100% { transform: translateY(-100%); }
                    50% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
};
