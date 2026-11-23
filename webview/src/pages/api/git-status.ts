import type { APIRoute } from 'astro';
import { gitSyncState } from '../../lib/repo';

export const GET: APIRoute = async () => {
  try {
    return new Response(JSON.stringify(gitSyncState()), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ahead: 0, behind: 0, dirty: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
