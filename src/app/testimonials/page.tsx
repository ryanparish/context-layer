const quotes = [
  {
    quote: "xAPIvate gave us one place to connect LMS, CRM, and support telemetry into xAPI.",
    person: "Director of Learning Ops, Mid-market SaaS",
  },
  {
    quote: "We cut manual reporting time in half and finally trust our event data lineage.",
    person: "Enablement Analytics Lead, Enterprise Consulting",
  },
  {
    quote: "The Storyline bridge made secure xAPI statement delivery much easier for our content team.",
    person: "Digital Learning Manager, Global Manufacturer",
  },
];

export default function TestimonialsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Testimonials</h1>
      <div className="mt-8 space-y-4">
        {quotes.map((item) => (
          <blockquote key={item.person} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-zinc-100">"{item.quote}"</p>
            <footer className="mt-3 text-sm text-zinc-400">- {item.person}</footer>
          </blockquote>
        ))}
      </div>
    </main>
  );
}

