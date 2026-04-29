import React, { useState, useEffect, useRef } from 'react'
import { MoreHorizontal } from 'lucide-react'

export default function DotMenu({ options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="dot-menu-wrap" ref={ref}>
      <button className="dot-menu" onClick={() => setOpen(!open)}><MoreHorizontal size={16} /></button>
      {open && (
        <div className="dot-dropdown">
          {options.map((opt, i) => (
            <button key={i} className={opt.danger ? 'danger' : ''} onClick={() => { opt.onClick(); setOpen(false) }}>
              {opt.icon && <opt.icon size={13} />} {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
