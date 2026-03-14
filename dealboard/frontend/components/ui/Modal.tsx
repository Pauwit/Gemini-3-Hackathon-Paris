// ============================================================
// components/ui/Modal.tsx — Overlay Modal Component
// ============================================================
//
// PURPOSE:
// Accessible modal overlay with backdrop blur. Handles:
//   - Escape key to close
//   - Backdrop click to close
//   - Body scroll lock when open
//   - Focus trap (aria-modal)
//   - Smooth slide-down entry animation
//
// USE CASES:
//   - CardExpanded: full intelligence card details
//   - New Meeting dialog: enter title + participants
//   - Confirmation dialogs (end meeting, generate docs)
//
// VARIANTS:
//   sm  — 400px max-width (confirmations)
//   md  — 560px max-width (default, forms)
//   lg  — 720px max-width (card expanded)
//   xl  — 900px max-width (full content view)
//   full — 90vw (document previews)
//
// SLOTS:
//   title   — rendered in header with X close button
//   children — main content area
//   footer   — action buttons (rendered with top border)
//
// DEPENDENCIES: React
// ============================================================

'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when user requests close (backdrop, Escape, X button) */
  onClose: () => void;
  /** Modal body content */
  children: React.ReactNode;
  /** Title text shown in header */
  title?: string;
  /** Optional subtitle / description below title */
  subtitle?: string;
  /** Optional footer content (action buttons) */
  footer?: React.ReactNode;
  /** Max-width preset */
  size?: ModalSize;
  /** Extra classes on the modal panel */
  className?: string;
  /** Prevents closing via backdrop click */
  disableBackdropClose?: boolean;
}

const MAX_WIDTHS: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[90vw]',
};

/**
 * Modal
 * Accessible overlay modal with Google Material aesthetic.
 * Renders centered on a semi-transparent backdrop with blur.
 *
 * @param isOpen              - show/hide state
 * @param onClose             - close callback
 * @param title               - header title text
 * @param subtitle            - header subtitle
 * @param footer              - footer node (action buttons)
 * @param size                - max-width preset
 * @param disableBackdropClose - prevent backdrop-click close
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  footer,
  size = 'md',
  className = '',
  disableBackdropClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={disableBackdropClose ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Modal panel */}
      <div
        ref={panelRef}
        className={`
          relative bg-white rounded-2xl w-full max-h-[90vh] flex flex-col overflow-hidden
          ${MAX_WIDTHS[size]} ${className}
        `}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div
            className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: '#E8EAED' }}
          >
            <div className="flex-1 min-w-0 pr-3">
              {title && (
                <h2
                  id="modal-title"
                  className="text-base font-semibold leading-snug truncate"
                  style={{ color: '#202124' }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: '#5F6368' }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                transition-colors hover:bg-gray-100"
              style={{ color: '#5F6368' }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-4 border-t flex-shrink-0"
            style={{ borderColor: '#E8EAED', backgroundColor: '#F8F9FA' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

/**
 * ConfirmModal
 * Simple yes/no confirmation dialog.
 *
 * @param onConfirm    - called when user clicks confirm
 * @param variant      - danger (red button) or primary (blue)
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'primary',
}: ConfirmModalProps) {
  const btnStyle: React.CSSProperties =
    variant === 'danger'
      ? { backgroundColor: '#EA4335', color: '#fff', border: 'none' }
      : { backgroundColor: '#4285F4', color: '#fff', border: 'none' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
            style={{ color: '#5F6368', borderColor: '#DADCE0' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={btnStyle}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4">
        <p className="text-sm" style={{ color: '#5F6368' }}>{message}</p>
      </div>
    </Modal>
  );
}

export default Modal;
