export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <span
        aria-hidden="true"
        className="inline-block size-8 shrink-0 rounded-lg"
        style={{ background: 'var(--tmx-brand-gradient)' }}
      />
      {!compact && (
        <span className="text-sm leading-tight font-bold tracking-tight">
          TAMIX <span className="tmx-brand-text">MEDIA STUDIO</span>
        </span>
      )}
    </div>
  );
}
