# FairShare · sistema de diseño Cercana

La dirección visual de FairShare es Cercana: una experiencia tranquila, personal y clara para compartir gastos. La pantalla parte de la situación del usuario y de la próxima tarea que necesita resolver. Un balance protagonista, secciones abiertas y detalles a demanda reemplazan la acumulación de indicadores y tarjetas equivalentes.

La referencia del resumen es el prototipo oscuro de Cercana: fondo #17171f, navegación y listas #22222c, balance #30264e y acciones lavanda #b3a1ff. Inter se sirve localmente. La galería comparte este tema; las demás pantallas conservan la base clara durante la migración. El color no indica por sí solo una deuda o un cobro: siempre lo explica el texto. Los componentes reales y sus estados se pueden revisar en `/componentes` con datos de demostración.

La base y su galería ya están integradas en el resumen, con los datos y flujos existentes de detalle y pago. El resto de las pantallas se migra gradualmente. Consultá el [catálogo de componentes](docs/DESIGN_SYSTEM_COMPONENTS.md) para los contratos, estados y criterios de uso.

## Archivos y mantenimiento

- `tokens.json`: fuente de valores en formato DTCG 2025.10. `themes.dark` contiene las variantes semánticas del prototipo oscuro; no mantener una paleta paralela en CSS. Cada token declara `$type` y `$value`. Colores en sRGB normalizado con `hex` de respaldo; dimensiones como objetos y sombras como composiciones, no cadenas CSS.
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

Las dimensiones de tipografía y espaciado se convierten a rem tomando 16px como referencia, para respetar el tamaño de fuente elegido por el usuario. La escala de lectura equivale a 12/14/16/18/20/24/30px. `balance` (40px) y `balance-lg` (48px) están reservados para el importe protagonista; no forman una nueva fila de indicadores. Las sombras conservan exactamente sus medidas en px.

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

- En el tema claro, blanco para lienzo y tarjetas; `panel` para áreas secundarias y `header` para bloques de cabecera. `shadow-subtle` (0 1px 2px, negro al 3%) para tarjetas habituales, `shadow-panel` para elementos elevados, autenticación o modales.
- El índigo señala acciones principales, enlaces y foco. No usar el verde como color general de marca: está reservado para pago rápido y validaciones positivas.
- Para un botón de pago rápido verde, usar `bg-success text-primary`. Para mensajes positivos, usar `bg-success-background text-success-foreground`. Se agregan variantes oscuras de texto para éxito, advertencia e información.
- `text-tertiary` sobre blanco no alcanza contraste suficiente para texto pequeño esencial. Usar `text-secondary` en etiquetas, ayudas e información necesaria.
- Transiciones de 150–200ms, sin animación de tamaño ni desplazamiento. Los estilos base desactivan las transiciones con `prefers-reduced-motion: reduce`; para nuevas utilidades animadas, usar también `motion-reduce:transition-none`.
- Los controles base tienen una altura mínima de 44px y foco visible. Los errores deben comunicarse con texto, no solamente con color.
- Para contraseñas, usar `PasswordField` (en `src/components/ui`): mantiene la estructura de `Field` (etiqueta, ayuda y error asociados) y agrega dentro del campo un botón de 44px «Mostrar/Ocultar» con nombre accesible «Mostrar contraseña»/«Ocultar contraseña». No crear toggles propios en cada formulario.
- `InlineAlert` admite los tonos `info` (predeterminado), `success`, `warning` y `error`. Usar `warning` para consecuencias que el usuario debe revisar antes de confirmar (por ejemplo, presupuesto insuficiente o un período que se va a reemplazar); usa `bg-warning-background` y `text-warning-foreground`.

Referencias técnicas: [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/), [DTCG Color 2025.10](https://www.designtokens.org/tr/2025.10/color/), [Tailwind v4 con Vite](https://tailwindcss.com/docs/installation/using-vite), [variables de tema](https://tailwindcss.com/docs/theme).

## Jerarquía y composición del resumen

1. Contexto breve del espacio y una acción para agregar un gasto.
2. Balance personal acumulado: un importe protagonista y la acción de registrar un pago cuando corresponde.
3. Actividad del mes: total compartido, cantidad y últimos gastos. El selector pertenece a esta sección y solo filtra los gastos.
4. Una tarea pendiente cuando existe. No repetir acá la deuda que ya aparece en el balance.
5. Presupuesto y otros detalles a demanda. Miembros, invitaciones, reparto y configuración se consultan en las secciones del espacio.

El inicio debe responder cómo estoy, qué pasó este mes y qué necesita mi atención. No mostrar información solamente porque existe en la API. Cada importe debe tener un propósito distinto; no repetir neto, por pagar y aviso de deuda cuando expresan el mismo monto.

### Balance y exactitud

- Solo deuda: “Te queda por pagar”, importe y acreedor cuando se conoce de forma inequívoca.
- Solo cobro: “Te tienen que devolver”, importe y contexto. No ofrecer registrar un pago propio.
- Deuda y cobro simultáneos: mostrar ambos importes con sus etiquetas. No compensarlos en un neto protagonista ni declarar que el usuario está al día cuando el neto es cero.
- Ambos saldos confirmados en cero: “Estás al día”, sin un importe cero decorativo.
- Carga y error: estados explícitos sin saldos anteriores, ceros supuestos ni acciones de pago. Ofrecer reintento cuando está disponible.
- `BalanceSummary` presenta saldos calculados por el modelo del producto; no consulta la API, no calcula repartos y no registra pagos. `onRegisterPayment` abre el flujo existente, que exige elegir deuda, revisar importe y confirmar.
- El presupuesto es el saldo actual del espacio y no se reinicia cada mes. No presentarlo como un límite mensual ni volver a descontar gastos ya liquidados.
- `Money` conserva el formato completo por defecto. `hideZeroDecimals` omite visualmente solo `,00`, mantiene centavos reales y conserva el importe completo para tecnologías de asistencia. Usarlo en el resumen; formularios, confirmaciones y desgloses conservan todos los decimales.

### Fundamentos de Cercana

| Rol | Token | Uso |
| --- | --- | --- |
| Acción principal | `--color-brand-primary` | Oscuro: #b3a1ff, con texto oscuro. Claro: #6048dc, con texto blanco. Botones, enlaces y foco. |
| Balance destacado | `--color-brand-soft` | Oscuro #30264e; claro #eee9ff. Un bloque protagonista por contexto. |
| Texto del balance | `--color-brand-ink` | Oscuro #f0eaff; claro #342565. Texto legible sobre la superficie violeta. |
| Lienzo de trabajo | `--color-workspace` | Oscuro #17171f; claro #f8f8fc. Navegación y listas usan `canvas`: #22222c en oscuro. |
| Importe protagonista | `typography.fontSizes.balance` y `balance-lg` | Hasta 40px en móvil y 48px en el resumen de escritorio desde 721px. Ajuste por longitud y ancho disponible, con un mínimo de 24px para importes largos, sin recortar cifras. |
| Forma protagonista | `radii.feature` / `--radius-feature` | 24px, reservado para el balance. |

Los tokens existentes de formularios, texto, estados y elevación siguen disponibles. No colorear cada tarjeta ni convertir cada sección en una superficie elevada. `Card` conserva su apariencia predeterminada y agrega `brand` para el protagonista y `plain` para agrupaciones sin caja.

### Interacción y accesibilidad

- Una acción principal por contexto; acciones de consulta con menor énfasis. Evitar flechas en cada enlace. La referencia incluye una flecha discreta en registrar pago y revisar un recurrente; conservar esas dos excepciones visuales.
- Controles con un objetivo táctil mínimo de 44px, foco visible y etiquetas persistentes. Los botones admiten etiquetas largas sin provocar desplazamiento horizontal.
- `Disclosure` usa `details`/`summary` nativos para presupuesto y contexto secundario. Las acciones esenciales y los estados de error permanecen visibles.
- Las filas de gastos viven en un panel, con un ícono orientativo de categoría, concepto, pagador, fecha breve e importe. La categoría confirmada tiene prioridad; sin categoría, se reconocen comercios comunes y se usa un recibo como alternativa general. El detalle abre mediante un botón accesible; no incrustar otros botones dentro de la fila. El estado financiero y la participación individual se consultan en el detalle.
- `Avatar` es decorativo y acompaña el nombre escrito. `ActionNotice` comunica una tarea con texto y puede agregar una acción; no usa una alerta en vivo para avisos estáticos.
- Construir primero para móvil y verificar 360px, 390px, 768px y 1280px, nombres e importes largos, foco, teclado, zoom y movimiento reducido. Cambiar la distribución según el contenido; no reducir el texto para hacer entrar más datos.
- La galería muestra las variantes por pagar, por cobrar, simultáneas, neto cero con deudas, al día, carga y error. Los ejemplos nunca llaman a la API ni simulan un pago confirmado.

## Etapas de adopción

1. **Sistema y componentes — implementado:** tokens, contratos, catálogo interactivo y pruebas de sus estados.
2. **Resumen — implementado:** componentes conectados al modelo actual, sin importes repetidos, filtro mensual separado del balance y flujos reales de detalle y pago total o parcial. Presupuesto a demanda y avisos por revisiones reales o saldo insuficiente. Un error en un recurso no bloquea los demás.
3. **Resto del producto:** revisar navegación, gastos, balance y recurrentes con la misma jerarquía. Cada pantalla conserva las funciones necesarias y reduce información secundaria en el primer nivel.

## Tema y navegación de la referencia

- `AppLayout` selecciona `data-theme="dark"` para el resumen y `/componentes`, y restaura el tema al cambiar de contexto. El tema se aplica a la raíz para incluir modales y avisos que usan portal. No cambia la apariencia del sistema operativo ni guarda preferencias del usuario.
- El generador conserva las variables semánticas entre temas y emite las variantes oscuras desde `tokens.json`. No editar directamente `theme.css`.
- En el resumen, la navegación muestra Inicio, Gastos, Balance, Recurrentes y Más. Más conserva liquidaciones, miembros, configuración e ingresos; cuenta y espacios permanecen accesibles al pie. En móvil se reutiliza el menú accesible.
- El resumen no agrega una cabecera de migas de pan en escritorio. La composición usa espacio del grupo, título, balance, mes, presupuesto desplegable y aviso de revisión. El título usa `page` (26px), el total mensual `metric` (28px) y el ícono `brand.tint`.
