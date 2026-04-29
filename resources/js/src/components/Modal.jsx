import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Archive, Trash2, ShieldAlert } from 'lucide-react'

export default function Modal({ open, onClose, title, children, footer, size }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal animate-in${size === 'large' ? ' modal-lg' : size === 'small' ? ' modal-sm' : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ 
  open, onClose, onConfirm, title, message, 
  confirmLabel, confirmText, confirmVariant = 'danger',
  requireTypedConfirmation, typedConfirmationWord
}) {
  const [typed, setTyped] = useState('')
  const needsTyping = !!requireTypedConfirmation
  const targetWord = typedConfirmationWord || 'DELETE'
  const isTypedCorrectly = typed.trim().toUpperCase() === targetWord.toUpperCase()

  // Reset typed text when dialog opens/closes
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  if (!open) return null

  const variant = confirmVariant
  const isDanger = variant === 'danger'
  const isArchive = variant === 'primary' || variant === 'archive'

  const icon = isDanger 
    ? <ShieldAlert size={38} /> 
    : <Archive size={38} />
  
  const iconBg = isDanger 
    ? 'rgba(231, 76, 60, 0.1)' 
    : 'rgba(230, 126, 34, 0.1)'
  const iconColor = isDanger ? '#e74c3c' : '#e67e22'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="confirm-dialog-v2 animate-in">
        {/* Icon */}
        <div className="cd-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>

        {/* Title */}
        <h3 className="cd-title">{title || 'Confirm Action'}</h3>

        {/* Message */}
        <div className="cd-message">{message || 'Are you sure you want to proceed?'}</div>

        {/* Typed confirmation input */}
        {needsTyping && (
          <div className="cd-type-confirm">
            <div className="cd-type-label">
              Type <strong>{targetWord}</strong> below to confirm this action:
            </div>
            <input
              className="cd-type-input"
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={targetWord}
              autoFocus
              spellCheck="false"
              autoComplete="off"
            />
            {typed.length > 0 && !isTypedCorrectly && (
              <div className="cd-type-hint">
                <AlertTriangle size={12} /> Typed text does not match
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="cd-actions">
          <button className="btn btn-outline cd-btn" onClick={onClose}>Cancel</button>
          <button 
            className={`btn cd-btn ${isDanger ? 'cd-btn-danger' : 'cd-btn-archive'}`}
            onClick={() => { onConfirm(); setTyped('') }}
            disabled={needsTyping && !isTypedCorrectly}
          >
            {isDanger && <Trash2 size={14} />}
            {isArchive && <Archive size={14} />}
            {confirmText || confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
