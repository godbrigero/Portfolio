const phases = [
  {
    label: '01',
    title: 'Airframe that survives mistakes',
    detail:
      'Start with a boring, repairable quad frame. The first objective is repeatable assembly, clean wiring, predictable weight distribution, and enough room to swap sensors without rebuilding the whole vehicle.',
    proof: 'Bench-tested power train, labeled harnesses, removable compute stack.',
  },
  {
    label: '02',
    title: 'Manual flight before autonomy',
    detail:
      'Tune stabilization, learn failure modes, and log every crash. The drone needs to be trustworthy as a normal aircraft before it gets permission to make decisions.',
    proof: 'Stable hover, controlled takeoff and landing, known failsafe behavior.',
  },
  {
    label: '03',
    title: 'Perception pipeline',
    detail:
      'Add the eyes: camera, depth, IMU, barometer, and GPS where it makes sense. The goal is not just collecting data, but turning noisy inputs into a useful local picture of the world.',
    proof: 'Timestamped sensor logs, synced frames, calibration notes.',
  },
  {
    label: '04',
    title: 'Simulation first',
    detail:
      'Build the autonomy loop in simulation before risking hardware. Every planner change should survive a fake flight full of wind, delayed sensor updates, and awkward obstacle layouts.',
    proof: 'Repeatable sim missions, regression scenarios, saved route traces.',
  },
  {
    label: '05',
    title: 'Autonomous missions',
    detail:
      'Move from waypoint following to mission intent: inspect this area, avoid that object, return if confidence drops, and explain what happened after landing.',
    proof: 'Geofenced mission runs, live telemetry, post-flight summaries.',
  },
];

const stack = [
  'PX4 / ArduPilot flight control',
  'ROS 2 mission layer',
  'VIO + GPS fallback',
  'Depth-aware path planning',
  'Onboard inference for obstacles',
  'Ground station telemetry',
];

export default function AutonomousDroneJourney() {
  return (
    <main className="drone-page">
      <style>{`
        .drone-page {
          min-height: 150vh;
          padding: 20px 0 56px;
          color: #f3f0e8;
        }

        .drone-kicker {
          margin: 0 0 14px;
          color: rgba(243, 240, 232, 0.46);
          font: 500 0.78rem/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .drone-title {
          max-width: 620px;
          margin: 0;
          font-size: clamp(2.35rem, 5vw, 5rem);
          line-height: 0.95;
          letter-spacing: 0;
        }

        .drone-intro {
          max-width: 560px;
          margin: 24px 0 34px;
          color: rgba(243, 240, 232, 0.62);
          font-size: clamp(1rem, 1.4vw, 1.22rem);
          line-height: 1.55;
        }

        .drone-status {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          max-width: 620px;
          margin: 0 0 42px;
        }

        .drone-stat {
          padding: 0 0 12px;
          border-bottom: 1px solid rgba(243, 240, 232, 0.18);
        }

        .drone-stat strong {
          display: block;
          font-size: 1.55rem;
          line-height: 1;
        }

        .drone-stat span {
          display: block;
          margin-top: 8px;
          color: rgba(243, 240, 232, 0.48);
          font-size: 0.82rem;
          line-height: 1.35;
        }

        .drone-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 22px;
          max-width: 680px;
        }

        .drone-phase {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          gap: 18px;
        }

        .drone-phase code {
          color: rgba(185, 210, 255, 0.82);
          font: 500 0.8rem/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .drone-phase h2 {
          margin: 0;
          font-size: 1.08rem;
          line-height: 1.2;
        }

        .drone-phase p {
          margin: 10px 0 0;
          color: rgba(243, 240, 232, 0.58);
          line-height: 1.55;
        }

        .drone-phase small {
          display: block;
          margin-top: 10px;
          color: rgba(243, 240, 232, 0.42);
          font: 500 0.78rem/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .drone-stack {
          max-width: 620px;
          margin-top: 46px;
          padding-top: 22px;
          border-top: 1px solid rgba(243, 240, 232, 0.16);
        }

        .drone-stack h2 {
          margin: 0 0 16px;
          font-size: 1rem;
        }

        .drone-stack ul {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 18px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .drone-stack li {
          color: rgba(243, 240, 232, 0.58);
          line-height: 1.35;
        }

        .drone-stack li::before {
          content: '$ ';
          color: rgba(185, 210, 255, 0.82);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        @media (max-width: 720px) {
          .drone-status,
          .drone-stack ul {
            grid-template-columns: 1fr;
          }

          .drone-phase {
            grid-template-columns: 38px minmax(0, 1fr);
          }
        }
      `}</style>

      <p className="drone-kicker">open_source / autonomy</p>
      <h1 className="drone-title">Toward a fully autonomous drone.</h1>
      <p className="drone-intro">
        The roadmap is simple: build a drone that can understand where it is, decide where it
        should go, avoid what would break it, and come back with a clear explanation of the flight.
      </p>

      <section className="drone-status" aria-label="Project status">
        <div className="drone-stat">
          <strong>5</strong>
          <span>major build phases from airframe to autonomy</span>
        </div>
        <div className="drone-stat">
          <strong>3</strong>
          <span>feedback loops: sim, bench, field</span>
        </div>
        <div className="drone-stat">
          <strong>1</strong>
          <span>target: reliable mission-level flight</span>
        </div>
      </section>

      <section className="drone-grid" aria-label="Build journey">
        {phases.map((phase) => (
          <article className="drone-phase" key={phase.label}>
            <code>{phase.label}</code>
            <div>
              <h2>{phase.title}</h2>
              <p>{phase.detail}</p>
              <small>{phase.proof}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="drone-stack" aria-label="Likely technical stack">
        <h2>Likely stack</h2>
        <ul>
          {stack.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
