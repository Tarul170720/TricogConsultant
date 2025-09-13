import { create } from 'zustand'

const useShowChatWindowStore = create((set) => ({
  showChat: false,
  setShowChat: (value) => set({ showChat: value }),
  showAdminPanel: false,
  setShowAdminPanel: (value) => set({ showAdminPanel: value }),
}))

export default useShowChatWindowStore;