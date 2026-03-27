const useCases = [
  "Learning + CRM correlation for enablement outcomes",
  "Compliance event tracing across LMS and HRIS",
  "Support knowledge consumption tied to ticket quality",
  "Course telemetry enrichment from Storyline variables",
];

export default function UseCasesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Use Cases</h1>
      <ul className="mt-8 grid gap-3">
        {useCases.map((item) => (
          <li key={item} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-200">
            {item}
          </li>
        ))}
      </ul>
    </main>
  );
}

