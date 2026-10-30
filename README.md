# Sorteo Diario

Aplicación web en español con Node.js, Express y PostgreSQL. Render sirve la aplicación, páginas del juego y API desde el mismo origen.

## Despliegue en Render

1. Sube este proyecto a un repositorio Git y crea un Blueprint en Render usando `render.yaml`.
2. Configura los secretos en Render Environment. No guardes claves en Git ni las compartas en el chat.
3. El servicio ejecuta `npm ci` (usa las versiones fijadas en `package-lock.json`) y `npm start`; el esquema de `db/schema.sql` se aplica al iniciar.
4. Añade `PUBLIC_ORIGIN` si usas un dominio propio. En Render, el origen se detecta desde `RENDER_EXTERNAL_URL`.
5. Configura OAuth con los callbacks descritos abajo. El registro nuevo por correo está desactivado; las cuentas existentes aún pueden usar correo para iniciar sesión o recuperar el acceso.

**Importante:** en la raíz del repositorio deben estar `package.json`, `server.js`, `render.yaml` y `schema.sql`. También se admite `db/schema.sql` si subes la carpeta `db`. El servidor carga primero `db/schema.sql` y, si no existe, usa `schema.sql` de la raíz. Si no se incluye ninguno, Render detendrá el servicio con un error `ENOENT`.

El Blueprint usa instancias Free para vista previa. No son adecuadas para producción: la web puede dormir y la base gratuita de Render expira. Cambia ambos planes por recursos persistentes antes de operar cuentas o sorteos reales. Revisa [las limitaciones de Render Free](https://render.com/docs/free).

## Variables y servicios externos

- Email: `RESEND_API_KEY` y `EMAIL_FROM`, o credenciales `SMTP_*` y `EMAIL_FROM`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Facebook OAuth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
- Instagram Login para cuentas profesionales compatibles: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`.
- Google Ad Manager: `GAM_NETWORK_CODE`, `GAM_AD_UNIT_SIDE`, `GAM_AD_UNIT_MOBILE`, `GAM_AD_UNIT_CONTENT`, `GAM_REVENUE_IMPORT_KEY`.
- Render genera `SESSION_SECRET` y proporciona `DATABASE_URL` mediante el Blueprint.

Registra estos redirect URIs con los proveedores OAuth: `https://TU-DOMINIO/api/auth/google/callback`, `/api/auth/facebook/callback` y `/api/auth/instagram/callback`. El dominio debe coincidir exactamente con `PUBLIC_ORIGIN`/`RENDER_EXTERNAL_URL`. Instagram Login no admite cuentas personales como login universal.

### Obtener las claves de Google

1. Entra en [Google Cloud Console](https://console.cloud.google.com/), crea o elige un proyecto y abre **Google Auth Platform**. Completa la marca y configura el público como externo. Mientras esté en modo de prueba, agrega las cuentas que probarán el acceso como usuarios de prueba.
2. En **Clients**, crea un cliente OAuth de tipo **Web application**.
3. En **Authorized redirect URIs**, agrega el callback exacto de tu app: `https://TU-SERVICIO.onrender.com/api/auth/google/callback` (o el mismo dominio propio que uses en `PUBLIC_ORIGIN`). La URI debe coincidir exactamente, incluyendo esquema, dominio y ruta. Este flujo usa OAuth del servidor; no necesita un JavaScript origin.
4. Copia el **Client ID** a `GOOGLE_CLIENT_ID` y el **Client secret** a `GOOGLE_CLIENT_SECRET` en Render → servicio → **Environment**. Guarda y redeploy. No pongas el secreto en el código ni en una página web.

### Configurar correo para recuperación de cuentas

Recomiendo Resend porque Render bloquea las conexiones SMTP salientes en los puertos 25, 465 y 587 para servicios Free. Crea una cuenta en [Resend](https://resend.com/), añade un dominio o subdominio de envío, publica los registros SPF/DKIM que te indique Resend en el DNS y espera la verificación. Después crea una API key solo para envío y agrega a Render `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo, `Sorteo Diario <cuentas@correo.tudominio.com>`), usando una dirección del dominio verificado. El registro nuevo por correo está desactivado. El correo transaccional sirve para recuperar cuentas anteriores y solicitudes de eliminación de cuenta. No compartas aquí la API key. [Límites de Render Free](https://render.com/docs/free), [autenticación de dominios en Resend](https://resend.com/docs/dashboard/domains).

Para desarrollo local, puedes ejecutar Node.js con PostgreSQL local, usar `PUBLIC_ORIGIN=http://localhost:10000`, y agregar `http://localhost:10000/api/auth/google/callback` como URI de prueba en otro cliente OAuth de tipo Web. Las cuentas y correos de prueba locales no aparecerán automáticamente en la base desplegada de Render.

### Cambiar de hosting más adelante

El sitio guarda cuentas, contraseñas cifradas, identidades OAuth, boletos, puntos, referidos, chat y partidas en PostgreSQL; no depende de archivos persistentes del servidor web. Para migrar, prepara PostgreSQL compatible en el nuevo host, saca una copia con `pg_dump` y restáurala en una base vacía con `pg_restore`/`psql`, cambia `DATABASE_URL`, despliega la misma versión de la aplicación y verifica cuentas, puntos, boletos y sorteos antes de cambiar el dominio. Haz el corte en una ventana breve de mantenimiento para que nadie escriba en la base vieja durante la copia final. Conserva la base antigua hasta confirmar que la nueva funciona.

Los usuarios y sus contraseñas cifradas se conservan al copiar la base. Por seguridad, es mejor pedirles que vuelvan a iniciar sesión después del cambio; las sesiones guardadas también viven en PostgreSQL, pero requieren conservar el mismo `SESSION_SECRET` para seguir válidas. Actualiza en Google/Facebook/Instagram los callbacks OAuth al nuevo dominio, cambia `PUBLIC_ORIGIN`, revisa `EMAIL_FROM` y los registros DNS de correo, y lleva también las claves del proveedor de anuncios/CMP. Nunca envíes un dump o una URL de base de datos sin cifrar ni los guardes en la carpeta pública del sitio. Render documenta la exportación y restauración con `pg_dump`/`pg_restore`; los servicios Free no incluyen exportaciones administradas ni copias de seguridad de Postgres. [Guía de copias y exportación de Render](https://render.com/docs/postgresql-backups).

## Disponible en el proyecto

- Cuentas con email verificado, inicio de sesión por Google/Facebook/Instagram cuando se configuran credenciales, sesiones en PostgreSQL, CSRF, límites de frecuencia y contraseñas cifradas.
- Reclamación horaria de boleto y puntos; giro de rueda horario decidido por el servidor; saldo y libro mayor de puntos.
- Blackjack contra la banca y Guerra contra bot. Guerra también tiene salas online para dos jugadores; las cartas y rondas se resuelven en el servidor y no entregan puntos.
- Ajedrez contra bot y online, con movimientos legales verificados por el servidor. Ludo contra bot, Kamikaze Race 2D, penales, hockey, ping pong y Supercars arcade se juegan en el dispositivo. Hockey incluye modo local para dos personas (flechas y W/A/S/D) y salas online para dos jugadores. En hockey online el navegador anfitrión calcula la física y el servidor retransmite estados; no se otorgan puntos.
- Chat global con controles de frecuencia y reportes; página de resultados; referidos, premios próximos y salas. El panel de estadísticas está al final del inicio y se refresca automáticamente cada 30 segundos.
- Antifraude básico para autorreferidos, cuentas repetidas y actividad elegible de referidos.
- Ubicaciones de anuncios adaptables y carga diferida. Los espacios quedan vacíos hasta conectar inventario, obtener aprobación del proveedor y disponer de la señal CMP requerida.
- Fútbol 3D online en `Futbol3D.html`: partido de sala 1 contra 1 con cancha low-poly, porterías, luces, equipos, física arcade del balón, pase, tiro, sprint y teclado/táctil. Three.js se carga desde jsDelivr para evitar un paquete gráfico pesado en el despliegue. El servidor limita y valida los mensajes WebSocket; el anfitrión simula el partido y retransmite fotogramas, así que esta primera versión es una demo jugable sin puntos ni premios, no una simulación antitrampas ni un juego con profundidad/licencias FIFA.

Quismi y Truco aparecen en preparación: Quismi necesita sus reglas originales para crear un juego correcto; Truco todavía no tiene lógica de partida. Las salas de ajedrez permiten partidas en línea con jugadas validadas por el servidor. Guerra de cartas permite partidas online para dos personas y compara cada ronda en el servidor. El hockey ofrece multijugador local y online; la sala online no concede puntos porque la física se ejecuta en el navegador anfitrión. Las partidas locales distintas de cartas y ajedrez no otorgan puntos porque sus resultados aún no se verifican en servidor.

## Anuncios y CMP

No hay una red de anuncios conectada ni aprobada en este proyecto. Aplica a un proveedor y obtén confirmación por escrito de que acepta un sitio de juegos/sorteos con recompensas. Configura unidades publicitarias únicamente después de esa aprobación. Playwire es una opción a investigar para gaming, pero sus umbrales de tráfico son altos; no está conectado aquí.

Un CMP es una plataforma de consentimiento, no un certificado que se descarga. Para anuncios personalizados en Reino Unido/EEE/Suiza, Google exige un CMP certificado por Google que use el estándar IAB TCF. Instala el script del CMP elegido en el sitio y configura las unidades GAM. `ads.js` espera a que exista `__tcfapi` cuando `GAM_REQUIRE_CMP=true`. Para la integración de ingresos, programa un informe con el total neto del día UTC a `POST /api/ads/gam-revenue`, autenticado con `Authorization: Bearer GAM_REVENUE_IMPORT_KEY` y JSON `{"date":"AAAA-MM-DD","revenue":0.00}`. El endpoint admite correcciones idempotentes del día actual.

No incentives clics ni vistas de anuncios. Google no permite recompensas directas en dinero, tarjetas regalo o cripto por ver anuncios recompensados. Mantén los puntos por partidas sujetos a resultados validados por el servidor y a la aceptación del proveedor publicitario.

## Aún necesario para operar

Las tarjetas de Amazon, PayPal y USDT de 5,000 puntos son solo una página “próximamente”; no hay retiros implementados, proveedor de pagos, fondos ni conversión de puntos. Tremendous es un posible proveedor de catálogo/API de recompensas, sujeto a aprobación y disponibilidad por país, pero no está conectado. Antes de habilitar retiros hay que elegir proveedor, obtener aprobación/credenciales fuera de este chat, financiar la cuenta y definir conversión, mínimos, controles KYC/antifraude y términos locales.

Completa nombre y contacto del operador, privacidad, términos y reglas oficiales de la lotería. Verifica las leyes aplicables por país antes de ofrecer premios con valor económico. La selección del sorteo y el registro de jackpot están implementados, pero la entrega de premios no.
