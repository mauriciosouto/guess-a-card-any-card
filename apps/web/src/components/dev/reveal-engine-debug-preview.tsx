"use client";

import { useMemo, useState } from "react";

import {
  buildRevealPlan,
  getBlackoutRegionsFromRevealState,
  getRenderRegionsFromRevealState,
  getRevealStateAtStep,
  type CardTemplateKey,
  type CardZoneValidityKind,
  type Region,
} from "@gac/shared/reveal";
import { cn } from "@/lib/utils/cn";

const PLACEHOLDER_CARD =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="448" viewBox="0 0 320 448">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#2a1833"/><stop offset="1" stop-color="#120a18"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)" rx="12"/>' +
      '<text x="50%" y="42%" fill="#c9a227" font-family="system-ui,sans-serif" font-size="13" text-anchor="middle">' +
      "Reveal preview" +
      "</text>" +
      '<text x="50%" y="50%" fill="#a898b8" font-size="11" text-anchor="middle">' +
      "Placeholder art" +
      "</text>" +
      "</svg>",
  );

const TEMPLATES: CardTemplateKey[] = ["actionLike", "hero", "weaponEquipment"];

const CARD_KINDS: CardZoneValidityKind[] = [
  "attackAction",
  "nonAttackAction",
  "instant",
  "attackReaction",
  "defenseReaction",
  "weapon",
  "token",
  "equipment",
  "hero",
];

function BlackoutLayer({ regions }: { regions: Region[] }) {
  return (
    <>
      {regions.map((r) => (
        <div
          key={r.id}
          className="pointer-events-none absolute z-[1] bg-[var(--card-zone-mask)]"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.width}%`,
            height: `${r.height}%`,
          }}
          title={r.id}
        />
      ))}
    </>
  );
}

export function RevealEngineDebugPreview() {
  const [templateKey, setTemplateKey] = useState<CardTemplateKey>("actionLike");
  const [cardKind, setCardKind] = useState<CardZoneValidityKind>("attackAction");
  const [seed, setSeed] = useState("dev-reveal-preview");
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = useMemo(
    () => buildRevealPlan({ kind: cardKind }, templateKey, seed).length,
    [cardKind, templateKey, seed],
  );

  const maxStep = Math.max(1, totalSteps);
  const clampedStep = Math.min(Math.max(1, currentStep), maxStep);

  const revealState = useMemo(
    () => getRevealStateAtStep({ kind: cardKind }, templateKey, seed, clampedStep),
    [cardKind, templateKey, seed, clampedStep],
  );

  const pack = useMemo(() => getRenderRegionsFromRevealState(revealState), [revealState]);

  const blackouts = useMemo(() => getBlackoutRegionsFromRevealState(revealState), [revealState]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-[var(--parchment-dim)]">
            Template
            <select
              className="rounded-md border border-[var(--gold)]/25 bg-[var(--ink)]/40 px-3 py-2 text-[var(--parchment)]"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value as CardTemplateKey)}
            >
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--parchment-dim)]">
            Card kind
            <select
              className="rounded-md border border-[var(--gold)]/25 bg-[var(--ink)]/40 px-3 py-2 text-[var(--parchment)]"
              value={cardKind}
              onChange={(e) => setCardKind(e.target.value as CardZoneValidityKind)}
            >
              {CARD_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--parchment-dim)] sm:col-span-2">
            Seed
            <input
              className="rounded-md border border-[var(--gold)]/25 bg-[var(--ink)]/40 px-3 py-2 font-mono text-sm text-[var(--parchment)]"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--parchment-dim)] sm:col-span-2">
            Current step (1–{maxStep}) · effective {revealState.effectiveStep}
            <input
              type="range"
              min={1}
              max={maxStep}
              value={clampedStep}
              onChange={(e) => setCurrentStep(Number(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <input
              type="number"
              min={1}
              max={maxStep}
              value={clampedStep}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setCurrentStep(n);
              }}
              className="w-24 rounded-md border border-[var(--gold)]/25 bg-[var(--ink)]/40 px-2 py-1 font-mono text-sm text-[var(--parchment)]"
            />
          </label>
        </div>

        <div className="relative mx-auto w-full max-w-[280px]">
          <div
            className={cn(
              "relative aspect-[5/7] w-full overflow-hidden rounded-lg border border-[var(--gold-dim)]/40 bg-[var(--void)]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PLACEHOLDER_CARD}
              alt="Preview placeholder"
              className="absolute inset-0 z-0 h-full w-full object-cover object-top"
            />
            <BlackoutLayer regions={blackouts} />
          </div>
          <p className="mt-2 text-center text-[10px] text-[var(--parchment-dim)]">
            Blackouts = plan (unrevealed) + name/footer + inactive stat slots for card kind
          </p>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4 font-mono text-[11px] text-[var(--parchment)]/90">
        <div className="rounded-md border border-[var(--gold)]/15 bg-black/20 p-3">
          <p className="text-[var(--gold)]/90">totalSteps (plan)</p>
          <p className="text-lg text-[var(--parchment)]">{revealState.totalSteps}</p>
          <p className="mt-2 text-[var(--parchment-dim)]">
            clamped: {String(revealState.debug.clamped)} · requested step {revealState.requestedStep}
          </p>
        </div>
        <div className="rounded-md border border-[var(--gold)]/15 bg-black/20 p-3">
          <p className="mb-1 text-[var(--gold)]/90">Revealed ({pack.visible.length})</p>
          <ul className="max-h-40 overflow-auto space-y-0.5 leading-snug">
            {pack.visible.map((v) => (
              <li key={v.id}>
                <span className="text-[var(--mist)]">{v.id}</span>
                {v.isB2 ? (
                  <span className="ml-1 rounded bg-[var(--blood)]/35 px-1 text-[10px] uppercase text-[var(--gold-bright)]">
                    B2
                  </span>
                ) : null}
                <span className="text-[var(--parchment-dim)]"> · {v.phase}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[var(--gold)]/15 bg-black/20 p-3">
          <p className="mb-1 text-[var(--gold)]/90">Hidden plan ({pack.hidden.length})</p>
          <ul className="max-h-32 overflow-auto space-y-0.5 text-[var(--parchment-dim)]">
            {pack.hidden.map((h) => (
              <li key={h.id}>{h.id.replace(/^mask-/, "")}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[var(--blood)]/25 bg-black/20 p-3">
          <p className="mb-1 text-[var(--gold)]/90">Always hidden ({pack.alwaysHidden.length})</p>
          <ul className="space-y-0.5 text-[var(--parchment-dim)]">
            {pack.alwaysHidden.map((h) => (
              <li key={h.id}>{h.id.replace(/^mask-always-/, "")}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[var(--gold)]/20 bg-black/20 p-3">
          <p className="mb-1 text-[var(--gold)]/90">Inactive for kind ({pack.invalidForKind.length})</p>
          <ul className="space-y-0.5 text-[var(--parchment-dim)]">
            {pack.invalidForKind.map((h) => (
              <li key={h.id}>{h.id.replace(/^mask-inactive-/, "")}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
