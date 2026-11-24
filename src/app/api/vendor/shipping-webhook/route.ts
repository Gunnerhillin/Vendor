import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({ error: 'Legacy shipping tokens are retired. Use authenticated vendor order controls.' }, { status: 410 }) }
