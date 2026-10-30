# ai-starter

Next.js (web) + Express (server), npm workspaces.

| Path | Stack |
|---|---|
| `web/` | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Vercel AI SDK, zod, react-markdown, SWR |
| `server/` | Express 5, TypeScript, tsx |

```bash
npm install
npm run dev          # web :3000 + server :4000
npm run dev:web
npm run dev:server
```

Server health: `GET http://localhost:4000/health`
