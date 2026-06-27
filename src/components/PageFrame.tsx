import type { PropsWithChildren } from 'react';

export function PageFrame({ children }: PropsWithChildren) {
  return (
    <div className="site-shell">
      <main>{children}</main>
    </div>
  );
}
