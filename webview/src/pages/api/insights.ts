import type { APIRoute } from 'astro';
import { coreInsights } from '../../lib/core';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(coreInsights(8)), {
    headers: { 'content-type': 'application/json' },
  });
};
