import Link from 'next/link'
import {createServerSupabaseClient} from '@/lib/supabase/server'
export const dynamic='force-dynamic'
export const metadata={title:'Refund & Return Policy'}
export default async function RefundPolicyPage(){
 const db=await createServerSupabaseClient()
 const {data}=await db.from('site_settings').select('value').eq('key','launch_config').maybeSingle()
 const policy=data?.value
 return <main className="max-w-3xl mx-auto px-4 py-12 space-y-6"><h1 className="text-3xl font-bold">Refund & Return Policy</h1>{!policy?.policies_confirmed?<p>Our launch return terms are being finalized. Checkout should remain closed to real purchases until these terms are published.</p>:<>
 <p>For purchases from {policy.company_name}, request a return within {policy.return_window_days} days after delivery.</p>
 <h2 className="font-semibold text-xl">Return conditions</h2><p className="whitespace-pre-wrap">{policy.return_condition}</p>
 <h2 className="font-semibold text-xl">How to request a return</h2><ol className="list-decimal pl-6 space-y-2"><li>Open your order history and request a return for the delivered item.</li><li>Describe the issue. Wait for approval and shipping instructions before sending anything back.</li><li>The returned items must be received and reviewed before the refund is processed.</li><li>Your return is marked completed only after payment-provider confirmation. Your bank may take additional time to show the refund.</li></ol>
 <p>For help with a return decision, contact <a className="underline" href={`mailto:${policy.support_email}`}>{policy.support_email}</a>.</p></>}
 <Link className="underline" href="/account/orders">Open my orders</Link></main>
}
