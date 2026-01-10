import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('naverb796e97e76c1d7d9c1c7acf0f2c10c8b', {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
