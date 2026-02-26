import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export function useSocket() {
    const socket = useRef<WebSocket | null>(null)
    const myId = useStore.getState().myId

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

        // Mock out the websocket to prevent hang when server is down
        console.log('Mock WebSocket initialized');

        return () => {
            unsub()
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
