# Jueguiños List por los Pibes

Sitio estático para [GitHub Pages](https://pages.github.com/) que muestra la lista de juegos de **Jueguiños list por los pibes.txt**, con filtros por nombre, consola, ranking, reseñas y más.

Incluye un sistema de **ranking numérico** (1-10), **reseñas con votos positivos/negativos**, **favoritos**, **lista de juegos pendientes** y **marcar como jugado**, usando [Turso](https://turso.tech/) como base de datos.

## Características

- Filtros en tiempo real por:
  - Nombre
  - Consola
  - Ranking (con/sin ranking, o por puntuación mínima)
  - Reseñas (con/sin reseñas)
- Ordenamiento por nombre, consola, ranking o cantidad de reseñas.
- Ranking numérico de 1 a 10 por juego.
- Reseñas con autor, contenido y votos positivos/negativos.
- Favoritos, lista de próximos juegos y registro de juegos jugados.
- Panel de administración con CRUD completo de juegos (crear, editar, eliminar).
- Gestión de usuarios: el administrador puede crear, editar y eliminar usuarios.
- Sistema de login con roles: **administrador**, **usuario** e **invitado**.
  - Los **invitados** pueden ver juegos y reseñas, pero no votar, escribir reseñas, ni usar favoritos/lista de juegos.
  - Los **usuarios registrados** y los **administradores** pueden votar, escribir reseñas, guardar favoritos, administrar su lista de juegos y marcar juegos como jugados.
- Cada usuario puede cambiar su nombre visible y contraseña desde **Mi cuenta**.
- Sitio 100% estático para GitHub Pages; la lógica está dividida en módulos ES sin bundler.

## Requisitos

- [Node.js](https://nodejs.org/) (para scripts locales)
- [Cuenta de Turso](https://turso.tech/) y la [CLI de Turso](https://docs.turso.tech/cli/introduction)

## Estructura del proyecto

```
.
├── index.html              # Página principal
├── css/style.css           # Estilos
├── js/
│   ├── app.js              # Inicialización de la aplicación
│   ├── auth.js             # Autenticación y roles de usuario
│   ├── games.js            # Carga y filtros de juegos
│   ├── lists.js            # Favoritos, próximos juegos y jugados
│   ├── reviews.js          # Reseñas y votos
│   ├── admin.js            # Panel de administración
│   ├── state.js            # Estado compartido
│   ├── templates.js        # Plantillas HTML
│   ├── elements.js         # Referencias a elementos del DOM
│   ├── utils.js            # Utilidades
│   ├── tab-counts.js       # Contadores de pestañas
│   ├── turso-client.js     # Cliente de Turso para el navegador
│   ├── config.js           # Configuración de Turso (ver abajo)
│   └── config.example.js   # Ejemplo de configuración
├── data/games.json         # Lista de juegos parseada
├── scripts/
│   ├── parse-games.js      # Parsea el .txt a JSON
│   ├── setup-turso.js      # Crea tablas, migra y carga datos en Turso
│   └── clean-db.js         # Limpia tablas de juegos (conserva usuarios)
├── .github/workflows/
│   └── deploy.yml          # Despliegue automático en GitHub Pages
└── eslint.config.mjs       # Configuración de ESLint
```

## Configuración local

Los **scripts** usan variables de entorno desde `.env`; el **navegador** usa `js/config.js`. Ambos archivos están en `.gitignore` y contienen la misma URL, token y PIN de administrador.

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

3. Completa tus credenciales de Turso en `.env`:

   ```env
   TURSO_DATABASE_URL=https://emu-TU-ORG.turso.io
   TURSO_AUTH_TOKEN=tu-token-aqui
   ADMIN_PIN=1234
   ADMIN_USERNAME=admin
   ADMIN_DISPLAY_NAME=Administrador
   ```

   - `TURSO_DATABASE_URL`: puedes usar la URL tal como la devuelve `turso db show emu --url` (`libsql://...` o `https://...`).
   - `ADMIN_PIN`, `ADMIN_USERNAME` y `ADMIN_DISPLAY_NAME` se usan para crear el usuario administrador por defecto al ejecutar `npm run setup-db`.

## Crear la base de datos en Turso

1. Crea la base de datos:

   ```bash
   turso db create emu
   ```

2. Genera un token de autenticación:

   ```bash
   turso db tokens create emu
   ```

3. Obtén la URL de la base de datos:

   ```bash
   turso db show emu --url
   ```

4. Guarda esos valores en tu `.env` (ver sección anterior).

## Cargar los juegos en Turso

```bash
npm run setup-db
```

Esto crea las tablas (`games`, `ratings`, `reviews`, `review_votes`, `users`, `favorites`, `play_orders`, `played_games`), aplica migraciones leves si es necesario (por ejemplo, agrega `author` a `ratings` y `voter` a `review_votes`) y carga los juegos parseados desde `data/games.json`.

`setup-db` omite la carga de juegos si la tabla `games` ya tiene filas. Para volver a cargar los datos desde cero:

```bash
npm run clean-db
npm run setup-db
```

`clean-db` borra las filas relacionadas con juegos, rankings, reseñas, votos, favoritos y listas de juegos, pero **conserva** la tabla `users` y el historial de `played_games`.

## Desarrollo local

1. Copia el archivo de configuración del navegador:

   ```bash
   cp js/config.example.js js/config.js
   ```

2. Completa tus credenciales en `js/config.js`:

   ```js
   const TURSO_CONFIG = {
     url: 'libsql://emu-TU-ORG.turso.io',
     token: 'tu-token-aqui',
     adminPin: '1234',
   };
   ```

   `js/config.js` está en `.gitignore` para evitar subir secretos.

3. Sirve la carpeta de forma estática por HTTP. Los módulos ES no funcionan al abrir `index.html` directamente con `file://`.

   ```bash
   npx serve .
   # o
   python3 -m http.server 8080
   ```

4. Abre la URL del servidor en tu navegador e inicia sesión con el usuario administrador creado por `setup-db` (por defecto `admin` y el PIN definido en `ADMIN_PIN`). El botón **Admin** solo es visible para administradores.

Puedes verificar el estilo del código con:

```bash
npx eslint js/
```

⚠️ **Importante de seguridad**: el token de Turso queda expuesto en el código del navegador. Cualquiera que lo tenga puede leer y modificar tu base de datos. Para un proyecto personal/pequeño esto suele ser aceptable, pero no uses este patrón con datos sensibles. Si el token se filtra, rótalo inmediatamente con `turso db tokens rotate emu`.

## Despliegue en GitHub Pages

1. Sube este repositorio a GitHub.

2. Ve a **Settings > Secrets and variables > Actions** y añade tres secrets:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PIN`

3. Ve a **Settings > Pages** y selecciona **GitHub Actions** como fuente de despliegue.

4. El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente en cada push a `main` o `master`, y también se puede disparar manualmente con `workflow_dispatch`. El workflow copia `js/config.example.js` a `js/config.js` e inyecta las credenciales de Turso antes de subir la página.

## Actualizar la lista de juegos

Si editas `Jueguiños list por los pibes.txt`, regenera el JSON y vuelve a cargar la base de datos:

```bash
npm run parse
npm run setup-db
```

Si `setup-db` omite la carga porque `games` ya tiene datos, usa `npm run clean-db` antes de `npm run setup-db`.

## Licencia

Este proyecto usa la licencia del repositorio original.
