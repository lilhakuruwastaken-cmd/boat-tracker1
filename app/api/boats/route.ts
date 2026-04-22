import { NextResponse } from 'next/server';
import { getBoats, saveBoat } from '@/lib/db';

export async function GET() {
  const boats = await getBoats();
  return NextResponse.json(boats);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Boat ID required' }, { status: 400 });
  
  await saveBoat({ id: body.id, name: body.name || `Boat ${body.id}` });
  return NextResponse.json({ success: true });
}