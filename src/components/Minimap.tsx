import { useStore } from '../store'

const MAP_SIZE = 200

export function Minimap() {
    const remotePlayers = useStore((state) => state.remotePlayers)
    const localPlayerPos = useStore((state) => state.localPlayerPos)

    const normalize = (val: number) => ((val + MAP_SIZE / 2) / MAP_SIZE) * 100

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px',
            width: '140px', height: '140px',
            background: 'linear-gradient(145deg, rgba(10,10,22,0.85) 0%, rgba(6,6,16,0.9) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
            overflow: 'hidden', padding: '8px',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {/* Subtle grid */}
            <div style={{
                position: 'absolute', width: '100%', height: '100%',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }} />

            {/* Soft scanline overlay */}
            <div style={{
                position: 'absolute', width: '100%', height: '100%',
                background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(79,172,254,0.01) 2px, rgba(79,172,254,0.01) 3px)',
                pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Remote Players */}
                {Object.values(remotePlayers).map((player, idx) => {
                    if (!player || !player.position) return null
                    return (
                        <div key={player.id || idx} style={{
                            position: 'absolute',
                            width: '5px', height: '5px',
                            background: '#4ade80', borderRadius: '50%',
                            left: `${normalize(player.position[0])}%`,
                            top: `${normalize(player.position[2])}%`,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                            transition: 'all 0.1s linear'
                        }} />
                    )
                })}

                {/* Local Player */}
                {localPlayerPos && (
                    <div style={{
                        position: 'absolute',
                        width: '6px', height: '6px',
                        background: '#4facfe', borderRadius: '50%',
                        left: `${normalize(localPlayerPos[0])}%`,
                        top: `${normalize(localPlayerPos[2])}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 8px rgba(79,172,254,0.7), 0 0 16px rgba(79,172,254,0.3)',
                        zIndex: 10,
                        border: '1px solid rgba(255,255,255,0.5)'
                    }} />
                )}
            </div>

            {/* Label */}
            <div style={{
                position: 'absolute', top: '6px', left: '9px',
                color: 'rgba(255,255,255,0.2)', fontSize: '0.45rem',
                fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1rem', pointerEvents: 'none',
                fontFamily: "'Inter', monospace"
            }}>
                MAP
            </div>

            {/* Corner accents */}
            <div style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '8px', height: '8px',
                borderTop: '1px solid rgba(79,172,254,0.2)',
                borderRight: '1px solid rgba(79,172,254,0.2)',
                borderRadius: '0 4px 0 0', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '4px', left: '4px',
                width: '8px', height: '8px',
                borderBottom: '1px solid rgba(79,172,254,0.2)',
                borderLeft: '1px solid rgba(79,172,254,0.2)',
                borderRadius: '0 0 0 4px', pointerEvents: 'none'
            }} />
        </div>
    )
}
