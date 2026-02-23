import { useEffect, useRef } from 'react'
import { useStore } from '../store'

const WS_URL = 'ws://localhost:8080/ws'

export function useSocket() {
    const socket = useRef<WebSocket | null>(null)
    const myId = useStore.getState().myId
    const setRemotePlayer = useStore((state) => state.setRemotePlayer)

    // Use refs to avoid stale closures in broadcast
    const stateRef = useRef({
        selectedCharacter: useStore.getState().selectedCharacter,
        selectedPet: useStore.getState().selectedPet,
        playerAnimation: useStore.getState().playerAnimation,
        localPetPos: useStore.getState().localPetPos,
        localPetRot: useStore.getState().localPetRot,
        localPetAnimation: useStore.getState().localPetAnimation,
    })

    useEffect(() => {
        // Keep refs updated
        const unsub = useStore.subscribe((state) => {
            stateRef.current = {
                selectedCharacter: state.selectedCharacter,
                selectedPet: state.selectedPet,
                playerAnimation: state.playerAnimation,
                localPetPos: state.localPetPos,
                localPetRot: state.localPetRot,
                localPetAnimation: state.localPetAnimation,
            }
        })

        socket.current = new WebSocket(WS_URL)

        socket.current.onmessage = (event) => {
            const messages = event.data.split('\n')
            messages.forEach((msg: string) => {
                if (!msg.trim()) return
                try {
                    const data = JSON.parse(msg)
                    if (data.type === 'update' && data.id !== myId) {
                        setRemotePlayer(data.id, {
                            id: data.id,
                            ...data.payload,
                        })
                    }
                } catch (e) {
                    console.error('Failed to parse socket message:', e, msg)
                }
            })
        }

        socket.current.onclose = () => {
            console.log('Socket disconnected')
        }

        return () => {
            unsub()
            socket.current?.close()
        }
    }, [])

    // Function to broadcast local state
    const broadcast = (position: [number, number, number], rotation: [number, number, number, number]) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(
                JSON.stringify({
                    type: 'update',
                    id: myId,
                    payload: {
                        position,
                        rotation,
                        animation: stateRef.current.playerAnimation,
                        selectedCharacter: stateRef.current.selectedCharacter,
                        selectedPet: stateRef.current.selectedPet,
                        petPosition: stateRef.current.localPetPos,
                        petRotation: stateRef.current.localPetRot,
                        petAnimation: stateRef.current.localPetAnimation,
                    },
                })
            )
        }
    }

    return { broadcast }
}
