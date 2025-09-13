import { create } from 'zustand'

const useShowChatWindowStore = create((set) => ({
  showChat: false,
  setShowChat: (value) => set({ showChat: value }),
}))

export default useShowChatWindowStore;