import { cn } from '@/lib/utils';

/**
 * Ícone brasileiro do dingbat "Brasil Icons" — cada caractere desenha um ícone
 * (ex.: 'D' = tucano, '^' = bandeira, '8' = café, '7' = carnaval, '$' = sol,
 * 'a' = Cristo, '5' = palmeira, 'y' = arara). É decorativo: `aria-hidden`.
 * Monocromático (herda currentColor), então casa com o tema neutro.
 */
export function BrIcon({ c, className }: { c: string; className?: string }) {
  return (
    <span aria-hidden className={cn('font-brasil inline-block select-none', className)}>
      {c}
    </span>
  );
}
