import { create } from 'zustand'

interface UIState {
    helpOpen: boolean
    setHelpOpen: (open: boolean) => void
    toggleHelp: () => void
}

export const useUIStore = create<UIState>((set) => ({
    helpOpen: false,
    setHelpOpen: (open) => set({ helpOpen: open }),
    toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen })),
}))
