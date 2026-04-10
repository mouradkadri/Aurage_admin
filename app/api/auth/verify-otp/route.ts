import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/verify-otp`;

    const expressRes = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        otp_code: body.otp_code,
        rememberMe: body.rememberMe, // <-- ADDED: Forward to Express
        'x-forwarded-for': forwardedFor,
        'user-agent': userAgent 
      }),
    });

    const data = await expressRes.json();

    if (!expressRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.message || 'Invalid or expired OTP' },
        { status: expressRes.status || 401 }
      );
    }

    // <-- ADDED: Determine cookie lifespan (30 days vs 8 hours in seconds)
    const maxAge = body.rememberMe ? (30 * 24 * 60 * 60) : (8 * 60 * 60);

    // SUCCESS! Now we set the Secure httpOnly Cookie
    (await cookies()).set({
      name: 'admin_access_token',
      value: data.token,       // The JWT from Express
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge,          // <-- ADDED: Dynamic expiration applied here
    });

    return NextResponse.json({ 
      success: true, 
      user: data.data 
    });

  } catch (error) {
    console.error('Verify OTP Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}