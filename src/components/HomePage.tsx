type HomePageProps = {
  description: string;
};

export function HomePage({ description }: HomePageProps) {
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title">
        <span>Denis</span>
        <span>Koterov</span>
      </h1>
      <p className="hero-description">{description}</p>
    </section>
  );
}
