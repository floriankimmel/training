import type { APIRoute } from 'astro';
import { getActivityDetail } from '../../lib/db';

export const GET: APIRoute = ({ url }) => {
  const date = url.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: 'bad date' }), { status: 400 });
  }
  const detail = getActivityDetail(date);
  return new Response(JSON.stringify(detail), {
    headers: { 'content-type': 'application/json' },
  });
};
