import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="card-hover text-center py-6 px-3"
        >
          <span className="text-3xl md:text-4xl block mb-3">{cat.icon}</span>
          <h3 className="text-xs md:text-sm font-semibold">{cat.name}</h3>
        </Link>
      ))}
    </div>
  )
}
