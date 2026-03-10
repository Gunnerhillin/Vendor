import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="group bg-white rounded-2xl shadow-soft text-center py-6 px-3
                     transition-all duration-300 ease-out
                     hover:shadow-lg hover:-translate-y-1.5 hover:border-accent
                     border border-transparent"
        >
          <span className="text-3xl md:text-4xl block mb-3 transition-transform duration-300 group-hover:scale-110">
            {cat.icon}
          </span>
          <h3 className="text-xs md:text-sm font-semibold transition-colors duration-300 group-hover:text-accent-dark">
            {cat.name}
          </h3>
        </Link>
      ))}
    </div>
  )
}
