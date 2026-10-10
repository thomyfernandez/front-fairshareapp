# Guía de trabajo para agentes — FairShare Frontend

## Alcance y prioridades

Estas instrucciones se aplican a todo el repositorio `front-fairshareapp` y a cualquier agente que lo modifique. `AGENTS.md` y `CLAUDE.md` deben conservar exactamente el mismo contenido; actualizar ambos juntos.

- Priorizar, por sobre todo, la calidad de UX/UI: cada pantalla debe ayudar al usuario a comprender su situación y completar una tarea con claridad y confianza.
- Mantener siempre seguridad, accesibilidad, integridad de los datos y corrección funcional. La simplificación visual no debe ocultar información necesaria para tomar decisiones.
- Seguir obligatoriamente `DESIGN_SYSTEM.md` y diseñar con un enfoque **mobile first**, con una experiencia responsive prolija y amigable.
- Aplicar buenas prácticas y respetar la arquitectura, los patrones y las convenciones existentes. Implementar soluciones simples, mantenibles y proporcionales al problema.
- Leer las instrucciones aplicables y revisar los archivos relacionados antes de modificar código. Las instrucciones explícitas del usuario tienen prioridad sobre esta guía.

## Sistema de diseño obligatorio

- Leer `DESIGN_SYSTEM.md` antes de crear o modificar interfaces. Consultar los componentes existentes y la galería `/componentes` para mantener consistencia.
- Usar `tokens.json` como fuente de valores visuales: colores, tipografía, espaciado, radios y sombras. Consumir las variables y utilidades semánticas del tema, evitando valores arbitrarios cuando exista un token adecuado.
- No editar directamente `src/styles/theme.css`: es un archivo generado. Modificar los tokens y ejecutar `npm run tokens:build`; verificar con `npm run tokens:check`.
- Mantener el tema claro, la fuente Inter local y las reglas de contraste y movimiento definidas en el sistema de diseño.
- Usar índigo para acciones principales, enlaces y foco. Reservar verde para pago rápido y estados positivos, según `DESIGN_SYSTEM.md`.
- No usar `text-tertiary` para texto pequeño esencial sobre blanco. Utilizar colores semánticos con contraste suficiente.
- Reutilizar y, cuando corresponda, extender los componentes de `src/components/ui` antes de crear alternativas. Evitar variantes de botones, campos, tarjetas y modales que resuelvan lo mismo de maneras distintas.
- Si hace falta una nueva variante o token, justificar su necesidad, integrarlo de manera reutilizable y documentarlo en `DESIGN_SYSTEM.md`. No rediseñar el sistema visual incidentalmente.

## UX/UI y cantidad de información

- Definir la tarea principal de cada pantalla y organizar el contenido alrededor de ella. Mantener una jerarquía clara entre título, información esencial, acción principal y detalles secundarios.
- Evitar páginas con información excesiva que abrumen al usuario. No convertir cada vista en un panel con todas las métricas, formularios, tablas y explicaciones disponibles.
- Mostrar primero un resumen útil y revelar el detalle cuando se necesite, mediante navegación, secciones expandibles o vistas específicas. Elegir el recurso según la tarea, sin esconder acciones esenciales.
- Destacar una acción principal por contexto; dar menor peso visual a acciones secundarias y separar claramente las destructivas.
- Usar espacio en blanco, agrupaciones lógicas y textos breves. Evitar tarjetas, gráficos, banners y decoración que no ayuden a comprender o decidir.
- Mantener etiquetas, patrones de navegación e interacciones consistentes. El usuario debe reconocer el espacio activo, su ubicación y el siguiente paso.
- Escribir textos visibles en español claro y coherente con el tono existente. Explicar conceptos financieros cuando haga falta, sin mostrar detalles técnicos internos.
- Diferenciar claramente cuánto debe el usuario, cuánto le deben, quién paga y qué período o espacio se está consultando. No depender de signos o colores para explicar un balance.
- Reducir pasos y solicitudes de datos innecesarias. Aprovechar valores ya disponibles y valores predeterminados seguros, permitiendo revisarlos antes de confirmar.
- No inventar datos, balances ni mensajes de éxito para completar una pantalla. Mostrar estados honestos y ofrecer una acción útil cuando no haya información.

## Mobile first y responsive obligatorio

- Diseñar primero para pantallas pequeñas y ampliar progresivamente la distribución cuando el contenido lo requiera. No limitarse a reducir una interfaz de escritorio.
- Mantener legibilidad, espaciado y acceso a todas las acciones en móvil, tablet y escritorio. No resolver el responsive ocultando funcionalidades necesarias.
- Evitar anchos rígidos, texto cortado, superposiciones y desplazamiento horizontal de la página. Adaptar listados y tablas con tarjetas o un contenedor de desplazamiento localizado cuando el dato lo requiera.
- Adaptar navegación, formularios y modales a pantallas pequeñas. Las cabeceras o acciones fijas no deben cubrir contenido, mensajes o controles, incluso con el teclado virtual abierto.
- Respetar controles de al menos 44px de alto según el sistema de diseño, con áreas táctiles y separación adecuadas. No depender de hover para descubrir o ejecutar acciones.
- Permitir que etiquetas, importes, nombres largos y mensajes de error se distribuyan sin romper el diseño. Conservar el orden lógico de lectura al cambiar de tamaño.
- Verificar visualmente las vistas modificadas al menos en 360px, 390px, 768px y 1280px, además de los puntos donde cambia la distribución. Usar esos anchos como referencia de revisión, no como una lista rígida de breakpoints.

## Accesibilidad e interacción

- Usar HTML semántico: botones para acciones, enlaces para navegación, encabezados con jerarquía lógica y etiquetas asociadas a cada campo.
- Permitir completar los flujos con teclado y mantener foco visible. Los controles con solo un ícono deben tener un nombre accesible.
- No comunicar estado únicamente con color o íconos. Acompañar errores, advertencias y confirmaciones con texto comprensible.
- En modales, gestionar foco inicial, recorrido del foco, cierre por teclado cuando corresponda y retorno al control que los abrió. Reutilizar el componente compartido.
- Respetar `prefers-reduced-motion` y las transiciones de 150–200ms del sistema. Evitar movimiento que distraiga, cambie el layout o dificulte la interacción.
- Mantener la interfaz utilizable con zoom al 200% y texto ampliado. No usar tamaños de fuente pequeños para hacer entrar más información.

## Formularios y estados de la aplicación

- Mantener formularios breves, con etiquetas persistentes, tipos de entrada apropiados y ayudas solo donde aporten valor. No usar el placeholder como única etiqueta.
- Validar entradas y mostrar errores cerca del campo correspondiente, explicando cómo corregirlos. Conservar lo ingresado ante errores recuperables.
- Contemplar carga, vacío, éxito, error y falta de permisos. Diferenciar una lista vacía de una solicitud fallida y ofrecer reintento cuando corresponda.
- Evitar envíos duplicados e indicar con claridad cuándo una operación está en curso. Mostrar éxito únicamente después de la confirmación real del servidor.
- Para pagos, cierres y eliminaciones, presentar el importe, el alcance y las consecuencias antes de confirmar. Aplicar confirmaciones proporcionales a la acción.
- Después de una operación, actualizar los datos relacionados sin perder innecesariamente filtros, contexto de navegación o posición de lectura.

## Código, arquitectura e integración

- El proyecto usa React, Vite, React Router, Tailwind CSS v4, Oxlint y Vitest. Revisar `package.json` para comandos y versiones reales antes de proponer cambios.
- Mantener las funcionalidades en `src/features`, la navegación y el contexto global en `src/app`, los componentes compartidos en `src/components/ui`, los hooks en `src/hooks` y los utilitarios en `src/lib`.
- Usar componentes funcionales y hooks con responsabilidades claras. Dividir componentes cuando tengan varias responsabilidades, evitando abstracciones prematuras.
- Mantener el estado cerca de donde se utiliza y evitar duplicar datos derivados. Usar efectos para sincronización externa y memoización solo cuando aporte una mejora concreta.
- Centralizar la comunicación HTTP en `src/api.js` y reutilizar los hooks de recursos existentes. Manejar cancelación y respuestas obsoletas al cambiar de espacio, ruta o sesión.
- Respetar el contrato real de la API, sus permisos y errores. No inventar endpoints ni reemplazar validaciones del servidor con controles de interfaz.
- Reutilizar `src/lib/format.js` para moneda y fechas. Mantener el formato `es-AR` y la moneda definida por el producto; evitar errores de redondeo y desplazamientos de fechas por zona horaria.
- El backend es la autoridad para balances, repartos y liquidaciones. Los cálculos locales deben ser consistentes y distinguir una estimación de un resultado confirmado.
- No exponer tokens, contraseñas, ingresos personales ni datos sensibles en logs o mensajes de error. Preservar el manejo de sesión existente; no persistir credenciales en almacenamiento del navegador sin una decisión explícita de arquitectura.
- Evitar dependencias nuevas sin necesidad justificada, código muerto, imports sin uso, logs de depuración y refactorizaciones ajenas a la tarea. Comentar decisiones complejas y su motivo, sin describir cada línea.
- Cuidar el rendimiento: evitar solicitudes duplicadas, cargas innecesarias y listados sin límites. Incorporar paginación o carga incremental cuando el volumen lo justifique.

## Validación y entrega

- Para cambios de código, ejecutar las verificaciones pertinentes: `npm run lint`, `npm test`, `npm run tokens:check` y `npm run build`. Priorizar primero las pruebas afectadas; no repetir verificaciones exitosas sin cambios o motivos nuevos.
- Añadir o actualizar pruebas cuando cambie comportamiento relevante, especialmente pagos, formularios, permisos, navegación y estados asíncronos. Probar lo que experimenta el usuario, evitando pruebas que solo reproduzcan la implementación.
- Para cambios visuales, revisar en el navegador el responsive, el teclado, el foco y los estados afectados. Una compilación exitosa no reemplaza la revisión de UX/UI.
- No dar por terminado un cambio de interfaz con desbordes, controles inaccesibles, texto ilegible, inconsistencias del sistema de diseño o una cantidad de información que dificulte la tarea principal.
- Actualizar `README.md` y la documentación relacionada cuando cambien instalación, comandos, flujos, contratos o convenciones. Mantener ambos archivos de instrucciones idénticos.
- Respetar los cambios existentes del usuario. No sobrescribir trabajo ajeno ni crear commits, ramas, publicaciones o despliegues sin una solicitud que los autorice.
- Al entregar, explicar brevemente qué cambió, cómo beneficia al usuario, qué se verificó y cualquier limitación real. No afirmar que se ejecutaron pruebas o revisiones visuales si no se realizaron.
