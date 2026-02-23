import { useStore } from '../store'

const MAP_SIZE = 100 // Half-size (e.g., -50 to 50)

export function Minimap() {
    const remotePlayers = useStore((state) => state.remotePlayers)
    const localPlayerPos = useStore((state) => state.localPlayerPos)

    const normalize = (val: number) => ((val + MAP_SIZE / 2) / MAP_SIZE) * 100

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            overflow: 'hidden',
            padding: '10px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Grid Pattern */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: 0.5
            }} />

            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Remote Players */}
                {Object.values(remotePlayers).map((player) => {
                    if (!player || !player.position) return null
                    return (
                        <div
                            key={player.id}
                            style={{
                                position: 'absolute',
                                width: '8px',
                                height: '8px',
                                background: '#4ade80', // Green
                                borderRadius: '50%',
                                left: `${normalize(player.position[0])}%`,
                                top: `${normalize(player.position[2])}%`,
                                transform: 'translate(-50%, -50%)',
                                boxShadow: '0 0 8px #4ade80',
                                transition: 'all 0.1s linear'
                            }}
                        />
                    )
                })}

                {/* Local Player */}
                {localPlayerPos && (
                    <div style={{
                        position: 'absolute',
                        width: '10px',
                        height: '10px',
                        background: '#3b82f6', // Bright Blue
                        borderRadius: '50%',
                        left: `${normalize(localPlayerPos[0])}%`,
                        top: `${normalize(localPlayerPos[2])}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 12px #3b82f6',
                        zIndex: 10,
                        border: '2px solid white'
                    }} />
                )}
            </div>

            {/* Label */}
            <div style={{
                position: 'absolute',
                top: '8px',
                left: '12px',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: 0.8,
                pointerEvents: 'none'
            }}>
                Minimap
            </div>
        </div>
    )
}
