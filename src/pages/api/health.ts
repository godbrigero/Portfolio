import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return Response.json({
    ok: true,
    runtime: 'astro-ssr',
    renderedAt: new Date().toISOString(),
  });
};
