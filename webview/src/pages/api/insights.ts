import type { APIRoute } from 'astro';
import { getInsights } from '../../lib/db';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(getInsights(8)), {
    headers: { 'content-type': 'application/json' },
  });
};
