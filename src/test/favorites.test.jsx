import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import favoritesReducer, {
  toggleFavoriteSpace,
  clearFavorites,
  selectFavoriteSpaceIds,
  selectIsSpaceFavorite,
} from '../store/slices/favoritesSlice'
import { FavoriteButton } from '../features/espacios/FavoriteButton'

function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      favorites: favoritesReducer,
    },
    preloadedState,
  })
}

describe('favoritesSlice', () => {
  it('agrega un espacio a favoritos con toggleFavoriteSpace', () => {
    const store = createTestStore()
    store.dispatch(toggleFavoriteSpace('espacio-1'))
    expect(selectFavoriteSpaceIds(store.getState())).toEqual(['espacio-1'])
    expect(selectIsSpaceFavorite('espacio-1')(store.getState())).toBe(true)
  })

  it('quita un espacio de favoritos si ya estaba', () => {
    const store = createTestStore({
      favorites: { favoriteSpaceIds: ['espacio-1', 'espacio-2'] },
    })
    store.dispatch(toggleFavoriteSpace('espacio-1'))
    expect(selectFavoriteSpaceIds(store.getState())).toEqual(['espacio-2'])
    expect(selectIsSpaceFavorite('espacio-1')(store.getState())).toBe(false)
  })

  it('limpia todos los favoritos con clearFavorites', () => {
    const store = createTestStore({
      favorites: { favoriteSpaceIds: ['espacio-1', 'espacio-2'] },
    })
    store.dispatch(clearFavorites())
    expect(selectFavoriteSpaceIds(store.getState())).toEqual([])
  })
})

describe('FavoriteButton component', () => {
  it('renderiza botón inactivo y despacha toggle al hacer click', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createTestStore()

    render(
      <Provider store={store}>
        <FavoriteButton spaceId="space-123" spaceName="Vacaciones" />
      </Provider>
    )

    const button = screen.getByRole('button', { name: /marcar vacaciones como favorito/i })
    expect(button).toBeInTheDocument()

    await user.click(button)

    expect(selectFavoriteSpaceIds(store.getState())).toContain('space-123')
    expect(screen.getByRole('button', { name: /quitar vacaciones de favoritos/i })).toBeInTheDocument()
  })
})
