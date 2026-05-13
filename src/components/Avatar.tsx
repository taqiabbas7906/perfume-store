'use client'

import { CSSProperties } from 'react'

interface AvatarProps {
  name?: string | null
  size?: number
  className?: string
  style?: CSSProperties
  ringColor?: string
}

/**
 * Initials-only avatar. Replaces user-uploaded profile pictures across the
 * application — every account now shows the same generated badge derived
 * from the user's name. The colour palette is deterministic per name so
 * the same user always shows the same avatar.
 */
export function Avatar({
  name,
  size = 40,
  className,
  style,
  ringColor = 'rgba(201,169,110,0.3)',
}: AvatarProps) {
  const trimmed = (name ?? '').trim()
  const initials = trimmed
    ? trimmed
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  // Deterministic gradient from name hash
  const palette = [
    ['#c9a96e', '#a07840'],
    ['#8b5a3c', '#5d3a26'],
    ['#7c3aed', '#4c1d95'],
    ['#0ea5e9', '#075985'],
    ['#10b981', '#065f46'],
    ['#ef4444', '#7f1d1d'],
    ['#f59e0b', '#92400e'],
    ['#ec4899', '#831843'],
  ]
  let hash = 0
  for (const ch of trimmed) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const [from, to] = palette[Math.abs(hash) % palette.length]

  return (
    <div
      role="img"
      aria-label={trimmed ? `${trimmed} avatar` : 'User avatar'}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: `2px solid ${ringColor}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: '"Cormorant Garamond", "Jost", serif',
        fontWeight: 500,
        fontSize: Math.max(12, Math.floor(size * 0.4)),
        letterSpacing: '0.04em',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  )
}

export default Avatar
