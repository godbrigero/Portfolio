import type { ReactNode } from 'react';

type HomePageProps = {
  description: string;
};

const inlineLinkPattern = /\(([^)]+)\)\[([^\]]+)\]/g;

function renderDescription(description: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of description.matchAll(inlineLinkPattern)) {
    const [fullMatch, label, href] = match;
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(description.slice(lastIndex, index));
    }

    parts.push(
      <a href={href} key={`${href}-${index}`}>
        {label}
      </a>,
    );

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }

  return parts;
}

export function HomePage({ description }: HomePageProps) {
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title">
        <span>Denis</span>
        <span>Koterov</span>
      </h1>
      <p className="hero-description">{renderDescription(description)}</p>
    </section>
  );
}
