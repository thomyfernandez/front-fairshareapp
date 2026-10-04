# FairShare · base visual

Tema claro: lienzo blanco, paneles fríos sutiles, acciones índigo y profundidad mediante sombras difusas. Inter se sirve desde los archivos locales del build, sin depender de Google Fonts.

## Archivos y mantenimiento

- `tokens.json`: fuente de valores en formato DTCG 2025.10. Cada token declara `$type` y `$value`. Colores en sRGB normalizado con `hex` de respaldo; dimensiones como objetos y sombras como composiciones, no cadenas CSS.
- `scripts/generate-theme.mjs`: adapta los tipos concretos utilizados por FairShare al tema de Tailwind.
- `src/styles/theme.css`: salida generada con `@theme static`; no editar directamente.
- `vite.config.js`: integra `@tailwindcss/vite`.
- `src/index.css` y `src/App.css`: consumen las variables en las capas `base` y `components`, para que las utilidades puedan sobrescribirlas.

Se usa la configuración nativa de Tailwind v4 en CSS, por lo que no hace falta `tailwind.config.js`. Se conservan los valores predeterminados que no se sobrescriben.

Después de editar los tokens, ejecutar `npm run tokens:build`. También se regeneran antes de `npm run dev` y `npm run build`. Si el servidor de desarrollo ya está abierto, ejecutar el generador para actualizar el CSS y activar HMR. `npm run tokens:check` verifica que la salida esté sincronizada y valida los tipos soportados por el adaptador; no es una certificación de toda la especificación DTCG.

## Utilidades

| Token | Utilidad de ejemplo |
| --- | --- |
| colors.brand.primary | `bg-brand-primary`, `text-brand-primary`, `focus-visible:outline-brand-primary` |
| colors.brand.secondary | `text-brand-secondary` |
| colors.bg.canvas / panel / header | `bg-canvas`, `bg-panel`, `bg-header` |
| colors.text.primary / secondary / tertiary | `text-primary`, `text-secondary`, `text-tertiary` |
| colors.border.subtle / strong | `border-subtle`, `border-strong` (agregar `border` para el ancho) |
| colors.success.default | `bg-success`, `border-success` |
| colors.warning.default / error.default / info.default | `bg-warning`, `text-error`, `border-info` |
| typography.fontFamily.sans | `font-sans` |
| typography.fontWeights | `font-regular`, `font-medium`, `font-semibold`, `font-bold` |
| typography.fontSizes | `text-xs`, `text-sm`, `text-base`, `text-md`, `text-lg`, `text-xl`, `text-2xl` |
| spacing.1 … spacing.16 | `p-1` (4px), `gap-2` (8px), `p-6` (24px), `p-16` (64px) |
| shadows.subtle / panel | `shadow-subtle`, `shadow-panel` |
| radii.sm / md / lg / xl | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` |

Las dimensiones de tipografía y espaciado se convierten a rem tomando 16px como referencia, para respetar el tamaño de fuente elegido por el usuario. La escala solicitada equivale a 12/14/16/18/20/24/30px. Las sombras conservan exactamente sus medidas en px.

`text-primary` es el texto #1a1f36; las acciones índigo usan `brand-primary`. Tailwind ofrece cada color en todos sus tipos de utilidades: elegir la utilidad apropiada según su función semántica.

## Ejemplo React

```jsx
<section className="bg-canvas text-primary border border-subtle rounded-xl p-6 shadow-panel">
  <h2 className="font-sans text-xl font-semibold">Balance del espacio</h2>
  <p className="text-sm text-secondary">Revisá los gastos compartidos.</p>
  <button className="bg-brand-primary text-inverse rounded-md px-4 py-3 hover:bg-brand-hover focus-visible:outline-brand-primary">
    Registrar gasto
  </button>
</section>
```

## Uso y accesibilidad

- Blanco para lienzo y tarjetas; `panel` para áreas secundarias y `header` para bloques de cabecera. `shadow-subtle` para tarjetas habituales, `shadow-panel` para elementos elevados, autenticación o modales.
- El índigo señala acciones principales, enlaces y foco. No usar el verde como color general de marca: está reservado para pago rápido y validaciones positivas.
- Para un botón de pago rápido verde, usar `bg-success text-primary`. Para mensajes positivos, usar `bg-success-background text-success-foreground`. Se agregan variantes oscuras de texto para éxito, advertencia e información.
- `text-tertiary` sobre blanco no alcanza contraste suficiente para texto pequeño esencial. Usar `text-secondary` en etiquetas, ayudas e información necesaria.
- Transiciones de 150–200ms, sin animación de tamaño ni desplazamiento. Los estilos base desactivan las transiciones con `prefers-reduced-motion: reduce`; para nuevas utilidades animadas, usar también `motion-reduce:transition-none`.
- Los controles base tienen una altura mínima de 44px y foco visible. Los errores deben comunicarse con texto, no solamente con color.

Referencias técnicas: [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/), [DTCG Color 2025.10](https://www.designtokens.org/tr/2025.10/color/), [Tailwind v4 con Vite](https://tailwindcss.com/docs/installation/using-vite), [variables de tema](https://tailwindcss.com/docs/theme).
