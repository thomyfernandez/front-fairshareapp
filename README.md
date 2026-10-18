# FairShare App - Frontend

Aplicacion cliente web para la plataforma de gestion inteligente y liquidacion transparente de gastos compartidos FairShare. Desarrollada con React 19 y empaquetada mediante Vite.

---

## Descripcion General

El frontend de FairShare proporciona una interfaz de usuario interactiva y responsiva disenada para permitir a grupos de usuarios (convivencia, viajes, parejas o proyectos) administrar sus finanzas compartidas en tiempo real. 

Consume los servicios de la API REST de FairShare mediante comunicacion asincrona y autenticacion por token JWT Bearer, brindando soporte integral para la gestion de espacios, reparto equitativo y proporcional de gastos, compensacion automatica de deudas y checkout de liquidaciones periodicas.

---

## Tecnologias Utilizadas

- **Framework**: React 19 (Componentes Funcionales y Hooks modernos: useState, useEffect, useCallback)
- **Herramienta de Construccion y Empaquetado**: Vite (desarrollo rapido con Hot Module Replacement)
- **Estilos**: Tailwind CSS v4, tokens DTCG 2025.10, variables CSS y fuente Inter local; tema documentado en [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Linter de Codigo**: Oxlint
- **Servidor Web de Produccion**: Nginx en contenedor Docker (imagen ligera basada en Alpine Linux)

---

## Funcionalidades de la Interfaz

1. **Autenticacion y Perfil de Usuario**:
   - Registro con validacion junto a cada campo; al crear la cuenta se vuelve al login con el email completado.
   - Mensajes claros para email ya registrado (409), credenciales incorrectas (401), errores del servidor y falta de conexion.
   - Inicio de sesion con JWT en memoria; recargar requiere autenticarse nuevamente.
   - Cierre de sesion desde el menu de usuario y aviso de sesion vencida (al recibir 401 o al llegar el `exp` del token).
   - No se ofrece recuperacion de contrasena porque el backend todavia no la implementa.
   - Pantallas en `src/features/auth`: `LoginPage`, `RegisterPage`, `AuthLayout`, `UserMenu` y `SessionProvider`.

2. **Gestion de Espacios Compartidos**:
   - Creacion de nuevos espacios con asignacion de regla de reparto (Equitativa vs. Proporcional a Ingresos) y presupuesto base.
   - Union a espacios existentes mediante codigo de invitacion unico.
   - Administracion de miembros y asignacion de roles (ADMIN / MIEMBRO).

3. **Ingresos y Capacidad Economica**:
   - Declaracion de sueldos mensuales para el calculo de distribuciones proporcionales equitativas segun ingresos.

4. **Registro y Clasificacion de Gastos**:
   - Carga de gastos individuales y por lote con seleccion de pagador y desglose automatico entre participantes.
   - Consulta del listado historico de gastos con filtrado por rango de fechas.

5. **Matriz de Balances y Deudas Simplificadas**:
   - Visualizacion consolidada del balance del grupo y representacion grafica de deudas pendientes.
   - Registro de pagos totales o parciales para saldar deudas directamente desde la interfaz.

6. **Plantillas de Gastos Recurrentes (Favoritos)**:
   - Administracion de servicios fijos y variables (alquiler, expensas, conectividad).
   - Alertas visuales sobre vencimiento de ciclos tarifarios que requieren revision de montos.
   - Ejecucion rapida de gastos con un solo clic a partir de plantillas precargadas.

7. **Cierre de Liquidaciones (Checkout)**:
   - Panel de checkout mensual para liquidar gastos pendientes validando el presupuesto base disponible.
   - Historial de cierres de liquidacion filtrable por anio y mes.

---

## Requisitos Previos

- **Node.js**: Version 22.12 o superior (compatible con Vite 8; recomendado Node.js 22 LTS).
- **npm**: Version 9.0.0 o superior (incluido con la instalacion de Node.js).
- **Backend FairShare**: Servidor Spring Boot activo en `http://localhost:8080`.

---

## Instalacion y Puesta en Marcha

### 1. Clonar o acceder al proyecto
```bash
cd front-fairshareapp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configuracion de Variables de Entorno (Opcional)
El proyecto cuenta con un archivo `.env.example`. Si la API REST se ejecuta en un host o puerto distinto al predeterminado (`http://localhost:8080`), se puede generar un archivo local `.env`:
```bash
cp .env.example .env
```
Contenido predeterminado de `.env.example`:
```ini
API_PROXY_TARGET=http://localhost:8080
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
La aplicacion estara disponible inmediatamente en:
- **`http://localhost:5173`**

Durante el desarrollo, Vite intercepta todas las peticiones a rutas relativas `/api/*` y las reenvia transparentemente al backend, evitando cualquier inconveniente relacionado con CORS.

---

## Comandos Disponibles

| Comando | Descripcion |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con recarga en caliente (HMR) en el puerto 5173 |
| `npm run build` | Compila y optimiza la aplicacion para produccion, generando los artefactos estaticos en `dist/` |
| `npm run preview` | Levanta un servidor local para previsualizar los archivos compilados en `dist/` |
| `npm run lint` | Ejecuta el analisis estatico de codigo con Oxlint para garantizar calidad y consistencia |

---

## Despliegue con Docker

El proyecto incluye un `Dockerfile` optimizado en dos fases (multi-stage build):
- **Fase de construccion**: Compila los fuentes de React mediante Node.js Alpine.
- **Fase de produccion**: Aloja los archivos estaticos en un servidor Nginx Alpine ultraligero con reglas de reescritura para Single Page Application (`nginx.conf`).

### Construccion de la imagen
```bash
docker build -t front-fairshareapp .
```

### Ejecucion del contenedor
```bash
docker run -d -p 3000:80 --name front-fairshareapp front-fairshareapp
```
La aplicacion estara accesible en el navegador en `http://localhost:3000`.

---

## Estructura de Directorios

```text
front-fairshareapp/
├── public/                 # Recursos publicos estaticos e iconos SVG
│   ├── favicon.svg
│   └── icons.svg
├── src/                    # Codigo fuente de la aplicacion
│   ├── assets/             # Imagenes y logotipos
│   ├── api.js              # Modulo centralizado de comunicacion HTTP con la API REST
│   ├── App.jsx             # Componente principal con logica de vistas y estado
│   ├── App.css             # Estilos de componentes, formularios y tablas
│   ├── index.css           # Estilos base, reinicio CSS y variables globales
│   └── main.jsx            # Punto de entrada de React y montaje en el DOM
├── .dockerignore           # Exclusiones de contexto para Docker
├── .env.example            # Ejemplo de configuracion de entorno
├── .gitignore              # Exclusiones del control de versiones Git
├── .oxlintrc.json          # Reglas del analizador de codigo Oxlint
├── Dockerfile              # Definicion de contenedor multicapa para despliegue
├── index.html              # Plantilla HTML raiz
├── nginx.conf              # Configuracion de enrutamiento Nginx para SPA
├── package.json            # Declaracion de dependencias y scripts de ejecucion
├── package-lock.json       # Bloqueo de versiones de dependencias
├── vite.config.js          # Configuracion de Vite y proxy reverso para la API
└── README.md               # Documentacion tecnica del frontend
```

## Sistema de diseño

La dirección visual es **Cercana**, con el tema oscuro del prototipo en todas las pantallas: un balance protagonista, información agrupada por tarea y detalles a demanda. La fuente de valores es `tokens.json`. Consultá [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) para la paleta, las utilidades y las reglas de uso, y el [catálogo de componentes](./docs/DESIGN_SYSTEM_COMPONENTS.md) para sus contratos y estados. `/componentes` incluye fundamentos, una composición de referencia del resumen y ejemplos interactivos de deuda, cobro, saldos simultáneos, carga y error. Todos usan datos de demostración; las pantallas reales utilizan estos componentes con sus datos y flujos existentes. El tema se genera automáticamente antes de iniciar o compilar; `npm run tokens:build` lo actualiza y `npm run tokens:check` comprueba su sincronización.

## Arquitectura y componentes compartidos

Consultá [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) para las rutas, responsables por carpeta, estados de datos y contratos de integración. La galería interactiva está en `/componentes` después de iniciar sesión. Para verificar la base: `npm test`, `npm run lint`, `npm run tokens:check` y `npm run build`.

### Dashboard y navegación

El selector de espacio está debajo del logo y permite cambiar de grupo o crear uno. Dentro de cada espacio, la navegación muestra Inicio, Gastos, Balance, Recurrentes y Liquidaciones en el grupo principal; Miembros y Configuración quedan visibles en un segundo grupo. Mis ingresos, cuenta y espacios están al pie; en móvil se accede desde “Abrir navegación”. Todo el producto comparte el tema oscuro, incluidos acceso, registro, detalles y confirmaciones. En Mis espacios e ingresos la navegación muestra los destinos de cuenta. No hay un desplegable Más: todos los destinos del espacio están visibles. Los filtros y formularios conservan sus contratos. El presupuesto, los datos de espacios y la edición de recurrentes reutilizan PanelDisclosure; las filas de gastos comparten categorías, foco y hover completo.

El resumen aplica la dirección Cercana: un balance personal protagonista, actividad del mes en una sección abierta y avisos solo cuando hay tareas reales. El saldo aparece una sola vez por concepto; si hay dinero por pagar y por cobrar se muestran ambos, aunque su neto sea cero. El selector de mes solo filtra los gastos. Cada fila abre el detalle existente, y registrar un pago conserva la elección de deuda, el importe total o parcial y la confirmación antes de actualizar los datos. Las plantillas vencidas enlazan a su revisión; las invitaciones se gestionan desde Miembros.

El presupuesto se consulta desplegando “Presupuesto del espacio”. Representa el saldo acumulado actual, que el backend descuenta al liquidar, y no un límite mensual. La estimación utiliza solo gastos pendientes del mes seleccionado, no vuelve a descontar gastos liquidados y no reserva fondos ni incluye pendientes de otros meses. Si los pendientes superan el saldo, se muestra un aviso visible antes de abrir el detalle.

### Liquidaciones

La pantalla separa **Pendientes** e **Historial** con pestañas accesibles. Los pendientes se agrupan por mes y cada fila completa permite seleccionar el gasto. El resumen lateral muestra total, período contable, nota opcional y saldo estimado; en móvil se apila debajo. El período del cierre usa un campo de mes y año entre 2000 y 9999 y puede incluir gastos de meses anteriores. La selección, la nota y el período se conservan al consultar el historial.

El botón Revisar cierre abre el desglose exacto antes de enviar el POST existente. Se bloquea un cierre sin presupuesto confirmado, con importes no disponibles o insuficientes; si los datos cambian durante la revisión, se exige revisarlos otra vez. Los conflictos recargan los datos conservando la nota. El historial muestra filtros a demanda cuando hay cierres o un filtro activo, y distingue una búsqueda sin resultados de un historial que todavía no tiene cierres. `vista=historial` permite entrar directamente al historial; sus filtros existentes permanecen en la URL.

## Configuración del espacio

La pantalla separa datos básicos, modalidad de reparto, saldo disponible, invitación y eliminación. Los administradores pueden editar; los miembros consultan los valores y la invitación. No se muestran filtros ni pestañas para estas opciones.

El guardado indica cambios pendientes, permite descartarlos y envía únicamente campos modificados en el `PUT /api/v1/espacios/{id}?solicitanteId={usuarioId}` existente. El DTO admite campos opcionales: cambiar el nombre no vuelve a enviar un presupuesto anterior. El saldo usa formato es-AR (puntos para miles y coma para centavos), admite cero y valida el límite de 10 enteros y 2 decimales del backend. Guardarlo reemplaza el saldo actual; no suma fondos ni establece un presupuesto mensual. Cambios de saldo o modalidad se revisan antes de enviarse; si esos datos cambian durante la revisión, se exige revisarlos nuevamente. Los errores conservan lo ingresado y solo una respuesta exitosa produce confirmación.

La invitación prioriza copiar el enlace de ingreso y conserva las alternativas de código y compartir a demanda. La eliminación permanece separada y requiere confirmación con su alcance. `ChoiceCards` y `CurrencyField` se documentan y muestran con datos de ejemplo en `/componentes`.

### Contexto al navegar a Mis ingresos

`/ingresos` sigue siendo una sección personal: consulta y modifica `/api/v1/sueldos` para todos los espacios. Los enlaces desde un espacio incluyen `?espacio={id}` para conservar su selector y navegación lateral, también al volver con el navegador o abrir el enlace después de iniciar sesión. El selector permite cambiar ese contexto sin salir de Mis ingresos ni filtrar o volver a solicitar los sueldos. El contexto solo se admite si el espacio pertenece al listado del usuario; un identificador inválido, ajeno o sin acceso no bloquea la consulta de ingresos personales. Entrar a `/ingresos` sin contexto mantiene la vista general de la cuenta. No se guarda el espacio activo en almacenamiento del navegador.
