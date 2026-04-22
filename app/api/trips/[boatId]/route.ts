import { NextResponse } from 'next/server';
import { getRecentTrips } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { boatId: string } }) {
  const trips = await getRecentTrips(params.boatId, 10);
  return NextResponse.json(trips);
}