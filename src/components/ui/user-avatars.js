// Catálogo de avatares ilustrados para usuarios del sistema de diseño Cercana.
export const userAvatarChoices = [
  { id: 'astro', label: 'Astro', path: '/avatars/astro.svg', description: 'Explorador espacial con visor panorámico' },
  { id: 'gato-zen', label: 'Gato Zen', path: '/avatars/gato-zen.svg', description: 'Gatito geométrico con lentes de sol' },
  { id: 'beat', label: 'Beat', path: '/avatars/beat.svg', description: 'Personaje con auriculares vincha' },
  { id: 'carpincho', label: 'Carpincho', path: '/avatars/carpincho.svg', description: 'Carpincho zen con mandarina en la cabeza' },
  { id: 'tero', label: 'Tero', path: '/avatars/tero.svg', description: 'Tero atento con copete y ojo rojo vigilante' },
  { id: 'bot', label: 'Bot', path: '/avatars/bot.svg', description: 'Robot amigable con luz esmeralda' },
  { id: 'ninja', label: 'Ninja', path: '/avatars/ninja.svg', description: 'Personaje con vincha lavanda' },
  { id: 'detective', label: 'Detective', path: '/avatars/detective.svg', description: 'Investigador con lupa y sombrero' },
  { id: 'chef', label: 'Chef', path: '/avatars/chef.svg', description: 'Cocinero con gorro alto y bigote simpático' },
  { id: 'gamer', label: 'Gamer', path: '/avatars/gamer.svg', description: 'Gamer con gorra hacia atrás y gamepad' },
  { id: 'coffee', label: 'Cafecito', path: '/avatars/coffee.svg', description: 'Taza de café humeante kawaii' },
  { id: 'plant', label: 'Planta', path: '/avatars/plant.svg', description: 'Planta suculenta en maceta con carita' },
  { id: 'artist', label: 'Artista', path: '/avatars/artist.svg', description: 'Boina francesa y pincel en la oreja' },
  { id: 'runner', label: 'Runner', path: '/avatars/runner.svg', description: 'Deportista con vincha de toalla' },
  { id: 'owl', label: 'Búho Sabio', path: '/avatars/owl.svg', description: 'Búho con anteojos que vigila los gastos' },
  { id: 'panda', label: 'Panda', path: '/avatars/panda.svg', description: 'Oso panda tierno con bufanda lavanda' },
  { id: 'wizard', label: 'Mago', path: '/avatars/wizard.svg', description: 'Hechicero con sombrero estrellado' },
  { id: 'rocket', label: 'Cohete', path: '/avatars/rocket.svg', description: 'Cohete propulsado al espacio' },
]

export const isUserAvatar = id => userAvatarChoices.some(choice => choice.id === id)

export function getUserAvatar(id) {
  return userAvatarChoices.find(choice => choice.id === id) || null
}
