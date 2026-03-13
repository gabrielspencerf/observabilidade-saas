/**
 * Seção em card. Design System: brand-surface, brand-border.
 */

export function PageSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-brand-border bg-brand-surface px-6 py-8 shadow-sm sm:px-8 md:px-10 md:pt-10 md:pb-6 ${className}`}
    >
      {children}
    </section>
  );
}
