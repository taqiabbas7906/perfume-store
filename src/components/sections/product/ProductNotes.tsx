interface ProductNote {
  name: string
  icon: string
}

interface ProductNotesProps {
  topNotes: ProductNote[]
  heartNotes: ProductNote[]
  baseNotes: ProductNote[]
}

const tierStyles = {
  top: {
    dot: 'bg-[#f0e0c0]',
    border: 'border-[var(--color-border)]',
    bg: 'bg-[var(--color-cream-100)]',
    text: 'text-[var(--color-gold)]',
    iconBg: 'bg-[var(--color-cream-400)]',
  },
  heart: {
    dot: 'bg-[#d4a96a]',
    border: 'border-[#d4a96a]/40',
    bg: 'bg-[var(--color-cream-300)]',
    text: 'text-[#9a6c38]',
    iconBg: 'bg-[#f0e0c0]',
  },
  base: {
    dot: 'bg-[var(--color-gold-deep)]',
    border: 'border-[var(--color-gold-deep)]/30',
    bg: 'bg-[var(--color-cream-400)]',
    text: 'text-[var(--color-ink-muted)]',
    iconBg: 'bg-[var(--color-border)]',
  },
} as const

function NoteGroup({
  label,
  subLabel,
  notes,
  tier,
}: {
  label: string
  subLabel: string
  notes: ProductNote[]
  tier: keyof typeof tierStyles
}) {
  const styles = tierStyles[tier]
  return (
    <div
      className={`relative flex flex-col items-center gap-4 py-8 px-6 border ${styles.border} ${styles.bg}`}
    >
      <div className="flex flex-col items-center gap-1 mb-1">
        <div className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
        <p className={`text-[10px] font-bold tracking-[0.35em] uppercase ${styles.text}`}>
          {label}
        </p>
        <p className="text-[9px] text-gray-400 tracking-wide">{subLabel}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {notes.map((note) => (
          <div key={note.name} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full ${styles.iconBg}`}
            >
              <i className={`${note.icon} text-base ${styles.text}`} />
            </div>
            <span className="text-[10px] text-[var(--color-ink-muted)] font-medium tracking-wide text-center">
              {note.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProductNotes({
  topNotes,
  heartNotes,
  baseNotes,
}: ProductNotesProps) {
  if (
    topNotes.length === 0 &&
    heartNotes.length === 0 &&
    baseNotes.length === 0
  ) {
    return null
  }

  return (
    <section className="py-12 lg:py-16 border-t border-[var(--color-border-soft)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-bold mb-2">
            Scent Profile
          </p>
          <h2 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
            The Notes Pyramid
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            Every fragrance unfolds in layers — from the first impression to the
            lasting dry-down
          </p>
        </div>

        <div className="flex flex-col items-center gap-0 max-w-2xl mx-auto">
          {topNotes.length > 0 && (
            <div className="w-full md:w-2/3">
              <NoteGroup
                label="Top Notes"
                subLabel="First Impression · 15–30 min"
                notes={topNotes}
                tier="top"
              />
            </div>
          )}
          {heartNotes.length > 0 && (
            <div className="w-full">
              <NoteGroup
                label="Heart Notes"
                subLabel="The Signature · 2–4 hours"
                notes={heartNotes}
                tier="heart"
              />
            </div>
          )}
          {baseNotes.length > 0 && (
            <div className="w-full md:w-3/4">
              <NoteGroup
                label="Base Notes"
                subLabel="The Foundation · 4–10+ hours"
                notes={baseNotes}
                tier="base"
              />
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto mt-8">
          <div className="flex items-center gap-0 h-2">
            <div className="flex-1 h-full bg-[#f0e0c0]" />
            <div className="flex-1 h-full bg-[#d4a96a]" />
            <div className="flex-1 h-full bg-[var(--color-gold-deep)]" />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 tracking-wide mt-1.5">
            <span>Application</span>
            <span>2 hours</span>
            <span>4 hours</span>
            <span>10+ hours</span>
          </div>
        </div>
      </div>
    </section>
  )
}
