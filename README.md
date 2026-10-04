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
   - Registro de nuevas cuentas con validacion de credenciales en tiempo real.
   - Inicio de sesion y almacenamiento seguro del token JWT en el almacenamiento local del navegador.
   - Consulta del perfil activo del usuario autenticado.

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

La fuente de valores es `tokens.json`. Consultá [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) para la paleta, las utilidades y las reglas de uso. El tema se genera automáticamente antes de iniciar o compilar; `npm run tokens:build` lo actualiza y `npm run tokens:check` comprueba su sincronización.
