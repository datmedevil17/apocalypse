import { useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useStore } from '../store';

function useSocketProvider() {
    const socket = useRef<WebSocket | null>(null);
    const myId = useStore.getState().myId;

    // Use refs to avoid stale closures in broadcast
    const stateRef = useRef({
        selectedCharacter: useStore.getState().selectedCharacter,
        selectedVariant: useStore.getState().selectedVariant,
        selectedPet: useStore.getState().selectedPet,
        playerAnimation: useStore.getState().playerAnimation,
        localPetPos: useStore.getState().localPetPos,
        localPetRot: useStore.getState().localPetRot,
        localPetAnimation: useStore.getState().localPetAnimation,
    });

    useEffect(() => {
        // Keep refs updated
        const unsub = useStore.subscribe((state) => {
            stateRef.current = {
                selectedCharacter: state.selectedCharacter,
                selectedVariant: state.selectedVariant,
                selectedPet: state.selectedPet,
                playerAnimation: state.playerAnimation,
                localPetPos: state.localPetPos,
                localPetRot: state.localPetRot,
                localPetAnimation: state.localPetAnimation,
            }
        });

        // Initialize WebSocket connection
        socket.current = new WebSocket('ws://localhost:8080/ws');

        socket.current.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        socket.current.onmessage = (event) => {
            try {
                // VERY VERBOSE LOGGING FOR DEBUGGING
                console.log(`[SOCKET RAW MESSAGE]`, event.data);

                const data = JSON.parse(event.data);

                // Only process messages for the room we are currently in
                const currentRoomId = useStore.getState().battleRoomId;
                if (data.roomId !== undefined && currentRoomId !== null && data.roomId !== currentRoomId) {
                    console.log(`[SOCKET IGNORED] Msg for Room ${data.roomId}, I am in ${currentRoomId}`);
                    return; // Ignore messages from other rooms
                }

                if (data.type === 'update') {
                    // Update remote players state
                    useStore.getState().setRemotePlayer(data.id, data.payload);
                } else if (data.type === 'disconnect') {
                    // Remove remote player
                    useStore.getState().setRemotePlayer(data.id, null);
                } else if (data.type === 'zombie_sync') {
                    console.log(`[SOCKET RECEIVED] zombie_sync`);
                    // Received full zombie state
                    useStore.getState().syncZombies(data.payload.zombies);
                } else if (data.type === 'zombie_update') {
                    // Received partial zombie update (positions/targets)
                    useStore.getState().updateZombies(data.payload.updates);
                } else if (data.type === 'zombie_status') {
                    // Received single zombie status update (e.g. death)
                    useStore.getState().updateZombieStatus(data.payload.id, data.payload.status);
                } else if (data.type === 'start_game') {
                    console.log("Received start_game from host!");
                    useStore.getState().setGamePhase('playing');
                }
            } catch (e) {
                console.error("Error parsing socket message", e);
            }
        };

        socket.current.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        return () => {
            unsub();
            if (socket.current) {
                socket.current.close();
            }
        };
    }, []);

    // Function to join a specific battle room
    const joinRoom = useCallback((roomId: string, playerId: string, payload?: { maxPlayers: number }) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            console.log(`[SOCKET JOIN_ROOM] Sending join for Room: ${roomId}`);
            socket.current.send(JSON.stringify({
                type: 'join_room',
                roomId,
                playerId,
                payload
            }));
        } else {
            console.warn(`[SOCKET JOIN_ROOM] Failed to join Room ${roomId}, socket not open`);
        }
    }, []);

    // Function to broadcast local player state
    const broadcast = useCallback((position: [number, number, number], rotation: [number, number, number, number]) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            const currentRoomId = useStore.getState().battleRoomId;
            socket.current.send(
                JSON.stringify({
                    type: 'update',
                    id: myId,
                    roomId: currentRoomId,
                    payload: {
                        position,
                        rotation,
                        animation: stateRef.current.playerAnimation,
                        selectedCharacter: stateRef.current.selectedCharacter,
                        selectedVariant: stateRef.current.selectedVariant,
                        selectedPet: stateRef.current.selectedPet,
                        petPosition: stateRef.current.localPetPos,
                        petRotation: stateRef.current.localPetRot,
                        petAnimation: stateRef.current.localPetAnimation,
                    },
                })
            )
        }
    }, [myId]);

    // Function to broadcast zombie state (Host only)
    const broadcastZombies = useCallback((syncType: 'zombie_sync' | 'zombie_update' | 'zombie_status', payload: any) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            const currentRoomId = useStore.getState().battleRoomId;
            socket.current.send(JSON.stringify({
                type: syncType,
                roomId: currentRoomId,
                payload
            }));
        }
    }, []);

    // Function to broadcast game start
    const broadcastGameStart = useCallback((roomId: string) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify({
                type: 'start_game',
                roomId
            }));
        }
    }, []);

    return { joinRoom, broadcast, broadcastZombies, broadcastGameStart };
}

import React from 'react';

const SocketContext = createContext<ReturnType<typeof useSocketProvider> | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketData = useSocketProvider();
    return React.createElement(SocketContext.Provider, { value: socketData }, children);
}

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error("useSocket must be used within SocketProvider");
    return ctx;
};
