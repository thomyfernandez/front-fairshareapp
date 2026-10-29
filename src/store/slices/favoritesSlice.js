import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  favoriteSpaceIds: [],
}

export const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavoriteSpace: (state, action) => {
      const spaceId = action.payload
      const index = state.favoriteSpaceIds.indexOf(spaceId)
      if (index >= 0) {
        state.favoriteSpaceIds.splice(index, 1)
      } else {
        state.favoriteSpaceIds.push(spaceId)
      }
    },
    clearFavorites: (state) => {
      state.favoriteSpaceIds = []
    },
  },
})

export const { toggleFavoriteSpace, clearFavorites } = favoritesSlice.actions

export const selectFavoriteSpaceIds = (state) => state.favorites.favoriteSpaceIds
export const selectIsSpaceFavorite = (spaceId) => (state) =>
  state.favorites.favoriteSpaceIds.includes(spaceId)

export default favoritesSlice.reducer
