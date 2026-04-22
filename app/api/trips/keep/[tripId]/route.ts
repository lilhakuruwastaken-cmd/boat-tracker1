import { NextResponse } from 'next/server';
import { toggleKeepTrip } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { tripId: string } }) {
  const newKeepStatus = await toggleKeepTrip(params.tripId);
  return NextResponse.json({ keep: newKeepStatus });
}