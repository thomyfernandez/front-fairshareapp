import { configureStore } from '@reduxjs/toolkit'
import favoritesReducer from './slices/favoritesSlice'

export const store = configureStore({
  reducer: {
    favorites: favoritesReducer,
  },
})
