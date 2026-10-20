# Catálogo de componentes · Cercana

Este catálogo define qué hace cada componente, qué información recibe y cuándo usarlo. La implementación compartida vive en `src/components/ui`; se importa desde su `index.js`. La galería `/componentes` permite revisar los componentes reales y una composición del futuro resumen con datos de demostración.

## Fundamentos y límites

- `tokens.json` es la fuente de valores; `src/styles/theme.css` se genera con `npm run tokens:build`. No mantener una segunda paleta en componentes o páginas.
- `src/styles/summary-components.css` define los componentes de Cercana; `src/styles/design-system.css` solo organiza el catálogo. Las páginas reales no deben depender de clases `ds-*`.
- Los componentes presentan información y emiten intenciones mediante callbacks. Los hooks y modelos de cada funcionalidad conservan consultas, permisos, cálculos, mutaciones e invalidación de recursos.
- Todas las pantallas usan el tema oscuro del prototipo. Comparten Inter local, texto legible, foco de marca, controles de al menos 44px y movimiento reducido. Las cifras no se truncan con puntos suspensivos.
- No usar `Money` con datos ausentes: su formato histórico interpreta entradas no numéricas como cero. Los nuevos patrones financieros validan sus importes antes de renderizarlo.

## Componentes base existentes

| Componente | Responsabilidad | Variantes y reglas |
| --- | --- | --- |
| `BrandMark` | Isotipo F igual de FairShare. | Decorativo (`aria-hidden`); el nombre accesible lo da el enlace que lo contiene. Toma los colores del tema activo; `size` define el tamaño. |
| `Button` | Ejecutar una acción. | `primary`, `secondary`, `ghost`, `danger`; `loading` impide envíos repetidos. Una acción principal por contexto. Para navegar, usar un enlace con las clases equivalentes. |
| `Field` | Etiqueta persistente, campo, ayuda y error asociados. | Reutilizarlo para entradas y selectores. `Checkbox` y `PasswordField` cubren sus controles específicos. |
| `Modal` | Presentar detalle o confirmación sin perder contexto. | Reutiliza la gestión existente de foco, Escape, cierre y retorno al disparador. No usarlo para mensajes breves. |
| `Badge` | Estado corto y complementario. | `neutral`, `brand`, `success`, `warning`, `error`, `info`. Nunca reemplaza una explicación financiera ni funciona como botón. |
| `PageHeader` | Título principal, contexto y acciones de una página. | Un encabezado principal por pantalla. No repetir el nombre del espacio en varias tarjetas. |
| `LoadingState`, `ErrorState`, `EmptyState` | Comunicar estados de un recurso. | Una consulta fallida no es una lista vacía. El error ofrece reintento; el vacío ofrece una acción útil cuando corresponde. |
| `InlineAlert` | Explicar una consecuencia o un resultado junto al flujo. | Reservar `error` para errores; no reemplazarlo por un color o un ícono sin texto. |

## RecurringBatchTray

**Responsabilidad:** mantener visibles los gastos seleccionados desde Recurrentes y conducir a su revisión. Componente de la funcionalidad, construido con `Button`, `Money`, `Modal`, `InlineAlert` y `EmptyState` compartidos.

Recibe `batch` (borrador, ubicación de guardado, error, anuncio y acciones de quitar/revisar), `members` para identificar pagadores y `onEmptyClose` para devolver el foco cuando desaparece el disparador. El hook `useRecurringBatch` conserva el borrador existente de Gastos; la bandeja no llama al servidor ni presenta una selección como registro confirmado. Incluye estados vacío, seleccionado, importe incompleto y error; anuncia altas y bajas y permite operar el diálogo con teclado. El total suma centavos y el layout se apila en móvil.

## Card

**Responsabilidad:** dar una superficie a un grupo que la necesita. No es el contenedor automático de todas las secciones.

| Propiedad | Contrato |
| --- | --- |
| `as` | Elemento semántico; predeterminado `section`. |
| `variant` | `default`: tarjeta existente; `brand`: violeta suave, sin sombra, radio protagonista; `plain`: agrupación abierta sin borde, fondo ni padding. |
| `children`, `className`, atributos HTML | Contenido y extensión local. Las variantes de marca conservan texto con contraste. |

Usar `brand` una sola vez por contexto. Las listas de actividad, los avisos y los encabezados no necesitan otra caja alrededor.

## BalanceSummary

**Responsabilidad:** explicar la situación personal acumulada y ofrecer el próximo paso. No presenta presupuesto, gastos mensuales ni sumatorias locales de la API.

| Propiedad | Contrato |
| --- | --- |
| `payable`, `receivable` | Números finitos mayores o iguales a cero, con los importes confirmados del modelo. Ambos son obligatorios para declarar un balance disponible. |
| `counterpart` | Contexto opcional inequívoco, por ejemplo “A Thomas Fernandez” o “De 2 integrantes”. El contenedor lo construye según la cantidad y dirección real de las deudas. |
| `loading` | Oculta saldos previos y acciones; muestra un estado de carga con nombre accesible. |
| `error` | Objeto de error del recurso. Tiene prioridad sobre cualquier saldo recibido. |
| `onRetry` | Callback opcional para volver a consultar; no sustituye un error por un éxito local. |
| `onRegisterPayment` | Abre el flujo de registro existente. Se ofrece solo cuando hay dinero por pagar. No ejecuta directamente la mutación. |
| `detailAction` | Enlace o botón de consulta. Tiene menor énfasis que registrar pago. |

| Situación | Presentación |
| --- | --- |
| Deuda sin cobro | “Te queda por pagar” y un solo importe. |
| Cobro sin deuda | “Te tienen que devolver” y un solo importe. Sin botón de pago propio. |
| Deuda y cobro | “Tenés pagos y cobros pendientes”, con dos importes identificados. Sin neto adicional. |
| Deuda y cobro iguales | Conserva ambos importes; no muestra “Estás al día”. |
| Ambos en cero | “Estás al día”, sin un importe cero decorativo. |
| Ausente, negativo o no finito | Balance no disponible. No inventar un cero ni habilitar un pago. |
| Carga o error | Estado explícito. Sin importes ni acciones financieras. |

El alcance “Todos los períodos” se muestra como etiqueta a la derecha del encabezado, y se distribuye en otra línea si falta espacio. El componente usa un `section` con el nombre accesible “Tu balance acumulado”, un encabezado de segundo nivel y etiquetas textuales para cada dirección del dinero. El selector de mes nunca vive dentro de este componente.

## Money

- `value`: importe válido; la página debe validar su disponibilidad.
- `hideZeroDecimals`: `false` por defecto. Con `true`, omite visualmente solo `,00`; `111382.50` conserva `,50`. No redondea a enteros.
- `className`: extensión de tipografía dentro del contexto.
- Conserva `es-AR`, ARS, cifras tabulares y una lectura accesible con decimales completos. El balance ajusta el tamaño según la longitud y el ancho de su contenedor, entre 24px y el máximo del contexto (40/48px). Conserva todas las cifras y permite distribuir la moneda en otra línea; no trunca importes.
- Usar la versión completa en edición, detalle y confirmación de pago. No confundir esta opción con abreviaturas como “111k”.

## ExpenseRow

**Responsabilidad:** identificar un gasto y abrir su detalle sin exponer todos sus campos en el resumen.

| Propiedad | Contrato |
| --- | --- |
| `description` | Concepto visible y nombre de la acción “Ver detalle de …”. |
| `payerName` | Nombre confirmado del pagador. Si no está disponible, se comunica su ausencia. |
| `payerLabel` | Nombre breve opcional. El resumen lo acorta solo si identifica inequívocamente a un integrante. |
| `category` | Categoría confirmada para elegir el ícono orientativo; sin categoría, reconoce algunos comercios y usa recibo como alternativa. No modifica datos financieros. |
| `paidByYou` | Cambia el contexto a “Pagaste vos”; debe derivarse del identificador real del usuario. |
| `date` | Fecha local de la API, formateada con `dateLabel` en modo breve, por ejemplo “8 oct”; no convertirla a UTC. El detalle conserva fecha completa. |
| `amount` | Número finito no negativo. Si falta, muestra “Importe no disponible”. |
| `onSelect` | Si existe, toda la fila es un botón; si falta, es contenido estático. Nunca insertar enlaces o botones dentro de la fila. |

En móvil, el importe puede ocupar una línea debajo del concepto. A partir de 480px se alinea a la derecha. Nombres, conceptos e importes largos se distribuyen sin truncarse. Para una lista, usar `ul.ui-expense-list` y un `li` por gasto. Participación individual, estado y desglose quedan en el detalle existente, que debe conservar el foco y el contexto al cerrar.

## SectionHeading

`title` define un `h2`; `description` agrega contexto opcional; `action` recibe una acción secundaria o un control local; `id` permite asociar el título a la sección. Se adapta mediante distribución y salto de línea, sin reducir el tamaño del texto.

Usarlo para “El mes en tu espacio” con el selector de gastos. No agregar controles globales dentro de una sección local.

## Disclosure

`title` nombra el despliegue y `children` contiene el detalle. `className` y los atributos HTML se pasan al elemento `details`. El control `summary` nativo mantiene teclado, foco y estado expandido; no se implementa una segunda lógica de acordeón.

Usarlo para presupuesto o explicaciones secundarias. No esconder errores, consecuencias de una confirmación, acciones esenciales o deudas simultáneas dentro del desplegable.

## ActionNotice

`title` describe una tarea concreta; `description` es opcional; `action` recibe un enlace o botón; `tone` admite `neutral` o `warning`; `icon` usa el catálogo existente. El aviso es una región complementaria con nombre, sin anuncios en vivo para contenido estático.

No es una tarjeta adicional de métricas ni una segunda presentación del saldo. Cuando no hay una tarea real, omitirlo. Una revisión vencida puede usar advertencia; un aviso rutinario usa tono neutro. No depender del color para explicar su significado.

## Avatar

`name` genera hasta dos iniciales; `size` admite `normal` (40px) o `small` (32px). Es decorativo (`aria-hidden`); el nombre escrito siempre debe estar disponible cerca. No usar el color para identificar el rol, la deuda o la situación de una persona.

## Composición e integración del resumen

`SummaryPreview` en la galería combina estos componentes con datos de demostración y permite probar estados sin consultar la API. El resumen real usa los mismos componentes, los recursos existentes y `DashboardBudget` para consultar el saldo acumulado y su estimación a demanda. Sus avisos de demostración y controles de escenario no deben trasladarse al producto.

La integración real en `Dashboard` mantiene estas reglas:

1. Obtener los importes desde `personalBalance` y los recursos existentes, manteniendo carga, error y reintento independientes.
2. Mantener el balance acumulado al cambiar el mes de los gastos.
3. Reutilizar `DashboardPayment` y `ExpenseDetail`; conservar la revisión del importe y la confirmación antes de mutar.
4. Eliminar deuda repetida en avisos, sumatorias equivalentes y acciones duplicadas.
5. Mantener el presupuesto acumulado a demanda y la revisión de recurrentes visible solo cuando corresponda.
6. Revisar permisos, vacío, error, pago parcial, deudas simultáneas, nombres e importes largos, teclado y responsive.

## Verificación

Ejecutar `npm run lint`, `npm test`, `npm run tokens:check` y `npm run build`. Las pruebas de `summary-components.test.jsx` cubren saldos simultáneos, datos inválidos, la intención de pago, formato monetario y cambios de mes en la demostración. La compilación no reemplaza revisar la galería en navegador a 360px, 390px, 768px y 1280px.

El generador de tokens incluye `themes.dark`. `useAppTheme`, usado por `AppLayout` y `AuthLayout`, aplica el tema en la raíz para que la confirmación de pagos, los detalles y el menú móvil mantengan el mismo contraste y apariencia. La navegación compacta mantiene todos los destinos visibles: Liquidaciones está junto a la actividad principal; Miembros y Configuración forman el grupo secundario. Mis ingresos queda junto a la cuenta. El ícono de Configuración representa un engranaje.

## PanelDisclosure

Panel para información secundaria, construido sobre `Disclosure` con `title`, `icon`, `children`, `className` y atributos nativos de `details`, como `open`. El título puede ocupar varias líneas. Billetera para presupuesto, configuración para editar recurrentes e información para aclaraciones. Mantiene apertura con Enter/Espacio, cierre con la misma acción y foco visible; los íconos son decorativos. La galería incluye una muestra interactiva.

`ExpenseRow` admite `status` como contenido opcional junto al concepto. En gastos se reutiliza con `Badge`, conservando el detalle en un botón y la eliminación como acción separada. `BalanceSummary` también se reutiliza en Balance y pagos, sin compensar cobros y deudas.

## Tabs

Contrato: `label`, `items` (`value`, `label`, `count` opcional, `content`), `value` y `onChange`. Los IDs se generan con `useId`. Implementa `tablist`/`tab`/`tabpanel`, selección controlada, flechas horizontales, Inicio/Fin y foco itinerante. El panel inactivo queda oculto y permanece montado para conservar formularios. Se usa en Liquidaciones y tiene un ejemplo en la galería.

## SelectableExpenseRow

Contrato: las propiedades de contenido de `ExpenseRow`, más `checked`, `onChange` y `disabled`. Comparte `ExpenseRowContent` para concepto, ícono, fecha breve, pagador e importe. Usa un checkbox nativo dentro de un label que abarca toda la fila; no anida botones. El nombre accesible incluye concepto y fecha; la selección tiene un tono suave de marca y conserva el foco del control. En Liquidaciones, las filas se agrupan por mes y el importe pasa debajo del concepto cuando falta espacio. Las categorías confirmadas tienen prioridad; sin categoría, comercios conocidos y el concepto exacto Alquiler orientan el ícono sin cambiar datos financieros.

## ChoiceCards y CurrencyField

- `ChoiceCards({ label, name, value, onChange, options, disabled, error })`: selección excluyente con `fieldset` y radios nativos. Cada opción contiene `value`, `label` y `description`. Toda la fila es pulsable; las flechas cambian la selección y el foco sigue siendo visible. Se usa cuando conviene comparar pocas opciones sin abrir un selector.
- `CurrencyField({ value, onChange, ...fieldProps })`: mantiene texto controlado durante la edición, admite teclado decimal y formatea con separadores argentinos al salir si es válido. `onChange` recibe el texto, no un evento. Reutiliza etiqueta, ayuda y error de `Field`; no calcula ni guarda presupuestos. `parseCurrencyInput` devuelve `null` para un valor inválido; el consumidor debe validarlo antes de enviar. En esta API los importes admiten hasta 10 enteros y 2 decimales.
- Configuración muestra estas opciones dentro de secciones abiertas, con una barra de cambios pendientes. No reutilizar la confirmación de guardado como sustituto de la validación del servidor.

## Componentes del registro de gastos

- `ExpenseReceipt({ expenses, onOpen, onClose })` es un componente de dominio que recibe exclusivamente gastos confirmados por la API. Presenta descripción, importe y fecha para un gasto o la cantidad confirmada para un lote, y acceso al detalle. No crea una confirmación a partir del borrador ni estima un reparto del servidor.
- `ExpenseForm` y `ExpenseBatchForm` admiten `onDraftChange`, `draftLocation` e `initialValues`. El lote recibe `{ gastos, removed }`; los borradores conservan las entradas del selector de participantes además del reparto calculado. `onSuccess` se ejecuta solo después del éxito de la API. Sin gestión de borrador externa siguen funcionando como formularios independientes.
- `ParticipantsSelector` admite `initialSelection` para restaurar selección, porcentajes e importes incompletos. La modalidad proporcional permite elegir participantes y explica que el reparto se calcula al registrar; no muestra una cuota local como si fuera el resultado del servidor.
- `ExpenseDetail` acepta `onRepeat`; ofrece la acción cuando el detalle está disponible. Un gasto pendiente significa pendiente de liquidar, no un pago personal pendiente.

## Confirmación de varios gastos

`BatchExpenseBreakdown({ expenses, members })` es un componente del dominio de gastos. Recibe la instantánea confirmable y los miembros, y reutiliza `PanelDisclosure`, `Icon`, `Avatar` y `Money`. No calcula repartos ni modifica el borrador. Empieza cerrado, conserva apertura nativa con teclado y organiza cada gasto con su contexto, importe completo y participantes. El reparto proporcional explica el cálculo pendiente una sola vez por gasto; los demás muestran sus importes estimados y, cuando corresponde, porcentajes. Los nombres e importes se distribuyen sin recortarlos.

El editor termina con “Registrar N gastos”. `ExpenseBatchForm` valida y conserva una instantánea antes de abrir `Modal` con el título “Confirmar registro”, la cantidad, el espacio y el total. El desglose se mantiene cerrado en `Disclosure`; consultarlo es opcional. Los duplicados se advierten siempre y requieren “Registrar de todos modos”. Solo la confirmación envía la instantánea; cancelar o fallar conserva el borrador.

## Notification

`UIProvider` muestra hasta tres notificaciones con cierre manual y automático a los cinco segundos. Cada aviso tiene un temporizador independiente. El tiempo se pausa con el cursor encima o mientras un control del aviso tiene foco, y retoma el tiempo restante al salir. Los temporizadores se limpian al quitar o desmontar avisos. Los errores de formularios y las confirmaciones de acciones permanecen en sus propios componentes.

## ExpensePagination

Componente de Gastos en `src/features/gastos/ExpensePagination.jsx`, compuesto con `Button`, `Icon` y selectores nativos. Recibe `total`, `page`, `pageSize`, `onPageChange`, `onPageSizeChange` y `listId`. El padre controla el filtrado, orden por fecha reciente e ID, selección de filas, URL y restauración del contexto. Presenta “Mostrando X–Y de N gastos” como estado accesible, cantidades 10/20/50 y, cuando hay más de una página, navegación anterior/siguiente y selector directo de página. Los extremos se deshabilitan. No se muestra para resultados vacíos ni errores; carga y errores pertenecen al recurso de Gastos. Usar `aria-controls` con el ID del listado y devolver el foco a su comienzo después de paginar.

Los selectores del paginado conservan el control nativo para teclado y menú. La flecha decorativa usa `Icon`, separada 12px del borde; el campo reserva 40px al final para evitar que el texto se superponga con ella.

## ExpenseCategoryPicker

`src/features/gastos/ExpenseCategoryPicker.jsx`: recibe `value` (ID real de categoría o `null`), `onChange` (categoría elegida), `categories` (recurso compartido con `data`, `loading`, `error` y `reload`), `description`, `category`, `disabled`, `compact` y `label`. La variante compacta se usa por gasto en la carga de varios; ambas reutilizan `Button`, `Icon` y `Modal`. Consulta `GET /api/v1/categorias` y guarda `categoriaId`; el ícono se asigna por nombre de categoría. Elegir o cancelar devuelve el foco al disparador. La carga, error con reintento y catálogo vacío mantienen el formulario disponible.

`expenseIcon(category, description, selected)` prioriza la categoría confirmada sobre valores antiguos de `icono`. Sin categoría conserva la representación anterior. Los detalles, el resumen y el desglose usan la misma resolución.
