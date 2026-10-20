# FairShare · sistema de diseño Cercana

La dirección visual de FairShare es Cercana: una experiencia tranquila, personal y clara para compartir gastos. La pantalla parte de la situación del usuario y de la próxima tarea que necesita resolver. Un balance protagonista, secciones abiertas y detalles a demanda reemplazan la acumulación de indicadores y tarjetas equivalentes.

La referencia de todo el producto es el prototipo oscuro de Cercana: fondo #17171f, navegación y listas #22222c, balance #30264e y acciones lavanda #b3a1ff. Inter se sirve localmente. Todas las pantallas, incluidos acceso, registro, menús, diálogos y galería, comparten el tema elegido: el oscuro de referencia o el claro, que usa los valores base de `tokens.json`. El color no indica por sí solo una deuda o un cobro: siempre lo explica el texto. Los componentes reales y sus estados se pueden revisar en `/componentes` con datos de demostración.

Los componentes se aplican al resumen, gastos, balance, recurrentes, liquidaciones, miembros, configuración, espacios e ingresos, conservando los contratos de API y las confirmaciones existentes. Consultá el [catálogo de componentes](docs/DESIGN_SYSTEM_COMPONENTS.md) para los contratos, estados y criterios de uso.

## Archivos y mantenimiento

- `tokens.json`: fuente de valores en formato DTCG 2025.10. Los valores base forman el tema claro y `themes.dark` contiene las variantes semánticas del prototipo oscuro con los mismos nombres; no mantener una paleta paralela en CSS. Cada token declara `$type` y `$value`. Colores en sRGB normalizado con `hex` de respaldo; dimensiones como objetos y sombras como composiciones, no cadenas CSS.
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
- `Disclosure` usa `details`/`summary` nativos para presupuesto y contexto secundario. Las acciones esenciales y los estados de error permanecen visibles. El presupuesto del resumen agrupa saldo acumulado y proyección en un panel desplegable con ícono de billetera; la estimación usa un fondo tenue de marca o advertencia si falta saldo, siempre con una etiqueta explícita. Las aclaraciones tienen menor jerarquía y las columnas se apilan cuando falta espacio.
- Las filas de gastos viven en un panel, con un ícono orientativo de categoría, concepto, pagador, fecha breve e importe. La categoría confirmada tiene prioridad; sin categoría, se reconocen comercios comunes y se usa un recibo como alternativa general. El detalle abre mediante un botón accesible; no incrustar otros botones dentro de la fila. El estado financiero y la participación individual se consultan en el detalle.
- `Avatar` es decorativo y acompaña el nombre escrito. `ActionNotice` comunica una tarea con texto y puede agregar una acción; no usa una alerta en vivo para avisos estáticos.
- Construir primero para móvil y verificar 360px, 390px, 768px y 1280px, nombres e importes largos, foco, teclado, zoom y movimiento reducido. Cambiar la distribución según el contenido; no reducir el texto para hacer entrar más datos.
- La galería muestra las variantes por pagar, por cobrar, simultáneas, neto cero con deudas, al día, carga y error. Los ejemplos nunca llaman a la API ni simulan un pago confirmado.

## Etapas de adopción

1. **Sistema y componentes — implementado:** tokens, contratos, catálogo interactivo y pruebas de sus estados.
2. **Resumen — implementado:** componentes conectados al modelo actual, sin importes repetidos, filtro mensual separado del balance y flujos reales de detalle y pago total o parcial. Presupuesto a demanda y avisos por revisiones reales o saldo insuficiente. Un error en un recurso no bloquea los demás.
3. **Resto del producto — implementado:** navegación compacta en todas las secciones, tema oscuro en acceso y registro, filas de gastos con categoría y acciones separadas, balance compartido sin neto redundante, recurrentes con edición a demanda y paneles de ingresos, miembros, espacios y configuración. Liquidaciones separa Pendientes e Historial, agrupa los gastos por mes y muestra total, período, nota y saldo estimado en un resumen lateral que se apila en móvil. Conserva la revisión exacta antes de confirmar y no presupone un saldo disponible en cero ante datos ausentes.

## Marca

- El isotipo es una **F cuyos dos brazos forman un signo igual**: la F de FairShare y la idea de repartir en partes justas. Se dibuja con `BrandMark` (SVG) usando `brand-primary` de fondo y `text-inverse` para la figura, por eso se adapta solo a cada tema.
- `Brand` combina el isotipo con el nombre en minúsculas `fairshare.`; el punto violeta pertenece solo al nombre y no se repite en el ícono. El enlace se anuncia como “FairShare, ir al inicio” y el isotipo queda oculto para lectores de pantalla.
- `public/favicon.svg` repite la misma geometría con los valores de `tokens.json` y cambia a la variante oscura según la apariencia del sistema. Si cambia el isotipo, actualizar ambos archivos.
- No deformar, rotar ni recolorear el isotipo fuera de los tokens de marca, ni agregarle texto o efectos.

## Tema y navegación de la referencia

- El tema se elige con “Usar modo claro” u “Usar modo oscuro” (`ThemeToggle`), al pie de la navegación y en la cabecera de acceso y registro. En la barra lateral se usan las etiquetas breves “Modo claro” y “Modo oscuro”, alineadas con los demás destinos; el nombre accesible conserva la acción completa. El texto nombra la acción disponible, sin depender del ícono. La preferencia se guarda en el navegador (`fairshare.theme`); sin una elección se respeta la apariencia del sistema y, si no se conoce, se usa el oscuro de referencia. `useAppTheme` aplica `data-theme` desde `AppLayout` y `AuthLayout`, y `index.html` replica la resolución para la primera pintura. La raíz incluye modales y avisos que usan portal. Al agregar estilos, usar siempre variables semánticas y revisar la pantalla en ambos temas.
- El generador conserva las variables semánticas entre temas y emite las variantes oscuras desde `tokens.json`. No editar directamente `theme.css`.
- En las secciones de un espacio, la navegación muestra Inicio, Gastos, Balance, Recurrentes y Liquidaciones en el grupo principal. Miembros y Configuración forman un segundo grupo visible, separado por espacio y un borde sutil. Mis ingresos, cuenta y espacios permanecen accesibles al pie. No ocultar destinos detrás de Más. Configuración usa un engranaje, sin rayos de sol. En móvil se reutiliza el menú accesible.
- Las pantallas usan un área de trabajo de hasta 960px y una navegación de 176px desde 721px. En móvil, el menú usa el diálogo compartido. No se agrega una cabecera de migas de pan en escritorio. La composición usa espacio del grupo, título, balance, mes, presupuesto desplegable y aviso de revisión. El título usa `page` (26px), el total mensual `metric` (28px) y el ícono `brand.tint`.

## Componentes del resto del producto

- `PanelDisclosure` extiende `Disclosure` con superficie, ícono y chevron. Se usa en presupuesto, contexto de ingresos, datos de espacios y edición de recurrentes. Mantiene `details`/`summary`, apertura nativa con teclado y foco visible; no esconder errores o confirmaciones esenciales.
- `ExpenseRow` acepta `status` para el estado del gasto. Sus acciones de administración van fuera del botón principal, con nombres accesibles y objetivos de 44px; no anidar controles dentro de la fila. Los importes se alinean aunque una fila no permita eliminar.
- `Avatar` identifica personas y `ui-item-icon` orienta sobre el tipo de contenido. No reemplazan las etiquetas escritas.
- `product.css` compone las superficies, filtros y listas compartidas usando los tokens existentes. Los formularios y confirmaciones mantienen su validación y preservan los datos ante errores.

### Composición de Liquidaciones

`Tabs` conserva los paneles montados y permite navegar con flechas, Inicio y Fin, con foco visible y una única pestaña en el recorrido de Tab. `SelectableExpenseRow` reutiliza el contenido, las categorías y los importes de `ExpenseRow`; su checkbox nativo está asociado a toda la fila, con foco y selección legibles. No agrega líneas divisorias entre gastos.

El encabezado explica la tarea. Las filas se agrupan por fecha del gasto y el resumen reúne el total a liquidar, período contable, nota a demanda y saldo posterior estimado; no volver a presentar el saldo disponible en el encabezado. La ayuda sobre el efecto del cierre queda a demanda y también se explica en la confirmación. El resumen inicia sin selección y no propone un cierre financiero automáticamente. El historial vacío tiene un mensaje breve, sin panel elevado ni filtros; si un filtro activo no encuentra resultados, conserva los filtros y permite limpiarlos.

### Composición de Configuración

Configuración usa secciones abiertas con título, contexto breve y controles; desde un ancho útil de 48rem, títulos y controles se distribuyen en dos columnas. Los datos básicos, modalidad de reparto y saldo disponible pertenecen al mismo formulario. La invitación y la eliminación quedan fuera de él. No agregar pestañas ni tarjetas anidadas para estas opciones.

`ChoiceCards` muestra alternativas excluyentes con radios nativos, etiquetas y explicaciones; conserva navegación con flechas y no comunica selección solo con color. `CurrencyField` extiende `Field` con teclado decimal, formato es-AR al salir y parseo explícito de separadores, sin convertir valores inválidos o ausentes en cero. Los ejemplos interactivos están en `/componentes`.

La barra de guardado comunica cambios pendientes y permite descartarlos. Guardar se habilita con cambios reales y valores válidos; solo envía campos modificados. Los cambios de saldo o modalidad requieren revisar sus consecuencias. El saldo se reemplaza, no se incrementa, y no es un límite mensual. Las respuestas fallidas conservan el borrador; el éxito depende de la API. Las invitaciones priorizan copiar el enlace y muestran las alternativas a demanda. Eliminar permanece separado, con confirmación explícita y explicación del alcance.

### Navegación personal con contexto del espacio

Mis ingresos pertenece a la cuenta y se aplica a todos los espacios. Al abrirlo desde uno, conservar su selector y los accesos a Inicio, Gastos, Balance y demás secciones; solo Mis ingresos queda marcado como destino actual. El contexto viaja en el enlace como `?espacio={id}` y se valida contra los espacios del usuario. Cambiar de espacio desde Mis ingresos conserva la pantalla personal. El menú móvil ofrece la misma navegación y cierra al elegir un destino. No presentar ingresos distintos por espacio ni perder el contexto por cambiar a una sección personal.

### Continuidad en el registro de gastos

La carga por lote empieza con un gasto y agrega filas a demanda. El encabezado, el regreso al listado y los gastos comparten el ancho del área de trabajo; no hay tarjeta exterior ni un segundo título que repita la tarea. El borrador y la ayuda ocupan una línea discreta. Cada gasto usa una sola superficie.

`BatchExpenseItem` conserva el selector montado al plegar el editor para no perder selecciones ni repartos. El reparto equitativo y proporcional presenta los nombres y permite editar; los repartos personalizados y los errores permanecen desplegados. `ParticipantsSelector` admite `compact` para eliminar superficies anidadas y roles que no intervienen en la carga, sin cambiar sus cálculos. En los repartos personalizados, las unidades quedan fijas dentro del campo y fuera del valor editable: `%` como sufijo en porcentajes y `$` como prefijo en montos fijos, ambos centrados verticalmente. Se reserva espacio para que el número no lo tape; el campo conserva su nombre accesible y las flechas del teclado. Los gastos completos pueden plegarse con “Listo” y se pliegan al agregar otro; los incompletos siguen abiertos. Los nombres largos del pagador se muestran también como ayuda cuando pueden quedar cortados en el selector.

El total aparece una sola vez en la barra final con “Registrar N gastos”. La barra permanece en el flujo en móvil y se fija al pie en escritorio con altura suficiente; los controles reservan margen de desplazamiento para no quedar cubiertos. La pantalla de carga permite revisar y editar. Su acción “Registrar N gastos” abre una confirmación breve con cantidad, espacio y total; el desglose de importes, fechas, pagadores y repartos queda a demanda. El diálogo conserva una instantánea exacta para el envío. Las coincidencias se explican allí y requieren “Registrar de todos modos”. Cerrar o volver a editar no envía datos. Un fallo del servidor conserva el lote. El reparto proporcional siempre aclara que se calcula al registrar.

En el lote, la descripción junto al número funciona como título editable: conserva `Field`, su etiqueta para lectores de pantalla y validación, con fondo transparente y sin borde para reducir el peso visual de la cabecera. El campo vacío invita a escribir con “Escribí una descripción…”, sin una etiqueta visible encima. El foco usa un subrayado lavanda de 2px, sin recuadro alrededor del texto. Cuando contiene un error, el subrayado pasa a rojo y se conserva el mensaje escrito.

Repetir vive en el detalle y en hasta cuatro accesos frecuentes dentro de la carga individual, calculados del historial real del espacio. No agregar un panel de sugerencias en el resumen. Las sugerencias abren una carga revisable; si existe un borrador, pedir confirmación antes de reemplazarlo. La fecha se actualiza y los participantes se restringen a miembros actuales.

Los borradores se anuncian en el listado con una fila por tipo: gasto individual o lote, su descripción o cantidad y acciones Retomar y Descartar. Retomar usa el botón principal; Descartar conserva borde visible, papelera y confirmación contextual. No duplicar Retomar en la cabecera. No mezclar sus importes con los registrados. Un texto breve aclara dónde se conservan. Quitar una fila de un borrador ofrece Deshacer; eliminar un registro continúa requiriendo la confirmación existente y no ofrece una reversión inexistente.

Las coincidencias por concepto, fecha e importe usan el diálogo compartido, con una salida para revisar y una acción explícita para registrar igualmente. `ExpenseReceipt` presenta el resultado confirmado y enlaces a su desglose; errores y repartos estimados no se convierten en comprobantes. Los errores del formulario se muestran junto a la carga, sin avisos flotantes duplicados que cubran los controles. Los filtros y la posición del listado se conservan por espacio durante la sesión.

### Importes de plantillas recurrentes

La creación y actualización muestran “Monto del gasto” y un total calculado en vivo. “Agregar un importe adicional” revela el segundo campo; se presenta abierto si la plantilla ya tiene un adicional. Ambos importes se suman y el total conserva los centavos. Plegar el adicional no elimina su valor: continúa incluido en el total. Para quitarlo, se ingresa 0. Las etiquetas visibles simplifican el lenguaje sin cambiar los campos del contrato de la API. El total se muestra como no disponible si falta un importe válido.

En escritorio, los importes ocupan una columna y el total se alinea a su lado. La acción de guardar tiene una fila propia al pie del formulario, alineada a la derecha. En móvil, los campos se apilan y el botón ocupa el ancho disponible.

### Bandeja de gastos recurrentes

“Agregar para registrar” copia una plantilla vigente al mismo borrador por lote de Gastos, separado por usuario, espacio y pestaña. Conserva monto base más adicional, pagador, categoría y modalidad de reparto; incluye a los miembros actuales y propone la fecha de hoy. Nunca registra un gasto al seleccionar ni modifica la plantilla. Las plantillas vencidas o con datos incompatibles explican qué revisar antes de agregarlas.

`RecurringBatchTray` muestra cantidad, total y las acciones “Ver selección” y “Revisar gastos”. La selección se identifica también con “Agregado”, sin depender del color. No duplica una plantilla ya agregada, no reemplaza un borrador existente y respeta el límite de 100 gastos, incluyendo la fila recuperable de Deshacer. “Ver selección” abre el diálogo compartido para consultar y quitar elementos; “Revisar gastos” lleva al editor existente, donde se pueden cambiar importes, fechas y participantes y confirmar el registro. Si algún importe está incompleto, el total indica “Por completar”. El borrador solo se elimina después de un registro confirmado o al quitar sus elementos. En pantallas bajas la bandeja permanece en el flujo para no tapar campos con el teclado abierto.

### Lenguaje para agregar varios gastos

La interfaz usa “Agregar varios gastos”, “gastos para registrar”, “Ver selección” y “Revisar gastos”. La confirmación indica la cantidad exacta: “Registrar 1 gasto”, “Registrar 2 gastos”, etc. Evitar “lote” en textos visibles y nombres accesibles; las rutas, claves de borrador y contratos de la API conservan ese identificador técnico.

Las notificaciones breves de `UIProvider` se cierran a los cinco segundos y conservan su botón de cierre. Pausan la cuenta mientras el cursor está encima o tienen foco con teclado; al salir continúan con el tiempo restante. Los avisos persistentes del formulario y los comprobantes no se cierran con este temporizador.

### Confirmación breve al registrar varios gastos

Desde Recurrentes, “Revisar gastos” abre el editor. Ese editor termina con “Registrar N gastos” y un modal “Confirmar registro”, sin otra revisión desplegada. El detalle se consulta opcionalmente con “Ver detalle de los gastos”. Los posibles duplicados permanecen visibles y exigen “Registrar de todos modos”; los demás envíos usan “Confirmar registro”. Cancelar vuelve al editor conservando todo lo ingresado.

`BatchExpenseBreakdown` presenta ese detalle con `PanelDisclosure`: un control de ancho completo, ícono de recibo, chevron, hover y foco visibles. Cada gasto tiene una superficie tenue con concepto, ícono orientativo, importe y contexto breve de fecha y pagador. El reparto se separa visualmente y acompaña los nombres con avatares. Los importes y porcentajes conservan su precisión; para reparto proporcional, “Se calcula al registrar” se explica una sola vez y no se inventan importes individuales. En móvil, el importe pasa debajo del concepto cuando falta espacio.

### Paginación de gastos

El listado muestra 10 gastos recientes por página, con tamaños de 10, 20 y 50. `ExpensePagination` presenta el rango visible y el total, el tamaño de página, anterior/siguiente y un selector para saltar directamente a cualquier página. El tamaño y la página se conservan en la URL (`cantidad`, `pagina`) y en el contexto del espacio. Buscar o cambiar fechas reinicia a la primera página; borrar el último registro de una página ajusta a la última disponible. Cambiar de página lleva el foco y la lectura al inicio del listado. Los controles se apilan en móvil y conservan las etiquetas y nombres accesibles; las flechas mantienen un área de al menos 44px. La paginación se realiza sobre la respuesta completa del endpoint existente, después de filtrar, sin inventar parámetros de paginado del backend.

### Categoría del gasto

`ExpenseCategoryPicker` acompaña la descripción del registro individual y el encabezado de cada gasto en la carga de varios. El disparador muestra la categoría y su ícono, y abre el `Modal` compartido con el catálogo de la API y “Sin categoría”. Elegir aplica el cambio y cierra el diálogo; Cancelar y Escape conservan la elección anterior. El foco vuelve al disparador. La cuadrícula usa dos columnas en móvil y cuatro en escritorio, opciones táctiles amplias y selección indicada por borde, `aria-pressed` y marca de verificación.

La categoría confirmada determina el ícono en Inicio, Gastos, detalles y Liquidaciones; sin categoría se conserva la compatibilidad con íconos anteriores y la inferencia de comercios. El diálogo incluye carga, error con reintento y catálogo vacío. Cada formulario comparte una sola consulta del catálogo entre sus gastos. El borrador y Repetir conservan `categoriaId` y `categoriaNombre`; la API recibe `categoriaId`.
