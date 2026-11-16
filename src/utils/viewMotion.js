import { flushSync } from 'react-dom'

let running
let sequence = 0

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function swapView(scope, update) {
  const ticket = ++sequence
  running?.skipTransition()
  if (!document.startViewTransition || prefersReducedMotion() || document.visibilityState === 'hidden') {
    if (!document.startViewTransition) document.documentElement.dataset.gbMotionFallback = ''
    update()
    return
  }

  const root = document.documentElement
  root.dataset.gbTransition = scope
  const view = document.startViewTransition(() => {
    if (ticket === sequence) flushSync(update)
  })
  running = view

  const cleanup = () => {
    if (running !== view) return
    delete root.dataset.gbTransition
    running = undefined
  }
  void view.ready.catch(() => {})
  void view.updateCallbackDone.catch(() => {})
  void view.finished.then(cleanup, cleanup)
}
