import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'

const pageSize = 12

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type SortOption = 'default' | 'name' | 'price-asc' | 'price-desc'

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MenuPage({ data }: { data: CustomerSiteBootstrap }) {
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<SortOption>('default')
  const [page, setPage] = useState(1)
  const deferredKeyword = useDeferredValue(keyword.trim().toLocaleLowerCase('vi'))

  const categoryIdsWithItems = useMemo(
    () => new Set(data.menuItems.map(item => item.menuCategoryId)),
    [data.menuItems],
  )

  const categories = useMemo(
    () => data.menuCategories.filter(category => categoryIdsWithItems.has(category.id)),
    [categoryIdsWithItems, data.menuCategories],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    data.menuItems.forEach(item => counts.set(item.menuCategoryId, (counts.get(item.menuCategoryId) || 0) + 1))
    return counts
  }, [data.menuItems])

  const items = useMemo(() => {
    const filtered = data.menuItems.filter(item => {
      const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
      const matchesAvailability = availability === 'all'
        || (availability === 'available' ? item.isAvailable : !item.isAvailable)
      const matchesKeyword = !deferredKeyword
        || item.name.toLocaleLowerCase('vi').includes(deferredKeyword)
        || item.description?.toLocaleLowerCase('vi').includes(deferredKeyword)
      return matchesCategory && matchesAvailability && matchesKeyword
    })

    if (sort === 'name') return [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'vi'))
    if (sort === 'price-asc') return [...filtered].sort((left, right) => left.price - right.price)
    if (sort === 'price-desc') return [...filtered].sort((left, right) => right.price - left.price)
    return filtered
  }, [availability, categoryId, data.menuItems, deferredKeyword, sort])

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [currentPage, items])

  function selectCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId)
    setPage(1)
  }

  function updateKeyword(nextKeyword: string) {
    setKeyword(nextKeyword)
    setPage(1)
  }

  function selectAvailability(nextAvailability: AvailabilityFilter) {
    setAvailability(nextAvailability)
    setPage(1)
  }

  function selectSort(nextSort: SortOption) {
    setSort(nextSort)
    setPage(1)
  }

  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1440px,calc(100vw-48px))] py-16 sm:w-[min(1440px,calc(100vw-80px))] md:py-24">
        <header className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-semibold tracking-[0.26em] text-muted-foreground uppercase">Thực đơn nhà hàng</p>
            <h1 className="max-w-5xl font-heading text-[clamp(4rem,7vw,7.5rem)] leading-[0.86] tracking-[-0.055em]">
              Món Việt hôm nay.
            </h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Chọn theo danh mục, tìm theo tên món hoặc sắp xếp theo mức giá phù hợp với bữa ăn của bạn.
            </p>
          </div>

          <label className="relative block border-b border-foreground pb-2">
            <Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Tìm món ăn</span>
            <Input
              className="h-12 border-0 bg-transparent pl-7 pr-0 text-base shadow-none focus-visible:ring-0"
              value={keyword}
              onChange={event => updateKeyword(event.target.value)}
              placeholder="Tìm món..."
            />
          </label>
        </header>

        <div className="mt-8 flex gap-8 overflow-x-auto border-b border-border" role="tablist" aria-label="Danh mục món ăn">
          <button
            type="button"
            role="tab"
            aria-selected={categoryId === 'all'}
            className={`shrink-0 border-b-2 px-0 pb-4 text-[11px] font-semibold tracking-[0.16em] uppercase ${categoryId === 'all' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
            onClick={() => selectCategory('all')}
          >
            Tất cả <span className="ml-2 text-[10px] opacity-60">{data.menuItems.length}</span>
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={categoryId === category.id}
              className={`shrink-0 border-b-2 px-0 pb-4 text-[11px] font-semibold tracking-[0.16em] uppercase ${categoryId === category.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
              onClick={() => selectCategory(category.id)}
            >
              {category.name} <span className="ml-2 text-[10px] opacity-60">{categoryCounts.get(category.id) || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"><SlidersHorizontal className="size-3.5" /> Tình trạng</span>
            {([
              ['all', 'Tất cả'],
              ['available', 'Còn món'],
              ['unavailable', 'Tạm hết'],
            ] as const).map(([value, label]) => (
              <Button key={value} type="button" size="xs" variant={availability === value ? 'default' : 'outline'} onClick={() => selectAvailability(value)}>{label}</Button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Sắp xếp
            <select className="h-9 min-w-44 border border-border bg-background px-3 text-xs normal-case tracking-normal text-foreground outline-none" value={sort} onChange={event => selectSort(event.target.value as SortOption)}>
              <option value="default">Mặc định</option>
              <option value="name">Tên A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase"><strong className="text-foreground">{items.length}</strong> món phù hợp</p>
          <Button variant="link" className="px-0" type="button" onClick={() => navigate('/takeaway')}>Đặt món mang về <ArrowRight data-icon="inline-end" /></Button>
        </div>

        {items.length ? (
          <>
            <div className="mt-7 grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
              {visibleItems.map((item, index) => (
                <button
                  type="button"
                  className="group grid cursor-pointer grid-rows-[300px_auto] border-0 bg-transparent p-0 text-left md:grid-rows-[340px_auto]"
                  key={item.id}
                  onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                  aria-label={`Xem chi tiết ${item.name}`}
                >
                  <span className="relative block overflow-hidden bg-muted">
                    <img
                      src={item.imageUrl || heroImage}
                      className={`${!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]`}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className={`absolute right-3 top-3 border px-2 py-1 text-[9px] font-semibold tracking-[0.14em] uppercase ${item.isAvailable ? 'border-white/70 bg-black/55 text-white' : 'border-destructive/50 bg-background/90 text-destructive'}`}>
                      {item.isAvailable ? 'Còn món' : 'Tạm hết'}
                    </span>
                  </span>
                  <span className="grid gap-3 border-x border-b border-border px-5 py-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{item.menuCategoryName}</span>
                    <span className="flex items-start justify-between gap-4">
                      <span className="font-heading text-3xl leading-none">{item.name}</span>
                      <strong className="shrink-0 text-xs font-semibold tracking-wider">{currency(item.price, data.restaurant?.currency || 'VND')}</strong>
                    </span>
                    <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase">Xem chi tiết <ChevronRight className="size-3.5" /></span>
                  </span>
                </button>
              ))}
            </div>

            {pageCount > 1 ? (
              <nav className="mt-14 flex items-center justify-center gap-4 border-t border-border pt-8" aria-label="Phân trang thực đơn">
                <Button variant="outline" size="icon-sm" type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Trang trước"><ChevronLeft /></Button>
                <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Trang <strong className="text-foreground">{currentPage}</strong> / {pageCount}</span>
                <Button variant="outline" size="icon-sm" type="button" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} aria-label="Trang sau"><ChevronRight /></Button>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="mt-10 grid min-h-80 place-items-center border border-dashed border-border text-center">
            <div className="max-w-md px-6">
              <Utensils className="mx-auto mb-5 size-7 text-muted-foreground" />
              <h2 className="font-heading text-3xl">Chưa tìm thấy món phù hợp</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Thử đổi từ khóa, danh mục hoặc bộ lọc tình trạng món.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
