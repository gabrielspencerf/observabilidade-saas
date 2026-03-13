/**
 * Cabeçalho de colunas para listagem. Paleta CL: fundo surface, texto muted.
 */

export function ListTableHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between rounded-full bg-brand-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-brand-muted sm:px-6 ${className}`}
      role="row"
    >
      {children}
    </div>
  );
}
