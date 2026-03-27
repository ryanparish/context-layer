export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">About xAPIvate</h1>
      <p className="mt-4 text-zinc-300">
        We help teams unify fragmented enterprise event data into a trusted xAPI layer that powers automation,
        reporting, and measurable learning impact.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Enterprise Integrations", "Connect common SaaS apps and LRS endpoints with secure credentials."],
          ["Automation Engine", "Trigger downstream actions from xAPI events in near real-time."],
          ["Decision Dashboards", "Track trends, engagement, and outcomes with live metrics."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="font-semibold text-zinc-100">{title}</h2>
            <p className="mt-2 text-sm text-zinc-300">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

