"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GuardedPhotoProps = {
  photoId: number;
  alt?: string;
  preferredVariant?: "original" | "blur";
  className?: string;
};

type SignResponse = {
  url: string;
  variant: "original" | "blur";
  expiresIn: number;
};

export const GuardedPhoto = ({ photoId, alt = "Profile photo", preferredVariant = "original", className }: GuardedPhotoProps) => {
  const [state, setState] = useState<{ url: string; variant: "original" | "blur" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      setState(null);
      try {
        const response = await fetch("/api/photos/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId, variant: preferredVariant })
        });
        if (!response.ok) {
          throw new Error(`Sign failed (${response.status})`);
        }
        const payload = (await response.json()) as SignResponse;
        if (!cancelled) {
          setState({ url: payload.url, variant: payload.variant });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("GuardedPhoto error", err);
          setError("Foto nicht verfügbar");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [photoId, preferredVariant]);

  if (error) {
    return (
      <div className={`flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] ${className ?? ""}`}>
        {error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className={`animate-pulse rounded-2xl bg-[var(--accent-100)] ${className ?? ""}`} />
    );
  }

  return (
    <Image
      src={state.url}
      alt={alt}
      width={400}
      height={500}
      className={`rounded-2xl object-cover ${state.variant === "blur" ? "opacity-80" : ""} ${className ?? ""}`}
    />
  );
};
