/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React from "react";

type MetricPayload = {
  gender: { male: number; female: number; nonbinary?: number; unknown?: number };
  regions: { ingushetia: number; chechnya: number; russia: number; europe: number; other: number };
  incognito: number;
  platform?: { ios?: number; android?: number };
  countryCounts: Array<{ country: string; count: number }>;
  otherCountryCounts: Array<{ country: string; count: number }>;
  matches: number;
  topFemale?: Array<{ user_id: string; display_name: string | null; likes: number }>;
  topMale?: Array<{ user_id: string; display_name: string | null; likes: number }>;
  geohashByRegion?: Record<string, Array<{ geohash: string; count: number }>>;
  cityCountsRussia?: Array<{ city: string; count: number }>;
  districtCountsRussia?: Array<{ district: string; count: number }>;
  cityCountsEurope?: Array<{ city: string; count: number }>;
  districtCountsEurope?: Array<{ district: string; count: number }>;
  cityCountsOther?: Array<{ city: string; count: number }>;
  districtCountsOther?: Array<{ district: string; count: number }>;
  ageBuckets?: Array<{ bucket: string; count: number }>;
  euCountryDetails?: Array<{
    country: string;
    total: number;
    female: number;
    male: number;
    ageBuckets: Array<{ bucket: string; count: number }>;
  }>;
  cityCountsAll?: Array<{ city: string; count: number }>;
  districtCountsAll?: Array<{ district: string; count: number }>;
  deletedAccounts?: number;
  otherCountryDetails?: Array<{
    country: string;
    total: number;
    female: number;
    male: number;
    ageBuckets: Array<{ bucket: string; count: number }>;
  }>;
  russiaDetail?: {
    total: number;
    female: number;
    male: number;
    ageBuckets: Array<{ bucket: string; count: number }>;
    cities: Array<{ city: string; count: number }>;
    districts: Array<{ district: string; count: number }>;
  };
  chechnyaDetail?: {
    total: number;
    female: number;
    male: number;
    ageBuckets: Array<{ bucket: string; count: number }>;
    cities: Array<{ city: string; count: number }>;
    districts: Array<{ district: string; count: number }>;
  };
  reportedUsers?: Array<{ targetId: string; count: number; lastReportedAt: string; reporters: string[] }>;
};

const MetricsPage = () => {
  const [data, setData] = React.useState<MetricPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchMetrics = React.useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/metrics", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to load metrics");
      }
      setData(payload);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Lade Metrics…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-lg border border-rose-800/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
          {error ?? "Keine Daten"}
        </div>
      </main>
    );
  }

  const gender = {
    male: data.gender?.male ?? 0,
    female: data.gender?.female ?? 0,
    nonbinary: data.gender?.nonbinary ?? 0,
    unknown: data.gender?.unknown ?? 0
  };
  const regions = data.regions;
  const platform = {
    ios: data.platform?.ios ?? 0,
    android: data.platform?.android ?? 0
  };
  const platformTotal = platform.ios + platform.android;
  const iosShare = platformTotal ? Math.round((platform.ios / platformTotal) * 100) : 0;

  const totalProfiles =
    gender.male +
    gender.female +
    gender.nonbinary +
    gender.unknown;
  const femaleShare = totalProfiles ? Math.round((gender.female / totalProfiles) * 100) : 0;
  const maleShare = totalProfiles ? Math.round((gender.male / totalProfiles) * 100) : 0;

  const ACCENT = "#0d6e4f";
  const topFemale = data.topFemale ?? [];
  const topMale = data.topMale ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <section className="space-y-6 text-slate-100 w-full max-w-4xl mx-auto px-6 lg:px-12 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold" style={{ color: ACCENT }}>Metrics</h1>
          <p className="text-sm text-slate-300">Verteilung nach Geschlecht, Regionen und Ländern (Auto-Refresh alle 30s).</p>
        </header>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard title="Gesamtprofile" value={totalProfiles} accent="from-indigo-500/30 to-indigo-500/10" />
        <StatCard title="Incognito" value={data.incognito ?? 0} accent="from-emerald-500/30 to-emerald-500/10" />
        <StatCard title="Matches gesamt" value={data.matches ?? 0} accent="from-pink-500/30 to-pink-500/10" />
        <StatCard
          title="Regionseinträge"
          value={
            regions.ingushetia +
            regions.chechnya +
            regions.russia +
            regions.europe +
            regions.other
          }
          accent="from-amber-500/30 to-amber-500/10"
        />
        <StatCard
          title="Plattformen"
          value={`iOS ${platform.ios} / Android ${platform.android}`}
          subtitle={platformTotal ? `${iosShare}% iOS` : "keine Devices"}
          accent="from-cyan-500/30 to-cyan-500/10"
        />
        <StatCard title="Gelöschte Accounts" value={data.deletedAccounts ?? 0} accent="from-rose-500/30 to-rose-500/10" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Gender split">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2 text-slate-300">Female</td>
                <td className="py-2 text-right font-semibold">{gender.female}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300">Male</td>
                <td className="py-2 text-right font-semibold">{gender.male}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 rounded-lg bg-slate-900/60 p-3">
            <div className="mb-2 flex justify-between text-xs text-slate-400">
              <span>Female {femaleShare}%</span>
              <span>Male {maleShare}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${femaleShare}%` }}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Regions">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              <tr><td className="py-2 text-slate-300">Ingushetia</td><td className="py-2 text-right font-semibold">{regions.ingushetia}</td></tr>
              <tr><td className="py-2 text-slate-300">Chechnya</td><td className="py-2 text-right font-semibold">{regions.chechnya}</td></tr>
              <tr><td className="py-2 text-slate-300">Russia</td><td className="py-2 text-right font-semibold">{regions.russia}</td></tr>
              <tr><td className="py-2 text-slate-300">Europe</td><td className="py-2 text-right font-semibold">{regions.europe}</td></tr>
              <tr><td className="py-2 text-slate-300">Other</td><td className="py-2 text-right font-semibold">{regions.other}</td></tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top 100 Likes – Female">
          <TopList rows={topFemale} />
        </Panel>
        <Panel title="Top 100 Likes – Male">
          <TopList rows={topMale} />
        </Panel>
      </div>

      <Panel title="Gemeldete Profile">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">UID</th>
                <th className="px-3 py-2 text-right">Meldungen</th>
                <th className="px-3 py-2 text-left">Zuletzt</th>
                <th className="px-3 py-2 text-left">Melder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data.reportedUsers ?? []).map((row) => (
                <tr key={row.targetId} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-semibold">{row.targetId}</td>
                  <td className="px-3 py-2 text-right">{row.count}</td>
                  <td className="px-3 py-2">
                    {new Date(row.lastReportedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.reporters?.length ? row.reporters.join(", ") : "–"}
                  </td>
                </tr>
              ))}
              {(data.reportedUsers ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                    Keine Meldungen
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Europe by country">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Female</th>
                <th className="px-3 py-2 text-right">Male</th>
                <th className="px-3 py-2 text-left">Top Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data.euCountryDetails ?? []).map((row) => (
                <tr key={row.country} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-semibold">{row.country}</td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right">{row.female}</td>
                  <td className="px-3 py-2 text-right">{row.male}</td>
                  <td className="px-3 py-2">
                    {(row.ageBuckets ?? []).slice(0, 3).map((b) => `${b.bucket} (${b.count})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {(data.euCountryDetails ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                    No data
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SubList title="Top cities" rows={data.cityCountsEurope ?? []} labelKey="city" />
          <SubList title="Top districts" rows={data.districtCountsEurope ?? []} labelKey="district" />
        </div>
      </Panel>

      <Panel title="Age buckets">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {(data.ageBuckets ?? []).map((row) => (
              <tr key={row.bucket ?? "unknown"} className="hover:bg-slate-900/40">
                <td className="px-3 py-2 text-slate-300">{row.bucket ?? "unknown"}</td>
                <td className="px-3 py-2 text-right font-semibold">{row.count ?? 0}</td>
              </tr>
            ))}
            {(data.ageBuckets ?? []).length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center text-slate-500">No data</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>

      <Panel title="Other regions by country">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Female</th>
                <th className="px-3 py-2 text-right">Male</th>
                <th className="px-3 py-2 text-left">Top Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data.otherCountryDetails ?? []).map((row) => (
                <tr key={row.country} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-semibold">{row.country}</td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right">{row.female}</td>
                  <td className="px-3 py-2 text-right">{row.male}</td>
                  <td className="px-3 py-2">
                    {(row.ageBuckets ?? []).slice(0, 3).map((b) => `${b.bucket} (${b.count})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {(data.otherCountryDetails ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                    No data
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SubList title="Top cities" rows={data.cityCountsOther ?? []} labelKey="city" />
          <SubList title="Top districts" rows={data.districtCountsOther ?? []} labelKey="district" />
        </div>
      </Panel>

      <Panel title="Russia detail">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Female {data.russiaDetail?.female ?? 0} / Male {data.russiaDetail?.male ?? 0} (Total {data.russiaDetail?.total ?? 0})</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-slate-900/50 p-3">
              <p className="mb-2 text-xs text-slate-400">Top cities</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-800">
                  {(data.russiaDetail?.cities ?? []).slice(0, 5).map((row) => (
                    <tr key={row.city ?? "unknown"}>
                      <td className="py-1 text-slate-300">{row.city ?? "unknown"}</td>
                      <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                    </tr>
                  ))}
                  {(data.russiaDetail?.cities ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-3">
              <p className="mb-2 text-xs text-slate-400">Top districts</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-800">
                  {(data.russiaDetail?.districts ?? []).slice(0, 5).map((row) => (
                    <tr key={row.district ?? "unknown"}>
                      <td className="py-1 text-slate-300">{row.district ?? "unknown"}</td>
                      <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                    </tr>
                  ))}
                  {(data.russiaDetail?.districts ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <p className="mb-2 text-xs text-slate-400">Age buckets</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {(data.russiaDetail?.ageBuckets ?? []).map((row) => (
                  <tr key={row.bucket ?? "unknown"}>
                    <td className="py-1 text-slate-300">{row.bucket ?? "unknown"}</td>
                    <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                  </tr>
                ))}
                {(data.russiaDetail?.ageBuckets ?? []).length === 0 ? (
                  <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="Chechnya detail">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Female {data.chechnyaDetail?.female ?? 0} / Male {data.chechnyaDetail?.male ?? 0} (Total {data.chechnyaDetail?.total ?? 0})</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-slate-900/50 p-3">
              <p className="mb-2 text-xs text-slate-400">Top cities</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-800">
                  {(data.chechnyaDetail?.cities ?? []).slice(0, 5).map((row) => (
                    <tr key={row.city ?? "unknown"}>
                      <td className="py-1 text-slate-300">{row.city ?? "unknown"}</td>
                      <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                    </tr>
                  ))}
                  {(data.chechnyaDetail?.cities ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-3">
              <p className="mb-2 text-xs text-slate-400">Top districts</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-800">
                  {(data.chechnyaDetail?.districts ?? []).slice(0, 5).map((row) => (
                    <tr key={row.district ?? "unknown"}>
                      <td className="py-1 text-slate-300">{row.district ?? "unknown"}</td>
                      <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                    </tr>
                  ))}
                  {(data.chechnyaDetail?.districts ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <p className="mb-2 text-xs text-slate-400">Age buckets</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {(data.chechnyaDetail?.ageBuckets ?? []).map((row) => (
                  <tr key={row.bucket ?? "unknown"}>
                    <td className="py-1 text-slate-300">{row.bucket ?? "unknown"}</td>
                    <td className="py-1 text-right font-semibold">{row.count ?? 0}</td>
                  </tr>
                ))}
                {(data.chechnyaDetail?.ageBuckets ?? []).length === 0 ? (
                  <tr><td colSpan={2} className="py-1 text-center text-xs text-slate-500">No data</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="Top cities (global)">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {(data.cityCountsAll ?? []).slice(0, 10).map((row) => (
              <tr key={row.city ?? "unknown"}>
                <td className="py-2 text-slate-300">{row.city ?? "unknown"}</td>
                <td className="py-2 text-right font-semibold">{row.count ?? 0}</td>
              </tr>
            ))}
            {(data.cityCountsAll ?? []).length === 0 ? (
              <tr><td colSpan={2} className="py-2 text-center text-slate-500">No data</td></tr>
            ) : null}
          </tbody>
        </table>
      </Panel>

      <Panel title="Top districts (global)">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {(data.districtCountsAll ?? []).slice(0, 10).map((row) => (
              <tr key={row.district ?? "unknown"}>
                <td className="py-2 text-slate-300">{row.district ?? "unknown"}</td>
                <td className="py-2 text-right font-semibold">{row.count ?? 0}</td>
              </tr>
            ))}
            {(data.districtCountsAll ?? []).length === 0 ? (
              <tr><td colSpan={2} className="py-2 text-center text-slate-500">No data</td></tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
      </section>
    </main>
  );
};

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-emerald-800/40 bg-slate-900/70 p-4 shadow-lg shadow-emerald-900/20">
    <h2 className="text-sm font-semibold text-emerald-200 tracking-wide">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

const StatCard = ({
  title,
  value,
  subtitle,
  accent
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent: string;
}) => (
  <div className="overflow-hidden rounded-xl border border-emerald-800/50 bg-slate-900/80 p-4 shadow-md shadow-emerald-900/20">
    <div className={`h-1 rounded-full bg-gradient-to-r ${accent}`} />
    <div className="mt-3 space-y-1">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-slate-50">{value}</p>
      {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  </div>
);

const SubList = ({
  title,
  rows,
  labelKey
}: {
  title: string;
  rows: Array<any>;
  labelKey: string;
}) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
    <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{title}</p>
    <dl className="space-y-2 text-sm text-slate-200">
      {rows.slice(0, 5).map((row, idx) => (
        <div key={`${labelKey}-${row[labelKey] ?? idx}`} className="flex items-center justify-between">
          <span className="text-slate-300">{row[labelKey] ?? "unknown"}</span>
          <span className="font-semibold">{row.count ?? 0}</span>
        </div>
      ))}
      {rows.length === 0 ? <p className="text-xs text-slate-500">No data</p> : null}
    </dl>
  </div>
);

const TopList = ({ rows }: { rows: Array<{ user_id: string; display_name: string | null; likes: number }> }) => (
  <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
    <table className="w-full text-sm text-slate-200">
      <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
        <tr>
          <th className="px-3 py-2 text-left">#</th>
          <th className="px-3 py-2 text-left">Name</th>
          <th className="px-3 py-2 text-left">User ID</th>
          <th className="px-3 py-2 text-right">Likes</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {rows.map((row, idx) => (
          <tr key={`${row.user_id}-${idx}`} className="hover:bg-slate-800/40">
            <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
            <td className="px-3 py-2 font-semibold">{row.display_name ?? "—"}</td>
            <td className="px-3 py-2 text-xs text-slate-400">{row.user_id}</td>
            <td className="px-3 py-2 text-right font-semibold">{row.likes}</td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
              No data
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  </div>
);

export default MetricsPage;
