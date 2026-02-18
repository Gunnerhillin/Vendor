import Link from 'next/link'

export default function VendorCTA() {
  return (
    <div className="bg-gradient-to-br from-primary to-[#3D3530] rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
      <div className="text-center md:text-left">
        <h2 className="font-display text-2xl md:text-3xl text-white font-semibold mb-3">Sell on Vender</h2>
        <p className="text-white/70 text-sm max-w-lg">
          Join hundreds of independent brands reaching thousands of new customers every day.
          Simple onboarding, powerful tools, and a dedicated audience ready to shop.
        </p>
      </div>
      <Link href="/vendor/apply" className="btn-accent whitespace-nowrap text-base px-10">
        Apply to Sell &rarr;
      </Link>
    </div>
  )
}
