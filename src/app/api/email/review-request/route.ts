import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({ error: 'Notifications are generated from verified account and order events.' }, { status: 410 }) }
