# Jueguiños List por los Pibes

Sitio estático para [GitHub Pages](https://pages.github.com/) que muestra la lista de juegos de **Jueguiños list por los pibes.txt**, con filtros por nombre, consola, ranking y reseñas.

Incluye un sistema de **ranking numérico** (1-10) y **reseñas con votos positivos/negativos**, usando [Turso](https://turso.tech/) como base de datos.

## Características

- Filtros en tiempo real por:
  - Nombre
  - Consola
  - Ranking (con/sin ranking, o por puntuación mínima)
  - Reseñas (con/sin reseñas)
- Ordenamiento por nombre, consola, ranking o cantidad de reseñas.
- Ranking numérico de 1 a 10 por juego.
- Reseñas con autor, contenido y votos positivos/negativos.
- Panel de administración con CRUD completo de juegos (crear, editar, eliminar).
- Sistema de login con roles: administrador, usuario e invitado.
- Solo los usuarios registrados pueden votar y escribir reseñas.
- Los invitados pueden ver juegos y reseñas, pero no votar ni reseñar.
- El administrador puede crear y gestionar usuarios.
- Cada usuario puede cambiar su nombre visible y contraseña.
- Sitio 100% estático para GitHub Pages.

## Requisitos

- [Node.js](https://nodejs.org/) (para scripts locales)
- [Cuenta de Turso](https://turso.tech/) y la [CLI de Turso](https://docs.turso.tech/cli/introduction)

## Estructura del proyecto

```
.
├── index.html              # Página principal
├── css/style.css           # Estilos
├── js/app.js               # Lógica de la aplicación
├── js/config.js            # Configuración de Turso (ver abajo)
├── data/games.json         # Lista de juegos parseada
├── scripts/
│   ├── parse-games.js      # Parsea el .txt a JSON
│   └── setup-turso.js      # Crea tablas y carga datos en Turso
└── .github/workflows/
    └── deploy.yml          # Despliegue automático en GitHub Pages
```

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

3. Completa tus credenciales de Turso en `.env`.

   El script `setup-db` carga automáticamente las variables del archivo `.env` gracias a `dotenv`.

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

4. Guarda esos valores en tu `.env`:

   ```env
   TURSO_DATABASE_URL=libsql://emu-TU-ORG.turso.io
   TURSO_AUTH_TOKEN=tu-token-aqui
   ADMIN_PIN=1234
   ADMIN_USERNAME=admin
   ADMIN_DISPLAY_NAME=Administrador
   ```

   Puedes usar la URL tal como la devuelve `turso db show emu --url` (`libsql://...` o `https://...`).
   `ADMIN_PIN` se usa como contraseña del usuario administrador por defecto que crea `npm run setup-db`.

## Cargar los juegos en Turso

```bash
npm run setup-db
```

Esto crea las tablas (`games`, `ratings`, `reviews`, `review_votes`) y carga los 469 juegos parseados desde `data/games.json`.

## Desarrollo local

1. Copia el archivo de configuración de ejemplo:

   ```bash
   cp js/config.example.js js/config.js
   ```

2. Completa tus credenciales en `js/config.js`:

   ```js
   url: 'libsql://emu-TU-ORG.turso.io',
   token: 'tu-token-aqui',
   adminPin: '1234',
   ```

   `js/config.js` está en `.gitignore` para evitar subir secretos.

3. Abre `index.html` en tu navegador (puedes usar cualquier servidor estático, por ejemplo `npx serve .`).

Usa **Entrar** con el usuario administrador creado por `setup-db` (por defecto `admin` y la contraseña definida en `ADMIN_PIN`). El botón **Admin** solo es visible para administradores.

⚠️ **Importante de seguridad**: el token de Turso queda expuesto en el código del navegador. Cualquiera que lo tenga puede leer y modificar tu base de datos. Para un proyecto personal/pequeño esto suele ser aceptable, pero no uses este patrón con datos sensibles. Si el token se filtra, rótalo inmediatamente con `turso db tokens rotate emu`.

## Despliegue en GitHub Pages

1. Sube este repositorio a GitHub.

2. Ve a **Settings > Secrets and variables > Actions** y añade tres secrets:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PIN`

3. Ve a **Settings > Pages** y selecciona **GitHub Actions** como fuente de despliegue.

4. El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente en cada push a `main`, inyectando las credenciales de Turso en `js/config.js` antes de subir la página.

## Actualizar la lista de juegos

Si editas `Jueguiños list por los pibes.txt`, regenera el JSON y vuelve a cargar la base de datos:

```bash
npm run parse
npm run setup-db
```

## Licencia

Este proyecto usa la licencia del repositorio original.
