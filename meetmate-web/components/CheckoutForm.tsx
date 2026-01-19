"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportedCurrency } from "../lib/currency";

type PlanId = "monthly" | "yearly";

type PlanConfig = {
  id: PlanId;
  label: string;
  amountMinor: number;
};

type Props = {
  lang: string;
  currency: SupportedCurrency;
  formatPrice: (amountMinor: number) => string;
  labels: {
    monthlyLabel: string;
    yearlyLabel: string;
    action: string;
    ruNotice: string;
  };
};

const PLAN_AMOUNTS: Record<SupportedCurrency, Record<PlanId, number>> = {
  EUR: {
    monthly: 999,
    yearly: 9999
  },
  NOK: {
    monthly: 15900,
    yearly: 99900
  },
  RUB: {
    monthly: 129900,
    yearly: 749900
  }
};

const CheckoutForm = ({ lang, currency, formatPrice, labels }: Props) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("monthly");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const plans: PlanConfig[] = [
    {
      id: "monthly",
      label: labels.monthlyLabel,
      amountMinor: PLAN_AMOUNTS[currency].monthly
    },
    {
      id: "yearly",
      label: labels.yearlyLabel,
      amountMinor: PLAN_AMOUNTS[currency].yearly
    }
  ];

  const handleSubmit = () => {
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) {
      setError("Plan not found");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/psp/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId: plan.id,
            currency,
            amountMinor: plan.amountMinor,
            source: "web"
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? `Checkout failed (${response.status})`);
        }

        router.push(`/${lang}/checkout/success`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Checkout failed";
        setError(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={`cursor-pointer rounded-lg border p-4 shadow-sm transition ${
              selectedPlan === plan.id ? "border-slate-900 bg-slate-900/5" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">{plan.label}</div>
                <div className="text-sm text-slate-600">{selectedPlan === plan.id ? "✓" : ""}</div>
              </div>
              <div className="text-xl font-bold text-slate-900">{formatPrice(plan.amountMinor)}</div>
            </div>
            <input
              type="radio"
              name="plan"
              value={plan.id}
              checked={selectedPlan === plan.id}
              onChange={() => setSelectedPlan(plan.id)}
              className="sr-only"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-60"
      >
        {isPending ? "…" : labels.action}
      </button>

      <p className="text-xs text-slate-500">{labels.ruNotice}</p>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
};

export default CheckoutForm;
