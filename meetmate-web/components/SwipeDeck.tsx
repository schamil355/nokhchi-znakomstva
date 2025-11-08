import Image from "next/image";
import {
  Dispatch,
  MutableRefObject,
  PointerEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Candidate = {
  user_id: string;
  full_name?: string | null;
  country?: string | null;
  region_code?: string | null;
  verified_at?: string | null;
  photos?: string[];
  bio?: string | null;
  age?: number | null;
  distance_km?: number | null;
};

type SwipeDeckProps = {
  items: Candidate[];
  onLike?: (candidate: Candidate) => Promise<void> | void;
  onPass?: (candidate: Candidate) => Promise<void> | void;
};

const THRESHOLD = 120;
const MAX_ROTATION = 15;

const defaultPhoto =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80";

export function SwipeDeck({ items, onLike, onPass }: SwipeDeckProps) {
  const [stack, setStack] = useState(items);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    setStack(items);
    dragStart.current = null;
    setDragState({ x: 0, y: 0, active: false });
  }, [items]);

  const topCandidate = stack[0];

  const handleRemoveTop = useCallback(() => {
    setStack((prev) => prev.slice(1));
  }, []);

  const resetDrag = useCallback(() => {
    dragStart.current = null;
    setDragState({ x: 0, y: 0, active: false });
  }, []);

  const handleAction = useCallback(
    async (candidate: Candidate, action: "like" | "pass") => {
      if (action === "like") {
        await onLike?.(candidate);
      } else {
        await onPass?.(candidate);
      }
      handleRemoveTop();
      resetDrag();
    },
    [handleRemoveTop, onLike, onPass, resetDrag]
  );

  const cards = useMemo(
    () =>
      stack.map((candidate, index) => (
        <SwipeCard
          key={candidate.user_id}
          candidate={candidate}
          index={index}
          dragState={dragState}
          setDragState={setDragState}
          dragStart={dragStart}
          onAction={handleAction}
        />
      )),
    [stack, dragState, handleAction]
  );

  return (
    <div className="relative h-[520px] w-full max-w-md mx-auto">
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => topCandidate && handleAction(topCandidate, "pass")}
              data-testid="pass-button"
              className="h-14 w-14 rounded-full border border-[var(--border)] bg-white text-xl shadow hover:bg-[var(--surface)] transition"
              aria-label="Pass"
            >
              ✖
            </button>
            <button
              type="button"
              onClick={() => topCandidate && handleAction(topCandidate, "like")}
              data-testid="like-button"
              className="h-14 w-14 rounded-full bg-[var(--primary-600)] text-white text-xl shadow hover:brightness-110 transition"
              aria-label="Like"
            >
              ❤
            </button>
          </div>
          <div className="relative h-full w-full">{cards}</div>
        </>
      )}
    </div>
  );
}

type SwipeCardProps = {
  candidate: Candidate;
  index: number;
  dragState: { x: number; y: number; active: boolean };
  setDragState: Dispatch<SetStateAction<{ x: number; y: number; active: boolean }>>;
  dragStart: MutableRefObject<{ x: number; y: number } | null>;
  onAction: (candidate: Candidate, action: "like" | "pass") => void | Promise<void>;
};

function SwipeCard({ candidate, index, dragState, setDragState, dragStart, onAction }: SwipeCardProps) {
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (index !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
    setDragState({ x: 0, y: 0, active: true });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (index !== 0) return;
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    setDragState({ x: deltaX, y: deltaY, active: true });
  };

  const handlePointerUp = async (event: PointerEvent<HTMLDivElement>) => {
    if (index !== 0) return;
    if (!dragStart.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = event.clientX - dragStart.current.x;
    dragStart.current = null;
    setDragState({ x: 0, y: 0, active: false });

    if (deltaX > THRESHOLD) {
      await onAction(candidate, "like");
    } else if (deltaX < -THRESHOLD) {
      await onAction(candidate, "pass");
    }
  };

  const isTopCard = index === 0;
  const translateX = isTopCard ? dragState.x : 0;
  const translateY = isTopCard ? dragState.y : index * 4;
  const rotation = isTopCard ? Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, dragState.x / 10)) : 0;
  const scale = 1 - index * 0.05;
  const opacity = isTopCard ? Math.max(0.65, 1 - Math.abs(dragState.x) / 300) : 1;

  const dynamicClass =
    isTopCard && dragState.active ? "absolute inset-0 rounded-[24px] overflow-hidden border border-[var(--border)] bg-white shadow" : "absolute inset-0 rounded-[24px] overflow-hidden border border-[var(--border)] bg-white shadow transition-transform duration-200";

  return (
    <div
      className={`${dynamicClass} will-change-transform`}
      style={{
        zIndex: 100 - index,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
      data-testid="swipe-card"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
        setDragState({ x: 0, y: 0, active: false });
      }}
    >
      <CardContent candidate={candidate} />
    </div>
  );
}

function CardContent({ candidate }: { candidate: Candidate }) {
  const photo = candidate.photos?.[0] ?? defaultPhoto;

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[360px] w-full overflow-hidden">
        {candidate.verified_at ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--primary-600)] shadow">
            Verifiziert
          </span>
        ) : null}
        <Image
          src={photo}
          alt={candidate.full_name ?? "Profile photo"}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,110,79,0.55)] via-transparent to-transparent" />
      </div>
      <div className="flex-1 space-y-2 bg-[var(--surface)] p-6">
        <div className="text-xl font-semibold text-[var(--text)]">
          {candidate.full_name ?? "Unknown"}
          {candidate.age ? `, ${candidate.age}` : ""}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {candidate.bio ?? "Freut sich darauf, neue Menschen kennenzulernen."}
        </p>
        <div className="flex flex-wrap gap-2">
          {candidate.country ? (
            <span className="rounded-full bg-[var(--primary-100)] px-3 py-1 text-xs text-[var(--primary-600)]">
              {candidate.country}
            </span>
          ) : null}
          {candidate.region_code ? (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)]/70">
              {candidate.region_code}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] text-center text-[var(--muted)]">
      <div className="text-3xl mb-2">🔍</div>
      <div className="text-lg font-semibold text-[var(--text)]">Keine Kandidaten gefunden</div>
      <p className="text-sm mt-1">Bitte später erneut versuchen – wir aktualisieren den Feed.</p>
    </div>
  );
}
