import Link from "next/link";

const tiers = [
  { name: "Starter", price: "$99/mo", blurb: "Small teams validating integrations and xAPI flows." },
  { name: "Growth", price: "$399/mo", blurb: "Production automations, scheduling, and advanced dashboards." },
  { name: "Enterprise", price: "Contact us", blurb: "SSO, custom connectors, security review, and SLA support." },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Pricing</h1>
      <p className="mt-3 text-zinc-300">Simple plans for teams scaling learning intelligence across systems.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <section key={tier.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">{tier.name}</h2>
            <p className="mt-2 text-2xl font-bold text-orange-400">{tier.price}</p>
            <p className="mt-2 text-sm text-zinc-300">{tier.blurb}</p>
          </section>
        ))}
      </div>
      <div className="mt-8">
        <Link href="/signup" className="btn-primary">
          Start free trial
        </Link>
      </div>
    </main>
  );
}

