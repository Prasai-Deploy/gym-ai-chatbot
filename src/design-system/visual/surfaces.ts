/**
 * STRIVA v4 Visual System - Surface Architecture
 * Hierarchy: Void -> Base -> Surface (Panel) -> Elevated -> Focus
 */

export const visualSurfaces = {
  // Surface Token Styles
  void: {
    background: '#050608',
    className: 'bg-[#050608]',
  },
  base: {
    background: '#090B10',
    className: 'bg-[#090B10]',
  },
  panel: {
    background: '#11141D',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    className: 'bg-[#11141D] border border-white/[0.07]',
  },
  elevated: {
    background: '#181C28',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    className: 'bg-[#181C28] border border-white/[0.10]',
  },
  focus: {
    background: '#1F2433',
    border: '1px solid rgba(249, 115, 22, 0.35)',
    className: 'bg-[#1F2433] border border-orange-500/35',
  },
  ai: {
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px solid rgba(99, 102, 241, 0.22)',
    className: 'bg-indigo-500/[0.06] border border-indigo-500/20',
  },
} as const;

export type VisualSurfaces = typeof visualSurfaces;
