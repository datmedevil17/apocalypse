import { useStore } from '../store'
import { RemotePlayer } from './RemotePlayer'

export function Multiplayer() {
    const remotePlayers = useStore((state) => state.remotePlayers)

    return (
        <>
            {Object.values(remotePlayers).map((player) => (
                <RemotePlayer key={player.id} state={player} />
            ))}
        </>
    )
}
