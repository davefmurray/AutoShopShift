import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShopState {
  activeShopId: string | null;
  setActiveShopId: (id: string | null) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      activeShopId: null,
      setActiveShopId: (id) => set({ activeShopId: id }),
    }),
    {
      name: "autoshopshift-shop",
    }
  )
);
