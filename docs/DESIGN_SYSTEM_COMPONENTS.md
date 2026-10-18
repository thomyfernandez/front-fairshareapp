# Catálogo de componentes · Cercana

Este catálogo define qué hace cada componente, qué información recibe y cuándo usarlo. La implementación compartida vive en `src/components/ui`; se importa desde su `index.js`. La galería `/componentes` permite revisar los componentes reales y una composición del futuro resumen con datos de demostración.

## Fundamentos y límites

- `tokens.json` es la fuente de valores; `src/styles/theme.css` se genera con `npm run tokens:build`. No mantener una segunda paleta en componentes o páginas.
- `src/styles/summary-components.css` define los componentes de Cercana; `src/styles/design-system.css` solo organiza el catálogo. Las páginas reales no deben depender de clases `ds-*`.
- Los componentes presentan información y emiten intenciones mediante callbacks. Los hooks y modelos de cada funcionalidad conservan consultas, permisos, cálculos, mutaciones e invalidación de recursos.
- El resumen y la galería usan el tema oscuro del prototipo; el resto conserva el tema claro durante la migración. Ambos comparten Inter local, texto legible, foco de marca, controles de al menos 44px y movimiento reducido. Las cifras no se truncan con puntos suspensivos.
- No usar `Money` con datos ausentes: su formato histórico interpreta entradas no numéricas como cero. Los nuevos patrones financieros validan sus importes antes de renderizarlo.

## Componentes base existentes

| Componente | Responsabilidad | Variantes y reglas |
| --- | --- | --- |
| `Button` | Ejecutar una acción. | `primary`, `secondary`, `ghost`, `danger`; `loading` impide envíos repetidos. Una acción principal por contexto. Para navegar, usar un enlace con las clases equivalentes. |
| `Field` | Etiqueta persistente, campo, ayuda y error asociados. | Reutilizarlo para entradas y selectores. `Checkbox` y `PasswordField` cubren sus controles específicos. |
| `Modal` | Presentar detalle o confirmación sin perder contexto. | Reutiliza la gestión existente de foco, Escape, cierre y retorno al disparador. No usarlo para mensajes breves. |
| `Badge` | Estado corto y complementario. | `neutral`, `brand`, `success`, `warning`, `error`, `info`. Nunca reemplaza una explicación financiera ni funciona como botón. |
| `PageHeader` | Título principal, contexto y acciones de una página. | Un encabezado principal por pantalla. No repetir el nombre del espacio en varias tarjetas. |
| `LoadingState`, `ErrorState`, `EmptyState` | Comunicar estados de un recurso. | Una consulta fallida no es una lista vacía. El error ofrece reintento; el vacío ofrece una acción útil cuando corresponde. |
| `InlineAlert` | Explicar una consecuencia o un resultado junto al flujo. | Reservar `error` para errores; no reemplazarlo por un color o un ícono sin texto. |

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

El generador de tokens incluye `themes.dark`. `AppLayout` aplica el tema en la raíz para que la confirmación de pagos, los detalles y el menú móvil mantengan el mismo contraste y apariencia. La navegación compacta conserva las funciones secundarias dentro de Más.
