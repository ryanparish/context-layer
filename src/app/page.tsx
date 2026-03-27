import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-zinc-100 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">Unify enterprise learning and workflow context</h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          xAPIvate connects enterprise systems and LRS data, converts activity into xAPI, and powers
          automations + dashboards in one secure platform.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            href="/signup"
          >
            Start free
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
