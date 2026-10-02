# Integración de nuestro MCP con Gemini — Reporte de Investigación

**Tarea:** d-NAVs-89 · Gemini MCP
**Épica:** Investigación · **Sprint:** goSerious · **Hito:** Investigación y análisis
**Audiencia:** Product Managers y Product Owners
**Fecha:** Junio 2026

---

## Antes de empezar: ¿qué es lo que estamos preguntando?

En Project Navigator construimos un **MCP** (Model Context Protocol). En palabras simples:

> Un MCP es un "puente" que le permite a una inteligencia artificial (como Claude o Gemini) **leer los datos de Project Navigator de forma segura** — proyectos, tareas, personas, costos, evaluaciones — para que un gerente pueda preguntarle cosas en lenguaje natural ("¿qué proyectos están en riesgo este cuatrimestre?") y obtener respuestas reales sacadas de nuestros datos, no inventadas.

Hoy ese puente ya funciona con las herramientas de **Claude**. La pregunta de esta investigación es:

> **¿Podemos conectar ese mismo puente a Gemini, usándolo directamente desde la página web `gemini.google.com`?**

La respuesta corta, y la razón de este reporte, está en la siguiente sección.

---

## Conclusión principal (lo que necesitan saber primero)

**No es posible hoy conectar nuestro MCP directamente a la versión web de Gemini que la gente usa en `gemini.google.com`.** No es un problema de nuestro código ni de cómo lo construimos: es una **limitación del propio Gemini**. Esa página web simplemente no tiene la opción de conectar herramientas propias como la nuestra.

Sí existen otras formas de lograr el objetivo (que un gerente le pregunte a Gemini sobre nuestros datos), pero **ninguna usa la página `gemini.google.com` tal cual**. Cada alternativa implica un camino distinto y un esfuerzo distinto. Las explicamos más abajo en lenguaje sencillo.

Además, hay un punto de urgencia que apareció durante la investigación y que afecta lo que **ya teníamos funcionando** — lo detallamos en "Un tema urgente".

---

## Replanteamiento importante: esto es una herramienta interna de Bit

Un matiz que cambia cómo se lee todo este reporte: **Project Navigator es un proyecto cerrado de Bit, no un producto para el público general.** Nunca quisimos que cualquier persona en internet pudiera conectar sus datos a Gemini.

Esto tiene una consecuencia liberadora: **que no esté disponible en `gemini.google.com` deja de ser un problema.** Esa web es justamente la vía "para todos", y no la necesitamos. Lo que realmente buscamos es que **un puñado de personas de Bit** (gerentes, PMs/POs) puedan preguntarle a Gemini sobre nuestros datos.

Bajo esa luz:

- La **Opción B (Gemini Enterprise)** pierde gran parte de su justificación: su único valor era dar una web oficial sin instalar nada a usuarios masivos. Para un equipo interno pequeño, su costo (Google Cloud + OAuth + desarrollo) rara vez se paga.
- Suben de valor las vías de **escritorio** (un cliente tipo chat instalado en la computadora de cada persona) y la **Opción D** (Gemini embebido en nuestra propia app). Ambas cubren la necesidad real sin Google Cloud.

> En otras palabras: la pregunta deja de ser *"¿cómo entramos a la web de Google?"* y pasa a ser *"¿qué experiencia preferimos para las pocas personas internas que lo usarán: una app de escritorio, o un chat dentro de nuestro propio tablero?"*

---

## ¿Por qué `gemini.google.com` no nos sirve?

Piensen en `gemini.google.com` como una "tienda cerrada". Gemini sí puede conectarse a aplicaciones externas, **pero solo a las que Google eligió a dedo** mediante acuerdos comerciales privados: Canva, Spotify, OpenTable, Instacart y un puñado más.

Lo importante: **Google no tiene un lugar donde uno pueda registrar su propia herramienta.** No hay un botón de "agregar mi conexión", ni un formulario, ni un proceso de solicitud. Si tu empresa no es uno de esos socios elegidos por Google, no hay manera de entrar. Esto aplica tanto a las cuentas personales como a las cuentas de empresa de Google (Workspace).

| Lo que probamos                                  | ¿Sirve para conectar nuestro MCP?                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| La app web de Gemini (cuentas personales)        | **No** — solo socios elegidos por Google                                           |
| Gemini en cuentas de empresa (Workspace)         | **No** — solo conecta apps de Google y un grupo cerrado                            |
| Los "Gems" (asistentes personalizados de Gemini) | **No** — permiten instrucciones y archivos, pero no conectar herramientas externas |
| La **app oficial Gemini Desktop** (Windows/Mac)  | **No** — misma puerta cerrada que la web: solo "Extensiones" del set de Google, sin registrar MCP propio (hoy) |

En resumen: la puerta por la que nos pidieron entrar **está cerrada para todos los que no son socios comerciales de Google**, y no hay forma de tocar para pedir entrar.

---

## Nota sobre el retiro de Gemini CLI (ya resuelto)

Durante la investigación detectamos que **Google retiró Gemini CLI el 18 de junio de 2026** (verificado contra el blog oficial de Google y prensa — ver "Fuentes verificadas"), reemplazándola por **Antigravity CLI**. El retiro **no es total**: Gemini CLI sigue funcionando para cuentas con **API key de pago** o licencia **empresarial** (Gemini Code Assist Standard/Enterprise), y deja de servir solo en los planes gratuitos/personales.

Habíamos agregado una mención a Gemini CLI en `mcp-server/README.md`, pero **nadie llegó a usarla**. Para evitar confusión, **ya la retiramos del README** — no requiere ninguna acción adicional. Lo dejamos documentado aquí solo como antecedente y como recordatorio de lo rápido que se mueve el ecosistema de Gemini.

---

## ¿Entonces hay alguna forma de lograrlo? Las opciones reales

Aunque la página web pública está cerrada, sí existen caminos para que Gemini lea nuestros datos. Aquí están, ordenados de menor a mayor esfuerzo, explicados sin tecnicismos.

> **Cómo leer los costos.** Cada opción tiene dos tipos de costo: el **costo de software/uso** (lo que se paga a Google de forma recurrente) y el **costo de desarrollo** (horas de nuestro equipo, una sola vez). Sobre el uso de Gemini hay dos modelos: **suscripción por persona** (Gemini Enterprise, ~$30 USD/usuario/mes) o **pago por consumo** (la API de Gemini cobra por "tokens" — texto procesado; hay tier gratuito limitado y modelos baratos como Flash-Lite a ~$0.10–0.40 USD por millón de tokens). Para un uso interno de pocas personas, el pago por consumo suele costar **unos pocos dólares al mes**. Precios verificados a junio 2026 (ver "Fuentes verificadas"); conviene reconfirmarlos al ejecutar.

### Opción A — Para usuarios técnicos, en su propia computadora

Igual que hoy funciona con las herramientas de Claude, el MCP puede funcionar con las herramientas de línea de comandos de Gemini **instaladas en la computadora de cada persona**: la nueva **Antigravity CLI** (para todos), o la **Gemini CLI** anterior si la persona tiene una cuenta de pago/empresarial de Google.

- **Para quién sirve:** desarrolladores y usuarios avanzados.
- **Esfuerzo:** bajo — es prácticamente lo que ya tenemos; solo cambia el nombre/instalación de la herramienta cliente.
- **Ventajas:** usa nuestro MCP tal cual; mínimo trabajo; cada quien controla su propia instalación.
- **Desventajas:** es una **terminal, no una web ni un chat amigable** — un gerente no técnico no la usaría cómodamente. Cada persona instala y configura por su cuenta. El reemplazo (Antigravity CLI) es **closed-source** y su tier gratuito es muy limitado (~20 consultas/semana).
- **Costo:** *Software/uso:* gratis en el tier limitado de Antigravity; para uso real, API key de Gemini por consumo (unos pocos USD/mes para pocas personas) o licencia de pago de Google. *Desarrollo:* prácticamente **$0** — ya está hecho.

### Opción A-bis — Una app de escritorio tipo chat (sin terminal) ⭐

Punto medio entre la Opción A (terminal, técnica) y construir lo nuestro: existen **aplicaciones de escritorio con ventana de chat** —tal como Claude Desktop— que combinan el motor de Gemini con herramientas MCP propias. **Ojo:** no es la app *oficial* de Gemini de Google (esa no admite MCP propio, ver tabla arriba), sino clientes hechos por la comunidad, como `gemini-desktop` (open-source, Windows/Mac) o BoltAI (Mac).

- **Para quién sirve:** gerentes/PMs que quieren una **experiencia tipo chat** (no una terminal) pero aceptan instalar una app en su equipo. Más cómodo que la Opción A.
- **Esfuerzo:** **muy bajo** — usan **nuestro MCP actual casi tal cual** (no hay que reescribir nada); solo se configura como ya se hace con Claude Desktop. Requieren una **API key de Gemini**.
- **Ventajas:** chat de escritorio listo de inmediato; no toca Google Cloud; no requiere Gemini Enterprise; reutiliza el MCP existente.
- **Desventajas:** es software de **terceros** que corre localmente y ve los datos de paso (y la API key de Gemini) — **salvedad de seguridad relevante con costos/evaluaciones**: conviene preferir un cliente **open-source/auditable** y acordar cuál se usa oficialmente. Calidad y soporte variables (no es producto de Google). Cada persona instala por su cuenta. Si se quiere control total del software, gana la Opción D.
- **Costo:** *Software/uso:* el cliente suele ser **gratis/open-source**; se paga solo el consumo de la API de Gemini (unos pocos USD/mes para pocas personas; hay tier gratuito limitado). *Desarrollo:* **muy bajo** — es configuración, no desarrollo.

### Opción B — La única forma web "oficial" de Google (pero NO es `gemini.google.com`)

Google sí ofrece una página web donde se pueden conectar herramientas propias como la nuestra, pero es **otra plataforma distinta**, pensada para empresas, llamada **Gemini Enterprise**.

- **Para quién sirve:** gerentes que quieren una experiencia web tipo chat, sin instalar nada en su equipo. **Este es el escenario que originalmente nos pidieron.**
- **Esfuerzo:** medio-alto — requiere trabajo de nuestro lado (ver "¿Qué tendríamos que cambiar?").
- **Ventajas:** experiencia web oficial de Google sin instalar nada; **protección de datos de nivel empresarial** (los datos no se usan para entrenar a la IA ni se revisan), muy relevante porque manejamos **costos y evaluaciones de personal**.
- **Desventajas:** es la opción de **mayor fricción y costo**. Requiere **contratar el producto en Google Cloud** (aunque nuestro servidor siga en AWS), **construir OAuth** desde cero (hoy no lo tenemos), publicar un servidor remoto, y registrar el conector. Genera dependencia/lock-in con la plataforma de Google y un **costo recurrente por persona**.
- **Precisión sobre Google Cloud (corrige una creencia común):** **nuestro servidor MCP puede seguir viviendo en nuestra infraestructura actual de AWS Amplify** — la documentación oficial confirma que el servidor puede estar hospedado en cualquier lado, siempre que sea accesible por HTTPS. Lo que *sí* vive en Google Cloud es el producto **Gemini Enterprise** (que le llama a nuestro servidor desde afuera). No migramos el stack; se decide si **contratamos la suscripción**.
- **Costo:** *Software/uso:* **~$30 USD/usuario/mes** (Gemini Enterprise Standard/Plus; la edición Business ronda $21; hay descuentos a escala). *Desarrollo:* **proyecto pequeño/mediano** — servidor remoto + OAuth + conector (el OAuth es el grueso). Es la combinación más cara: suscripción mensual **más** desarrollo.

### Opción C — Aprovechar lo que ya tenemos construido

Como nuestro MCP ya se apoya en una API (el sistema que ya entrega los datos de Project Navigator de forma controlada), si el equipo opta por la Opción B esa misma API se reutiliza casi tal cual — el trabajo se concentra en "publicar" el servidor y reforzar su seguridad (ver siguiente sección), no en reescribir la lógica de datos.

- **Esfuerzo:** medio.
- **Ventajas:** reutiliza lo ya hecho; no es un MCP nuevo desde cero; reduce el desarrollo de la Opción B.
- **Desventajas:** **no es una opción independiente** — solo tiene sentido si ya decidimos ir por la Opción B (Gemini Enterprise). Por sí sola no entrega ninguna experiencia al usuario.
- **Costo:** no añade costo propio; es una forma de **abaratar el desarrollo** de la Opción B. El costo recurrente sigue siendo el de B (suscripción por usuario).

### Opción D — Gemini *dentro* de Project Navigator (recomendada para el caso "gerente") ⭐

En lugar de llevar nuestros datos hacia un cliente externo de Gemini, traemos a Gemini hacia adentro: **un chat embebido en la propia app de Project Navigator**, donde el gerente pregunta en lenguaje natural y por detrás Gemini consulta nuestra misma API.

- **Para quién sirve:** gerentes (PM/PO) que quieren preguntar desde el navegador, sin instalar nada. Cubre **exactamente** la necesidad original — solo que la "web" es la nuestra, no la de Google.
- **Por qué encaja con este proyecto:** **ya tenemos el precedente exacto funcionando.** El tablero CS 360 ya consume un servicio de IA (Nexus, `ai.bit.lat`) con un patrón asíncrono probado. Replicar ese patrón apuntando a la API de Gemini es terreno conocido para el equipo.
- **Ventajas:** (1) **no depende de que Google abra su web** ni de Gemini Enterprise; (2) **se queda en nuestro AWS Amplify** — la API de Gemini se consume con una llave, igual que ya hacemos con Nexus, sin migrar a Google Cloud; (3) controlamos 100% la experiencia, los permisos por rol y qué datos se exponen; (4) nada que instalar para el usuario.
- **Esfuerzo:** medio — comparable a la Opción B, pero sin la dependencia de Google Cloud y reutilizando el patrón Nexus.
- **Desventajas:** es la que **más desarrollo propio** requiere de las opciones sin Google Cloud (hay que construir la UI de chat y la conexión a Gemini); **el mantenimiento es nuestro**; y no es "Gemini oficial" de Google (es nuestra app usando el motor de Gemini por detrás — para la mayoría de gerentes esto es indistinguible, y de hecho mejor por vivir junto al resto del tablero).
- **Costo:** *Software/uso:* solo el consumo de la API de Gemini por tokens (mismo modelo que ya usamos con Nexus; **sin suscripción por usuario** — unos pocos USD/mes para uso interno). *Desarrollo:* **medio** — replicar el patrón Nexus + UI de chat. Es la opción más barata en lo recurrente, a cambio de algo más de desarrollo inicial.

---

## Comparativa rápida de opciones

| Opción | Experiencia | Esfuerzo (desarrollo) | Costo recurrente | ¿Google Cloud? | ¿Reusa MCP actual? |
|---|---|---|---|---|---|
| **A** — CLI (Antigravity) | Terminal (técnica) | Casi $0 (ya está) | Gratis limitado / API por consumo | No | Sí, tal cual |
| **A-bis** — App escritorio (3ros) | Chat de escritorio | Muy bajo (configurar) | API por consumo (pocos USD/mes) | No | Sí, casi tal cual |
| **B** — Gemini Enterprise | Web oficial Google | Medio (servidor remoto + OAuth) | **~$30 USD/usuario/mes** + desarrollo | **Sí** (suscripción) | Hay que rehacerlo remoto |
| **C** — Reusar API para B | (sub-opción de B) | Reduce el de B | El de B | Sí (es parte de B) | Sí |
| **D** — Gemini en nuestra app ⭐ | Chat en nuestro tablero | Medio (patrón Nexus + UI) | API por consumo (pocos USD/mes) | No | Reusa la API |

> **Lectura ejecutiva:** para una herramienta interna de pocas personas, **A-bis** es la de menor esfuerzo y **D** la de mejor experiencia/control; ambas evitan la suscripción por usuario y Google Cloud. La **B** solo se justifica si necesitamos específicamente la plataforma oficial de Google.

---

## ¿Qué tendríamos que cambiar para la Opción B (la web empresarial)?

Sin entrar en detalle técnico, para que nuestro MCP funcione en la web de Gemini Enterprise hay que hacer tres ajustes principales (todos confirmados contra la documentación oficial de Google):

1. **Cambiar cómo "vive" el servidor.** Hoy nuestro MCP corre en la computadora de cada persona y se comunica de forma "local" (transporte *stdio*). Gemini Enterprise exige un servidor **remoto, siempre disponible, por HTTPS**, y con un formato de comunicación específico (el nuevo **StreamableHTTP**; el antiguo *SSE* no está soportado). Es como pasar de tener un documento en tu laptop a publicarlo en una página accesible por internet. **Buena noticia:** puede hospedarse en nuestro **AWS Amplify actual**, no hace falta Google Cloud para esto.
2. **Reforzar la seguridad de acceso (esto es un requisito duro, no opcional).** Hoy entramos con una "llave" simple (nuestro token `pn_mcp_*`). Gemini Enterprise exige **OAuth 2.0** — el mismo "inicio de sesión seguro" que usan los bancos: hay que registrar a Gemini Enterprise como aplicación autorizada y configurar el flujo de login. La buena noticia: **la base de seguridad que ya tenemos es la correcta** — nuestro MCP ya respeta el rol de cada usuario (un desarrollador no puede ver costos, etc.). Eso se conserva; se le suma la capa de OAuth por encima.
3. **Registrar nuestra herramienta dentro de Gemini Enterprise** (como "conector"/almacén de datos) para que la reconozca y la pueda usar.

> **Traducción a producto:** esto es un **proyecto pequeño/mediano de desarrollo** (servidor remoto + OAuth + registro del conector), no una simple configuración de un día. Hay que presupuestarlo como tal. El costo mayor es OAuth, porque hoy no lo tenemos.

---

## Seguridad y datos sensibles (importante para la decisión)

Nuestro MCP maneja datos delicados: **costos de proyectos y evaluaciones de personal.** Esto debe pesar en la decisión:

- **`gemini.google.com` (página pública):** además de no ser posible, operaría bajo términos pensados para uso general, no empresarial. **No recomendable para datos sensibles** aunque fuera posible.
- **Gemini Enterprise (Opción B):** ofrece garantías empresariales — los datos no se usan para entrenar a la IA ni se revisan, con certificaciones de seguridad reconocidas. **Es la opción adecuada si vamos hacia una experiencia web con estos datos.**

El equipo de investigación confirmó que la arquitectura de seguridad que ya construimos (cada usuario solo ve lo que le corresponde según su rol, y una herramienta no puede "crear más llaves" para escalar permisos) **es exactamente la correcta** y nos deja bien posicionados para cualquiera de los caminos.

---

## Recomendación

1. **Ya resuelto:** retiramos la mención a Gemini CLI del `mcp-server/README.md` (nadie la había usado), así que no hay deuda de documentación pendiente por el retiro de esa herramienta.
2. **Comunicar la realidad del alcance:** el pedido original ("usarlo desde `gemini.google.com`") **no es realizable hoy** por una limitación de Google, no nuestra. Conviene alinear expectativas con quien lo solicitó.
3. **Partir del replanteamiento:** al ser una **herramienta interna y cerrada de Bit** para pocas personas, descartamos de entrada la web pública y **bajamos la prioridad de la Opción B** (Gemini Enterprise/Google Cloud). El rumbo se decide según la experiencia deseada:

   - Si los usuarios serán **desarrolladores/usuarios avanzados** → la **Opción A** ya casi la tenemos; esfuerzo mínimo (solo cambiar la herramienta cliente a Antigravity CLI).
   - Si los usuarios serán **gerentes (PM/PO) y aceptan instalar una app** → la **Opción A-bis** (cliente de escritorio tipo chat) es la de **menor esfuerzo**: usa nuestro MCP actual casi tal cual. Atender la salvedad de seguridad (preferir cliente open-source).
   - Si queremos la **mejor experiencia y control total** (chat integrado al tablero, sin instalar nada, permisos nuestros) → la **Opción D** (Gemini embebido en nuestra app) es la **recomendación principal**, reutilizando el patrón Nexus que ya corre en producción.
   - **Opción B (Gemini Enterprise)** queda como último recurso, solo si hubiera una razón de peso para querer la plataforma oficial de Google (implica Google Cloud + OAuth + desarrollo).

4. **Punto de decisión clave para PM/PO:** para las pocas personas internas que lo usarán, ¿preferimos **instalar una app de escritorio** (Opción A-bis, listo casi ya) o **construir el chat dentro de nuestro tablero** (Opción D, más esfuerzo pero control total)? Cualquiera de las dos **se logra sin Google Cloud y reutilizando lo que ya tenemos.**

---

## Consideraciones finales

- **El ecosistema de Gemini cambia muy rápido.** Solo entre mayo y junio de 2026 hubo retiros de herramientas y lanzamientos nuevos. Cualquier decisión de producción debería re-verificarse contra la documentación oficial de Google poco antes de ejecutarse.
- **Existe la posibilidad de que Google abra `gemini.google.com` a herramientas propias en el futuro**, pero **no hay fecha anunciada**. No es prudente planear sobre algo que no existe todavía.
- **Si el número de gerentes que usarían esto es pequeño** (digamos, menos de 5 personas), el esfuerzo de la Opción B (Gemini Enterprise + Google Cloud + OAuth) difícilmente se justifica. En ese escenario la **Opción D** (Gemini embebido en nuestra app) cubre mejor la necesidad con menos costo y sin dependencias externas.

---

## Fuentes verificadas (junio 2026)

Los hechos sensibles al tiempo de este reporte se confirmaron contra fuentes oficiales y prensa especializada:

- **Retiro de Gemini CLI (18-jun-2026) y transición a Antigravity CLI** — Blog oficial de Google Developers: [An important update: Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/). Confirma que conservan acceso quienes tienen **API key de pago** o licencia **Gemini Code Assist Standard/Enterprise**. Cobertura adicional: [The Register](https://www.theregister.com/ai-ml/2026/05/20/bye-bye-gemini-cli-google-nudges-devs-toward-antigravity/5243605).
- **`gemini.google.com` no admite MCP propio** — Comunidad oficial de Gemini Apps: [How to connect custom MCP server with Gemini web app](https://support.google.com/gemini/thread/368009900/how-to-connect-custom-mcp-server-with-gemini-web-app?hl=en).
- **Gemini Enterprise sí admite MCP propio, con requisitos (StreamableHTTP remoto + OAuth 2.0, servidor hospedable fuera de Google Cloud)** — Documentación de Google Cloud: [Set up your custom MCP server data store | Gemini Enterprise](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server).
- **La app oficial Gemini Desktop no admite MCP propio; existen clientes de escritorio de terceros que sí (Opción A-bis)** — Guía: [Google Gemini Desktop App (2026)](https://www.eigent.ai/blog/gemini-desktop-guide); clientes open-source: [gemini-desktop (Electron + MCP)](https://github.com/kkrishnan90/gemini-desktop), [gemini-mcp-desktop-client](https://github.com/duke7able/gemini-mcp-desktop-client); discusión oficial: [Connecting Gemini to MCP Servers — Gemini Apps Community](https://support.google.com/gemini/thread/409485795/connecting-gemini-to-mcp-servers-user-friendly-alternatives-to-gemini-cli?hl=en).

> **Nota de vigencia:** el ecosistema de Gemini cambia rápido. Estas fuentes son de junio 2026; re-verificar antes de ejecutar cualquier decisión de producción.

---

*Reporte preparado a partir de la investigación técnica de la tarea d-NAVs-89. Hechos verificados vía web en junio 2026 (ver "Fuentes verificadas").*
