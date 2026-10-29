import { useDispatch, useSelector } from 'react-redux'
import { Button, Icon } from '../../components/ui'
import { toggleFavoriteSpace, selectIsSpaceFavorite } from '../../store/slices/favoritesSlice'

export function FavoriteButton({ spaceId, spaceName = 'espacio' }) {
  const dispatch = useDispatch()
  const isFavorite = useSelector(selectIsSpaceFavorite(spaceId))

  const handleToggle = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dispatch(toggleFavoriteSpace(spaceId))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={isFavorite ? `Quitar ${spaceName} de favoritos` : `Marcar ${spaceName} como favorito`}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      style={{
        color: isFavorite ? 'var(--color-danger, #ef4444)' : 'currentColor',
        transition: 'color 150ms ease, transform 150ms ease',
      }}
    >
      <Icon
        name="heart"
        size={18}
        style={{
          fill: isFavorite ? 'currentColor' : 'none',
        }}
      />
    </Button>
  )
}
