import { useEffect } from 'react'

const revealSelector = [
  '.sera-home-hero-copy > *',
  '.sera-home-visual',
  '.sera-home-facts > *',
  '.sera-home-featured > .sera-section-head',
  '.sera-dish-row',
  '.sera-home-reservation > *',
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
  '.sera-page article',
  '.sera-page [data-slot="alert"]',
  '.sera-page [data-slot="tabs-list"]',
  '.sera-page [data-slot="tabs-content"]',
  '.sera-empty > *',
].join(',')

const interactiveSelector = [
  'a[href]',
  'button:not(:disabled)',
  '[role="button"]',
  '[data-slot="button"]',
  '[data-slot="tabs-trigger"]',
  '[data-slot="select-trigger"]',
  '[data-slot="dropdown-menu-trigger"]',
  '[data-slot="popover-trigger"]',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '.sera-filter-button',
  '.sera-dish-row',
  '.sera-menu-item',
].join(',')

function motionOrder(element: HTMLElement) {
  if (!element.parentElement) return 0
  const index = Array.from(element.parentElement.children).indexOf(element)
  return Math.min(Math.max(index, 0) % 6, 5)
}

function closestInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(interactiveSelector)
}

export default function MotionEffects() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.customer-site')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!site) return

    const boundElements = new Set<HTMLElement>()
    const interactiveElements = new Set<HTMLElement>()
    let scrollDirection: 'up' | 'down' = 'down'
    let lastScrollY = window.scrollY
    let revealObserver: IntersectionObserver | null = null

    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement

          if (entry.isIntersecting) {
            element.classList.toggle('motion-from-above', scrollDirection === 'up')
            element.classList.toggle('motion-from-below', scrollDirection === 'down')
            element.classList.add('motion-visible')
            return
          }

          element.classList.remove('motion-visible')
          const leftThroughTop = entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top < 0
          element.classList.toggle('motion-from-above', leftThroughTop)
          element.classList.toggle('motion-from-below', !leftThroughTop)
        })
      }, { rootMargin: '-4% 0px -8% 0px', threshold: 0.08 })
    }

    function prepareReveal(root: ParentNode) {
      const candidates: HTMLElement[] = []
      if (root instanceof HTMLElement && root.matches(revealSelector)) candidates.push(root)
      root.querySelectorAll<HTMLElement>(revealSelector).forEach(element => candidates.push(element))

      candidates.forEach(element => {
        if (element.dataset.motionBound === 'true') return
        element.dataset.motionBound = 'true'
        boundElements.add(element)
        element.style.setProperty('--motion-order', String(motionOrder(element)))
        if (!revealObserver) return
        element.classList.add('motion-reveal', 'motion-from-below')
        revealObserver.observe(element)
      })
    }

    function prepareInteractive(root: ParentNode) {
      const candidates: HTMLElement[] = []
      if (root instanceof HTMLElement && root.matches(interactiveSelector)) candidates.push(root)
      root.querySelectorAll<HTMLElement>(interactiveSelector).forEach(element => candidates.push(element))

      candidates.forEach(element => {
        if (element.dataset.motionInteractive === 'true') return
        element.dataset.motionInteractive = 'true'
        element.classList.add('motion-interactive')
        interactiveElements.add(element)
      })
    }

    prepareReveal(site)
    prepareInteractive(site)

    const mutationObserver = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return
          prepareReveal(node)
          prepareInteractive(node)
        })
      })
    })
    mutationObserver.observe(site, { childList: true, subtree: true })

    const header = site.querySelector<HTMLElement>('.sera-header')
    let viewportFrame = 0
    const syncViewportMotion = () => {
      viewportFrame = 0
      const nextScrollY = window.scrollY
      const delta = nextScrollY - lastScrollY
      if (Math.abs(delta) > 2) scrollDirection = delta > 0 ? 'down' : 'up'
      lastScrollY = nextScrollY

      header?.classList.toggle('is-scrolled', nextScrollY > 12)
      site.classList.toggle('is-scrolling-down', scrollDirection === 'down' && nextScrollY > 20)
      site.classList.toggle('is-scrolling-up', scrollDirection === 'up' && nextScrollY > 20)

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, nextScrollY / maxScroll)) : 0
      site.style.setProperty('--sera-scroll-progress', progress.toFixed(4))
    }
    const queueViewportSync = () => {
      if (viewportFrame) return
      viewportFrame = window.requestAnimationFrame(syncViewportMotion)
    }

    let pressedElement: HTMLElement | null = null
    let releaseTimer = 0
    const clearPressed = () => {
      if (!pressedElement) return
      pressedElement.classList.remove('motion-pressed')
      pressedElement = null
    }
    const releasePressed = () => {
      if (releaseTimer) window.clearTimeout(releaseTimer)
      releaseTimer = window.setTimeout(clearPressed, 90)
    }
    const handlePointerDown = (event: PointerEvent) => {
      const element = closestInteractive(event.target)
      if (!element || !site.contains(element)) return
      if (releaseTimer) window.clearTimeout(releaseTimer)
      clearPressed()
      pressedElement = element
      element.classList.add('motion-pressed')
    }
    const handleClick = (event: MouseEvent) => {
      const element = closestInteractive(event.target)
      if (!element || !site.contains(element) || reduceMotion) return
      element.classList.remove('motion-activated')
      void element.offsetWidth
      element.classList.add('motion-activated')
      window.setTimeout(() => element.classList.remove('motion-activated'), 360)
    }

    syncViewportMotion()
    window.addEventListener('scroll', queueViewportSync, { passive: true })
    window.addEventListener('resize', queueViewportSync, { passive: true })
    site.addEventListener('pointerdown', handlePointerDown)
    site.addEventListener('pointerup', releasePressed)
    site.addEventListener('pointercancel', releasePressed)
    site.addEventListener('pointerleave', releasePressed)
    site.addEventListener('click', handleClick)

    return () => {
      revealObserver?.disconnect()
      mutationObserver.disconnect()
      if (viewportFrame) window.cancelAnimationFrame(viewportFrame)
      if (releaseTimer) window.clearTimeout(releaseTimer)
      window.removeEventListener('scroll', queueViewportSync)
      window.removeEventListener('resize', queueViewportSync)
      site.removeEventListener('pointerdown', handlePointerDown)
      site.removeEventListener('pointerup', releasePressed)
      site.removeEventListener('pointercancel', releasePressed)
      site.removeEventListener('pointerleave', releasePressed)
      site.removeEventListener('click', handleClick)
      clearPressed()
      site.classList.remove('is-scrolling-down', 'is-scrolling-up')
      site.style.removeProperty('--sera-scroll-progress')

      boundElements.forEach(element => {
        element.classList.remove('motion-reveal', 'motion-visible', 'motion-from-above', 'motion-from-below')
        delete element.dataset.motionBound
        element.style.removeProperty('--motion-order')
      })
      interactiveElements.forEach(element => {
        element.classList.remove('motion-interactive', 'motion-pressed', 'motion-activated')
        delete element.dataset.motionInteractive
      })
    }
  }, [])

  return null
}
