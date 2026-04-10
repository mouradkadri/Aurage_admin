import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/login`;

    const expressRes = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        'x-forwarded-for': forwardedFor,
        'user-agent': userAgent 
      }),
    });

    const data = await expressRes.json();

    if (!expressRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.message || 'Invalid email or password' },
        { status: expressRes.status || 401 }
      );
    }

    // NEW: We do NOT set the cookie here anymore.
    // We just return the response from Express so the UI knows to ask for OTP.
    return NextResponse.json({ 
      success: true, 
      requires_otp: data.requires_otp,
      email: data.email,
      message: data.message
    });

  } catch (error) {
    console.error('Login Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}