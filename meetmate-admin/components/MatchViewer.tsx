import type { Database } from "@/lib/types";

type MatchRow = Database["public"]["Tables"]["matches_view"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages_view"]["Row"];

type MatchViewerProps = {
  match: MatchRow | null;
  messages: MessageRow[];
};

const MatchViewer = ({ match, messages }: MatchViewerProps) => {
  if (!match) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        Match not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm">
        <h2 className="text-base font-semibold text-slate-100">Match details</h2>
        <dl className="mt-3 grid gap-2 text-slate-300 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Created</dt>
            <dd>{new Date(match.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">User A</dt>
            <dd>
              <span className="font-medium text-slate-100">{match.user_a_name ?? "Unknown"}</span>
              <span className="block text-xs text-slate-400">{match.user_a_email ?? "—"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">User B</dt>
            <dd>
              <span className="font-medium text-slate-100">{match.user_b_name ?? "Unknown"}</span>
              <span className="block text-xs text-slate-400">{match.user_b_email ?? "—"}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-100">Messages</h3>
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-400">No messages exchanged.</p>
          ) : (
            messages.map((message) => (
              <article key={message.id} className="rounded-lg bg-slate-800/60 p-3 text-sm text-slate-200">
                <header className="flex items-center justify-between text-xs text-slate-400">
                  <span>{message.sender_name ?? "Unknown"}</span>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                </header>
                <p className="mt-2 whitespace-pre-wrap">{message.text ?? "—"}</p>
                {message.image_url ? (
                  <a
                    href={message.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-emerald-400 underline"
                  >
                    View image
                  </a>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MatchViewer;
