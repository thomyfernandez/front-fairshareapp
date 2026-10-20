# Demostración con JSON locales

Desde la carpeta del frontend:

```bash
npm install
npm run start:mock
```

Vite muestra la URL disponible (por defecto `http://localhost:5173`). No requiere Java, base de datos ni configurar `.env`. El login trae completados `demo@fairshare.test` / `FairShare123!` para Ana Ruiz. Son credenciales ficticias de demostración. También se puede ingresar con `thomas@example.test` y la misma contraseña para probar el rol de miembro.

`npm run dev` y `npm run build` conservan el funcionamiento con la API Java. El motor de simulación solo se selecciona con el modo Vite `mock`; ese modo desactiva el proxy `/api` y no contacta al backend, aunque haya una URL de API configurada.

## Cómo se alimenta la interfaz

La interfaz conserva sus pantallas, servicios, requests y manejo de errores. `src/api.js` selecciona un transporte de demostración que realiza peticiones HTTP a `/data/index.json` y a los 42 archivos JSON declarados allí. Los archivos están en `public/data/`; no se importan como constantes JavaScript.

Cada archivo de datos contiene directamente un DTO de respuesta o su array, sin agregar envoltorios, propiedades de UI ni nombres alternativos. `index.json` es únicamente el manifiesto del cargador y no representa un DTO de endpoint. `src/mocks/contracts.json` conserva los campos y tipos de los DTOs Java, incluidos los DTOs anidados y los enums.

El conjunto incluye **6 espacios, 12 personas, 31 membresías, 485 gastos, 48 plantillas, 43 cierres y 72 registros de ingresos**. Los gastos y los ingresos se distribuyen entre mayo y octubre de 2026, con distintos pagadores, categorías, repartos equitativos, parciales, proporcionales y personalizados (porcentajes y montos fijos). Hay gastos pendientes y liquidados, plantillas vigentes y vencidas, historial de cierres y presupuestos distintos. La fecha de referencia del conjunto es **19 de octubre de 2026**: en otra fecha, elegí octubre de 2026 para explorar esos gastos. Las revisiones vencidas se evalúan con la fecha real del navegador.

## Espacios y escenarios disponibles

| Espacio | Integrantes | Rol de Ana | Código |
| --- | --- | --- | --- |
| Nuestro hogar | 4 | Administradora | `CASA-2026` |
| Viaje al sur | 6 | Administradora | `VIAJE-2026` |
| Oficina compartida | 5 | Miembro | `OFICINA-2026` |
| Equipo de fútbol | 8 | Administradora | `EQUIPO-2026` |
| Proyecto final | 6 | Miembro | `PROYECTO-2026` |
| Planes en pareja | 2 | Administradora | `PAREJA-2026` |

La oficina tiene un presupuesto reducido para probar el aviso de fondos insuficientes al ingresar con un administrador (por ejemplo, `sol@example.test`). Todas las cuentas precargadas usan la misma contraseña ficticia indicada arriba. Los códigos sirven para probar la unión desde una cuenta nueva de demostración.

## Contrato de los archivos

Las rutas de la tabla tienen el prefijo `/api/v1`. `{id}` va de 1 a 6 en los espacios precargados.

| Archivo en `public/data/` | Respuesta Java | Endpoint representado |
| --- | --- | --- |
| `login.json` | `LoginResponse` | `POST /usuarios/login` |
| `usuarios.json` | `UsuarioResponse[]` | `GET /usuarios` |
| `espacios.json` | `EspacioResponseDTO[]` | `GET /espacios` |
| `sueldos.json` | `SueldoResponse[]` | `GET /sueldos?usuarioId=...` (filtrado por usuario en la simulación) |
| `miembros-1.json` a `miembros-6.json` | `MiembroResponseDTO[]` | `GET /espacios/{id}/miembros` |
| `gastos-1.json` a `gastos-6.json` | `GastoDetalleDTO[]` | `GET /espacios/{id}/gastos` |
| `balance-1.json` a `balance-6.json` | `BalanceDTO` | `GET /espacios/{id}/balance` |
| `recurrentes-1.json` a `recurrentes-6.json` | `PlantillaGastoResponseDTO[]` | `GET /espacios/{id}/favoritos` |
| `liquidaciones-1.json` a `liquidaciones-6.json` | `LiquidacionResponseDTO[]` | `GET /espacios/{id}/liquidaciones/historial` |
| `vencimientos-1.json` a `vencimientos-6.json` | `ServicioVencimientoDTO[]` | `GET /espacios/{id}/favoritos/vencimientos` |
| `error.json` | `ErrorResponseDTO` | Ejemplo de respuesta de error |

El balance y los vencimientos se calculan a partir de los datos cargados para reflejar las operaciones posteriores; los archivos de ejemplo respectivos también se validan contra sus DTOs. Los ingresos agregados en el archivo se filtran para devolver únicamente los del usuario autenticado.

## Interacciones disponibles y reinicio

El motor mantiene una copia en memoria de los JSON. Permite iniciar sesión, registrar una cuenta de prueba, crear/unirse/editar espacios, cambiar roles, consultar y declarar ingresos, registrar gastos individuales o varios juntos, eliminarlos cuando corresponde, registrar pagos, administrar plantillas y cerrar liquidaciones. Los listados admiten los filtros usados por las pantallas. Se simulan validaciones, permisos de administrador, reparto y redondeo, presupuesto insuficiente y plantillas vencidas.

**Al recargar la página se vuelve al conjunto inicial de JSON y se solicita iniciar sesión de nuevo.** Las operaciones no escriben archivos, no usan la base de datos y no generan pagos reales. Los borradores de formularios conservan su comportamiento habitual de guardado por pestaña; son independientes de los movimientos simulados.

La autenticación utiliza tokens opacos ficticios en memoria, sin JWT firmado, caducidad real ni servicio de seguridad. Es una simulación de los flujos del frontend, no un reemplazo de todas las reglas, transacciones, concurrencia o seguridad del backend. Un endpoint no implementado devuelve un error local y nunca deriva la petición a Java. Un JSON inválido muestra un error de carga en vez de sustituirlo por datos inventados.

## Verificación y mantenimiento

Los JSON ampliados ya están guardados: `start:mock` no necesita regenerarlos. Para reconstruir exactamente el conjunto inicial después de editar los ejemplos:

```bash
npm run mock:generate
```

Este comando **sobrescribe los JSON de demostración** con el conjunto reproducible definido en `scripts/generate-mock-data.mjs`. No modifica datos del backend. Las fechas son fijas para que la entrega sea consistente. El generador reutiliza el cálculo de reparto de la simulación y produce los balances y los cierres relacionados; las pruebas verifican los IDs, relaciones, sumas, presupuestos y balance resultante de cada espacio.


```bash
# Valida los 42 archivos contra la copia del contrato incluida en el frontend.
npm run mock:check

# Además contrasta campos, tipos y enums con los fuentes del backend hermano.
npm run mock:check:java

# Si el backend está en otra ubicación:
npm run mock:check -- --backend /ruta/al/fairshareapp

# Pruebas de los flujos y contratos simulados.
npm test -- src/test/mock-data.test.js
```

El chequeo rechaza campos faltantes o adicionales, tipos incorrectos, enums desconocidos y fechas con formato incorrecto. Respeta los campos opcionales de `ErrorResponseDTO`. El contraste con Java lee los DTOs y enums del backend; si cambian, hay que revisar el contrato, los JSON y el motor antes de actualizar la copia. No modifica el backend ni genera contratos automáticamente a partir de los ejemplos.

Para editar ejemplos, conservá los nombres exactos (`regla`, `categoriaNombre`, `gastosLiquidadosIds`, etc.), los importes como números JSON, las fechas `yyyy-MM-dd`, los enums Java y las relaciones entre IDs. Ejecutá ambos chequeos y las pruebas después de cambiar datos o contratos.

Los archivos de `public/` son públicos y Vite también los copia al build normal. Contienen exclusivamente datos ficticios y no deben incluir secretos ni datos personales reales. El build normal excluye el motor de demostración de su JavaScript.

## Ícono opcional del gasto

`CrearGastoDTO` acepta `icono` y `GastoDetalleDTO` lo devuelve como `IconoGasto` o `null`. El motor valida el mismo catálogo de Java y mantiene la elección al registrar y consultar. El generador incluye elecciones explícitas y gastos automáticos; el contrato local incluye el enum y se contrasta con Java. Para usar esta función contra una instancia Java ya iniciada, reiniciala con los fuentes actualizados. Los datos anteriores conservan el valor nulo y su ícono automático.


## Avatares de cuenta

Los DTOs `UsuarioResponse` y `MiembroResponseDTO` incluyen `avatarId` (`String` o `null`). Los JSON locales contienen ejemplos del catálogo y cuentas con iniciales. `PATCH /api/v1/usuarios/me/avatar` exige sesión y el campo explícito `avatarId`, acepta solo el catálogo o `null`, y modifica exclusivamente al usuario autenticado. Login, `/me` y consultas de miembros devuelven la elección actual, también desde otra sesión. La simulación mantiene el cambio en memoria hasta recargar; no usa `localStorage` ni pretende persistir en Java.

## Categorías

`categorias.json` contiene el catálogo `CategoriaResponseDTO[]` (`id`, `nombre`) y alimenta `GET /api/v1/categorias`. Elegir una categoría guarda `categoriaId`; el motor devuelve el nombre del catálogo y rechaza IDs inexistentes con 404, también de forma atómica en registros múltiples. El ícono visible depende de la categoría, con prioridad sobre el campo legado `icono`. En Java el catálogo se completa al iniciar sin reemplazar categorías existentes; reiniciar el backend para activar el nuevo endpoint.
