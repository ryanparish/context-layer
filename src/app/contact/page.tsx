export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Contact</h1>
      <p className="mt-3 text-zinc-300">Talk with us about architecture, security requirements, and rollout plans.</p>

      <form className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="grid gap-4">
          <div>
            <label className="text-sm text-zinc-200">Name</label>
            <input className="field" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm text-zinc-200">Work email</label>
            <input className="field" placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-sm text-zinc-200">Message</label>
            <textarea className="field min-h-[120px]" placeholder="What are you trying to connect?" />
          </div>
          <button type="button" className="btn-primary w-fit">
            Send inquiry
          </button>
        </div>
      </form>
    </main>
  );
}

