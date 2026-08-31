import { useEffect } from 'react'

const revealSelector = [
  '.sera-home-featured > .sera-section-head',
  '.sera-dish-row',
  '.sera-menu-head > *',
  '.sera-filter-group',
  '.sera-menu-results-head',
  '.sera-menu-item',
  '.sera-detail-grid > *',
  '.sera-page-head > *',
  '.sera-page > section',
  '.sera-page > form',
  '.sera-page > .grid',
  '.sera-page .sera-panel',
  '.sera-empty > *',
  '.sera-footer-main > *',
  '.sera-footer-bottom > *',
].join(',')

function motionOrder(element: HTMLElement) {
  if (!element.parentElement) return 0
  const index = Array.from(element.parentElement.children).indexOf(element)
  return Math.min(Math.max(index, 0) % 6, 5)
}

export default function MotionEffects() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.customer-site')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!site) return

    let revealObserver: IntersectionObserver | null = null
    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('motion-visible')
          revealObserver?.unobserve(entry.target)
        })
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    }

    function prepare(root: ParentNode) {
      const candidates: HTMLElement[] = []
      if (root instanceof HTMLElement && root.matches(revealSelector)) candidates.push(root)
      root.querySelectorAll<HTMLElement>(revealSelector).forEach(element => candidates.push(element))

      candidates.forEach(element => {
        if (element.dataset.motionBound === 'true') return
        element.dataset.motionBound = 'true'
        element.style.setProperty('--motion-order', String(motionOrder(element)))
        if (!revealObserver) return
        element.classList.add('motion-reveal')
        revealObserver.observe(element)
      })
    }

    let mutationObserver: MutationObserver | null = null
    if (revealObserver) {
      prepare(site)
      mutationObserver = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) prepare(node)
          })
        })
      })
      mutationObserver.observe(site, { childList: true, subtree: true })
    }

    const header = site.querySelector<HTMLElement>('.sera-header')
    const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12)
    syncHeader()
    window.addEventListener('scroll', syncHeader, { passive: true })

    return () => {
      revealObserver?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener('scroll', syncHeader)
    }
  }, [])

  return null
}
