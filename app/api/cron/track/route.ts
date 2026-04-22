import { NextResponse } from 'next/server';
import { getBoats, processBoatTracking } from '@/lib/db';

export async function GET(req: Request) {
  const boats = await getBoats();
  
  for (const boat of boats) {
    try {
      const res = await fetch(`https://m.followme.mv/public/get_my.php?a=undefined&id=${boat.id}`);
      const data = await res.json();
      await processBoatTracking(boat.id, data);
    } catch (error) {
      console.error(`Failed to track boat ${boat.id}`);
    }
  }

  return NextResponse.json({ success: true, tracked: boats.length });
}