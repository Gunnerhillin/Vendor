import {NextResponse} from 'next/server'
export async function POST(){return NextResponse.json({error:'Coupon codes are not available for this launch. Approved product offers are priced automatically.'},{status:409})}
