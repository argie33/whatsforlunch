import type { APIRoute } from 'astro';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();

    // Forward auth header if present
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const authHeader = context.request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'API error';
    return new Response(JSON.stringify({ errors: [{ message }] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
