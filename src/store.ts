import { create } from 'zustand'

export const baseCharacters = ["Lis", "Matt", "Sam", "Shaun", "Pug", "GermanShepherd"]

interface GameState {
    selectedCharacter: string
    selectedVariant: 'Standard' | 'SingleWeapon'
    setSelectedCharacter: (character: string) => void
    setSelectedVariant: (variant: 'Standard' | 'SingleWeapon') => void
}

export const useStore = create<GameState>((set) => ({
    selectedCharacter: baseCharacters[0],
    selectedVariant: 'Standard',
    setSelectedCharacter: (character) => set({ selectedCharacter: character }),
    setSelectedVariant: (variant) => set({ selectedVariant: variant }),
}))
