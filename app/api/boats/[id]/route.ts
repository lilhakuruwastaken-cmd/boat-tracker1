import { NextResponse } from 'next/server';
import { deleteBoat } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await deleteBoat(params.id);
  return NextResponse.json({ success: true });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`https://m.followme.mv/public/get_my.php?a=undefined&id=${params.id}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch external data' }, { status: 500 });
  }
}