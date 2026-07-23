# AGENTS.md

## Contexto de la aplicación

Academy es una plataforma educativa multiempresa de Academy by Scalaria. La arquitectura, el contenido y la identidad deben permanecer neutrales y configurables por organización.

Roles del producto: `superadmin`, `organization_admin`, `teacher`, `student` y `guest`.

Regla principal: toda entidad de contenido debe incluir `organization_id`; el backend debe validar que el actor pertenece a esa organización antes de leer o modificar datos.

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes
focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.
- `base44/functions/_shared/`: reusable backend modules (auth/roles, file validation,
  private files) — see the parent project's `app-generation` skill for the patterns these
  implement before adding new ones.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local
  Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means
  the Base44 project config includes `site.serveCommand`, for example
  `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific
  tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44
  integration paths.
- Run `npm run verify` before finishing code changes.
