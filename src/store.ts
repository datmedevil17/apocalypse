import { create } from 'zustand'

export const baseCharacters = ["Lis", "Matt", "Sam", "Shaun"]
export const petCharacters = ["Pug", "GermanShepherd"]

export interface PlayerState {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number]
    animation: string
    selectedCharacter: string
    selectedPet: string
    petPosition: [number, number, number]
    petRotation: [number, number, number, number]
    petAnimation: string
}

interface GameState {
    selectedCharacter: string
    selectedVariant: 'Unarmed' | 'SingleWeapon' | 'Standard'
    selectedPet: string
    timeOfDay: number
    playerAnimation: string
    localPlayerPos: [number, number, number]
    localPetPos: [number, number, number]
    localPetRot: [number, number, number, number]
    localPetAnimation: string
    remotePlayers: Record<string, PlayerState>
    myId: string
    gamePhase: 'intro' | 'selection' | 'playing'
    setGamePhase: (phase: 'intro' | 'selection' | 'playing') => void
    setSelectedCharacter: (character: string) => void
    setSelectedVariant: (variant: 'Unarmed' | 'SingleWeapon' | 'Standard') => void
    setSelectedPet: (pet: string) => void
    setTimeOfDay: (time: number) => void
    setPlayerAnimation: (animation: string) => void
    setLocalPlayerPos: (pos: [number, number, number]) => void
    setLocalPetState: (pos: [number, number, number], rot: [number, number, number, number], animation: string) => void
    setRemotePlayer: (id: string, state: PlayerState | null) => void
}

export const useStore = create<GameState>((set) => ({
    selectedCharacter: baseCharacters[0],
    selectedVariant: 'Unarmed',
    selectedPet: petCharacters[0],
    timeOfDay: 0.5,
    playerAnimation: 'Idle',
    localPlayerPos: [0, 0, 0],
    localPetPos: [0, 0, 0],
    localPetRot: [0, 0, 0, 1],
    localPetAnimation: 'Idle',
    remotePlayers: {},
    myId: Math.random().toString(36).substr(2, 9),
    gamePhase: 'intro',
    setGamePhase: (phase) => set({ gamePhase: phase }),
    setSelectedCharacter: (character) => set({ selectedCharacter: character }),
    setSelectedVariant: (variant) => set({ selectedVariant: variant }),
    setSelectedPet: (pet) => set({ selectedPet: pet }),
    setTimeOfDay: (time) => set({ timeOfDay: time }),
    setPlayerAnimation: (animation) => set({ playerAnimation: animation }),
    setLocalPlayerPos: (pos) => set({ localPlayerPos: pos }),
    setLocalPetState: (pos, rot, animation) => set({
        localPetPos: pos,
        localPetRot: rot,
        localPetAnimation: animation
    }),
    setRemotePlayer: (id, state) => set((s) => {
        const newPlayers = { ...s.remotePlayers }
        if (state === null) {
            delete newPlayers[id]
        } else {
            newPlayers[id] = state
        }
        return { remotePlayers: newPlayers }
    }),
}))
