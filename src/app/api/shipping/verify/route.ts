import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({ error: 'Platform shipping purchases are not enabled. Vendors arrange shipping with their carrier and add tracking to the order.' }, { status: 410 }) }
