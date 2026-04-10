// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 1. Await params (Next.js 15 requirement)
    const { path } = await params;

    // 2. Get the secure token
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_access_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Construct Backend URL
    const expressPath = path.join('/');
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/${expressPath}`;
    const finalUrl = request.nextUrl.search
      ? `${backendUrl}${request.nextUrl.search}`
      : backendUrl;

    // 4. Prepare Headers
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);

    // 5. Prepare Body
    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : null;

    // 6. Execute Request to Express
    const expressRes = await fetch(finalUrl, {
      method: request.method,
      headers,
      body,
      duplex: 'half',
    } as RequestInit);

    console.log(`[PROXY] Backend returned ${expressRes.status} for /${expressPath}`);

    // 7. SSE — stream directly without buffering
    // expressRes.text() would wait for the stream to close (never for SSE)
    // so we detect SSE and pipe the body straight through instead.
    const contentType = expressRes.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      return new NextResponse(expressRes.body, {
        status: expressRes.status,
        headers: {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
          // Disable buffering in nginx / Vercel edge
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // 8. Normal response — read body as text as before
    const responseData = await expressRes.text();

    return new NextResponse(responseData, {
      status: expressRes.status,
      statusText: expressRes.statusText,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });

  } catch (error: any) {
    console.error('!!! [PROXY] CRITICAL ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Proxy Error', details: error.message },
      { status: 500 }
    );
  }
}

export const GET    = handleProxy;
export const POST   = handleProxy;
export const PUT    = handleProxy;
export const PATCH  = handleProxy;
export const DELETE = handleProxy;