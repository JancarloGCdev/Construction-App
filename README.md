# ConstruYa

Aplicación web para **constructores**: calculadoras de materiales (concreto, muros, acabados, cerámica, etc.), **cotización** con precios configurables, export a **PDF** y **WhatsApp**, y **asistente IA** opcional. Los precios del perfil y el carrito viven **en el navegador** del usuario (persistencia local), sin cuenta obligatoria.

## Stack

- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS** + componentes tipo shadcn
- **React Hook Form** + **Zod**
- **Zustand** (persist en `localStorage`)
- **@react-pdf/renderer** para PDF

## Requisitos

- **Node.js 20** (recomendado) o compatible con Next 15
- **npm** (el repo incluye `package-lock.json`)

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # opcional: ver variables abajo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando       | Descripción                    |
|---------------|--------------------------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción        |
| `npm run start` | Servidor tras `build`      |
| `npm run lint`  | ESLint                     |

## Despliegue en Vercel

1. Importar el repositorio en [Vercel](https://vercel.com).
2. Framework: **Next.js** (detección automática).
3. **Build command:** `npm run build` (por defecto).
4. **Output:** omitir (SSR/estático según rutas).

### Variables de entorno en Vercel

Configúralas en **Project → Settings → Environment Variables** (Production / Preview / Development según necesidad).

| Variable | ¿Obligatoria? | Valor / qué poner |
|----------|----------------|-------------------|
| `NEXT_PUBLIC_SITE_URL` | **Recomendada** en producción | URL canónica **con `https`**, **sin barra final**, por ejemplo `https://tu-proyecto.vercel.app` o tu dominio custom `https://tudominio.com`. Mejora metadatos **Open Graph** (previews al compartir enlaces). Si la omitís, en Vercel suele resolverse con `VERCEL_URL` automática, pero conviene fijar la URL definitiva cuando tengáis dominio. |
| `OPENAI_COMPATIBLE_API_KEY` | No | Clave del proveedor compatible con Chat Completions (p. ej. **Groq**: la generás en [console.groq.com](https://console.groq.com) → API Keys). Formato típico `gsk_...`. Solo si queréis IA remota por esta vía. |
| `OPENAI_COMPATIBLE_CHAT_URL` | No (sí si usáis la opción compatible) | URL del endpoint tipo OpenAI, p. ej. `https://api.groq.com/openai/v1/chat/completions`. |
| `OPENAI_COMPATIBLE_MODEL` | No | ID del modelo en ese proveedor, p. ej. `llama-3.3-70b-versatile` (depende del proveedor). |
| `OPENAI_CHAT_COMPLETIONS_URL` | No | Alias opcional reconocido por el código si no definís `OPENAI_COMPATIBLE_CHAT_URL`. |
| `DEEPSEEK_API_KEY` | No | Clave **DeepSeek** si usáis su API (formato según su panel). Si definís **también** `OPENAI_COMPATIBLE_*` completo, esa opción **tiene prioridad** sobre DeepSeek. |
| `DEEPSEEK_API_URL` | No | Por defecto el código usa la URL estándar de DeepSeek; solo si necesitáis otra. |
| `DEEPSEEK_MODEL` | No | Por defecto `deepseek-chat`. |

**Notas:**

- **No subas** claves al repositorio; usad solo el panel de Vercel o `.env.local` en local (ya listado en `.gitignore`).
- Si **no** configuráis ningún proveedor de chat remoto, `/api/ai` puede operar en **modo local** (reglas + calculadoras), según la lógica del proyecto.
- `VERCEL_URL` la inyecta **Vercel** sola; no hace falta definirla a mano.

## Estructura relevante

- `src/app/` — rutas y layouts.
- `src/core/` — calculadoras, motor de cotización, tipos.
- `src/components/` — UI compartida (shell, cotización, calculadoras).
- `src/store/` — estado invitado (perfil + carrito).
- `public/` — estáticos y `site.webmanifest`.

## Licencia

Privado — uso según acuerdo del repositorio.
