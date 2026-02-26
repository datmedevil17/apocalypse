import { create } from 'zustand'
import { CharacterConfig, type CharacterType } from './config/GameConfig'

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
    timeOfDay: number // 0 to 24
    timeSpeed: number // How fast time passes
    playerAnimation: string
    localPlayerPos: [number, number, number]
    localPetPos: [number, number, number]
    localPetRot: [number, number, number, number]
    localPetAnimation: string
    remotePlayers: Record<string, PlayerState>
    myId: string
    gamePhase: 'intro' | 'lobby' | 'playing' | 'over' | 'won'
    setGamePhase: (phase: 'intro' | 'lobby' | 'playing' | 'over' | 'won') => void
    setSelectedCharacter: (character: string) => void
    setSelectedVariant: (variant: 'Unarmed' | 'SingleWeapon' | 'Standard') => void
    setSelectedPet: (pet: string) => void
    setTimeOfDay: (time: number | ((prev: number) => number)) => void
    setTimeSpeed: (speed: number) => void
    setPlayerAnimation: (animation: string) => void
    setLocalPlayerPos: (pos: [number, number, number]) => void
    setLocalPetState: (pos: [number, number, number], rot: [number, number, number, number], animation: string) => void
    setRemotePlayer: (id: string, state: PlayerState | null) => void
    hitReactTrigger: number
    triggerHitReact: () => void
    playerHealth: number
    damagePlayer: (amount: number) => void
    onZombieKilled: ((reward: number) => void) | null
    setOnZombieKilled: (fn: (reward: number) => void) => void
    gaslessNotifications: { id: string, message: string }[]
    addGaslessNotification: (message: string) => void
    removeGaslessNotification: (id: string) => void
    overrideZombieAnimation: string | null
    setOverrideZombieAnimation: (anim: string | null) => void
    overridePlayerAnimation: string | null
    setOverridePlayerAnimation: (anim: string | null) => void
    survivalTimeRemaining: number
    decrementSurvivalTime: () => void
    isHost: boolean
    setIsHost: (isHost: boolean) => void
    battleRoomId: number | null
    setBattleRoomId: (id: number | null) => void
    maxPlayers: number
    setMaxPlayers: (max: number) => void

    zombies: Record<string, { pos: [number, number, number], state: string }>
    syncZombies: (zombies: Record<string, { pos: [number, number, number], state: string }>) => void
    updateZombies: (updates: { id: string, pos: [number, number, number], state?: string }[]) => void
    updateZombieStatus: (id: string, status: string) => void
}

export const useStore = create<GameState>((set) => ({
    selectedCharacter: baseCharacters[0],
    selectedVariant: 'Unarmed',
    selectedPet: petCharacters[0],
    timeOfDay: 7, // Start exactly at Sunrise (reddish morning)
    timeSpeed: 0.5, // Reasonably fast cycle for testing
    playerAnimation: 'Idle',
    localPlayerPos: [0, 0, 0],
    localPetPos: [0, 0, 0],
    localPetRot: [0, 0, 0, 1],
    localPetAnimation: 'Idle',
    remotePlayers: {},
    myId: Math.random().toString(36).substr(2, 9),
    gamePhase: 'intro',
    setGamePhase: (phase) => set({ gamePhase: phase }),
    setSelectedCharacter: (character) => set({
        selectedCharacter: character,
        playerHealth: CharacterConfig[character as CharacterType]?.maxHealth || 100
    }),
    setSelectedVariant: (variant) => set({ selectedVariant: variant }),
    setSelectedPet: (pet) => set({ selectedPet: pet }),
    setTimeOfDay: (time) => set((state) => ({ timeOfDay: typeof time === 'function' ? time(state.timeOfDay) : time })),
    setTimeSpeed: (speed) => set({ timeSpeed: speed }),
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
    hitReactTrigger: 0,
    triggerHitReact: () => set((state) => ({ hitReactTrigger: state.hitReactTrigger + 1 })),
    playerHealth: CharacterConfig[baseCharacters[0] as CharacterType]?.maxHealth || 100,
    damagePlayer: (amount) => set((state) => ({ playerHealth: Math.max(0, state.playerHealth - amount) })),
    onZombieKilled: null,
    setOnZombieKilled: (fn) => set({ onZombieKilled: fn }),
    gaslessNotifications: [],
    addGaslessNotification: (message) => set((state) => ({
        gaslessNotifications: [...state.gaslessNotifications, { id: Math.random().toString(36).substr(2, 9), message }]
    })),
    removeGaslessNotification: (id) => set((state) => ({
        gaslessNotifications: state.gaslessNotifications.filter(n => n.id !== id)
    })),
    overrideZombieAnimation: null,
    setOverrideZombieAnimation: (anim) => set({ overrideZombieAnimation: anim }),
    overridePlayerAnimation: null,
    setOverridePlayerAnimation: (anim) => set({ overridePlayerAnimation: anim }),
    survivalTimeRemaining: 60, // 60 seconds to survive
    decrementSurvivalTime: () => set((state) => ({ survivalTimeRemaining: Math.max(0, state.survivalTimeRemaining - 1) })),
    isHost: false,
    setIsHost: (isHost) => set({ isHost }),
    battleRoomId: null,
    setBattleRoomId: (id) => set({ battleRoomId: id }),
    maxPlayers: 4,
    setMaxPlayers: (max) => set({ maxPlayers: max }),

    zombies: {},
    syncZombies: (zombies) => set({ zombies }),
    updateZombies: (updates) => set((s) => {
        const newZombies = { ...s.zombies }
        updates.forEach(u => {
            if (newZombies[u.id]) {
                newZombies[u.id].pos = u.pos
                if (u.state) newZombies[u.id].state = u.state
            } else {
                newZombies[u.id] = { pos: u.pos, state: u.state || 'Idle' } // Or default state
            }
        })
        return { zombies: newZombies }
    }),
    updateZombieStatus: (id, status) => set((s) => {
        const newZombies = { ...s.zombies }
        if (newZombies[id]) {
            newZombies[id].state = status
        }
        return { zombies: newZombies }
    }),
}))
