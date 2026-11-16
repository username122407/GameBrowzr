import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

// Custom Aurora menu: avoids operating-system native select popups.
export default function AuroraSelect({ value, options, onChange, label, className = '', icon: Icon, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const root = useRef(null)
  const trigger = useRef(null)
  const items = useRef([])
  const normalized = options.map(item => typeof item === 'string' ? { value: item, label: item } : item)
  const selected = normalized.find(item => item.value === value) || normalized[0]
  useEffect(() => {
    if (!open) return
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  useEffect(() => { if (open) items.current[cursor]?.scrollIntoView({ block: 'nearest' }) }, [open, cursor])
  const choose = item => { onChange(item.value); setOpen(false); trigger.current?.focus() }
  const keyDown = event => {
    if (!open && disabled) return
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); return }
    if (event.key === 'Tab') setOpen(false)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { setCursor(Math.max(0, normalized.findIndex(item => item.value === value))); setOpen(true) }
      else setCursor(current => (current + (event.key === 'ArrowDown' ? 1 : -1) + normalized.length) % normalized.length)
    }
    if (event.key === 'Home' && open) { event.preventDefault(); setCursor(0) }
    if (event.key === 'End' && open) { event.preventDefault(); setCursor(normalized.length - 1) }
    if ((event.key === 'Enter' || event.key === ' ') && open) { event.preventDefault(); choose(normalized[cursor]) }
  }
  return <div className={`aurora-select ${className} ${open ? 'is-open' : ''}`} ref={root} onKeyDown={keyDown}>
    <button type="button" ref={trigger} disabled={disabled} className="aurora-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setCursor(Math.max(0, normalized.findIndex(item => item.value === value))); setOpen(o => !o) }}>
      {Icon && <Icon size={15} aria-hidden="true" />}<span>{selected?.label}</span><ChevronDown size={15} className="aurora-chevron" aria-hidden="true" />
    </button>
    {open && <div className="aurora-select-menu" role="listbox" aria-label={label}>
      {normalized.map((item, index) => <button type="button" key={item.value} ref={el => { items.current[index] = el }} tabIndex={-1} role="option" aria-selected={item.value === value} className={`aurora-option ${index === cursor ? 'is-highlighted' : ''}`} onMouseEnter={() => setCursor(index)} onClick={() => choose(item)}><span>{item.label}</span>{item.value === value && <Check size={15} />}</button>)}
    </div>}
  </div>
}

