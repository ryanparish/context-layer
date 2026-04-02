import { TenantApiKeysPanel } from "./TenantApiKeysPanel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Settings</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Tenant API access for integrations (Bearer tokens) and other configuration.
        </p>
      </div>

      <TenantApiKeysPanel />

      <div className="panel p-5">
        <div className="text-sm font-semibold text-slate-800">Coming next</div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Manage tenant profile and branding</li>
          <li>Invite users and assign roles</li>
        </ul>
      </div>
    </div>
  );
}
