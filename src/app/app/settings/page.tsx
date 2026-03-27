export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Settings</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Tenant configuration, API keys, and access controls will live here.
        </p>
      </div>

      <div className="panel p-5">
        <div className="text-sm font-semibold text-slate-800">Coming next</div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Manage tenant profile and branding</li>
          <li>Invite users and assign roles</li>
          <li>Rotate API keys and secrets</li>
        </ul>
      </div>
    </div>
  );
}

