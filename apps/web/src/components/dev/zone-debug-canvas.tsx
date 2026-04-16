"use client";

import { useMemo, useState } from "react";

import {
  assignZonePhases,
  getCandidateZones,
  type CardTemplateKey,
  type CardZoneValidityKind,
  type RevealPhase,
} from "@gac/shared/reveal";

const KEYS: CardTemplateKey[] = ["actionLike", "hero", "weaponEquipment"];

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

function phaseFill(phase: RevealPhase): string {
  return phase === "early"
    ? "rgba(45,212,191,0.28)"
    : phase === "mid"
      ? "rgba(251,191,36,0.26)"
      : "rgba(244,114,182,0.28)";
}

export function ZoneDebugCanvas() {
  const [key, setKey] = useState<CardTemplateKey>("actionLike");
  const [cardKind, setCardKind] = useState<CardZoneValidityKind>("attackAction");
  const zones = useMemo(() => {
    const base = getCandidateZones({ kind: cardKind }, key);
    return assignZonePhases({ kind: cardKind }, key, base);
  }, [cardKind, key]);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <label className="flex flex-col gap-1 text-left text-sm text-[var(--parchment-dim)]">
          Template
          <select
            className="rounded-md border border-[var(--gold)]/25 bg-[var(--ink)]/40 px-3 py-2 text-[var(--parchment)]"
            value={key}
            onChange={(e) => setKey(e.target.value as CardTemplateKey)}
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-left text-sm text-[var(--parchment-dim)]">
          Card kind (zone validity)
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
        <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-[var(--gold)]/20 bg-[var(--ink)]/60 shadow-inner aspect-[5/7]">
          <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Card zone overlay">
            {zones.map((z) => (
              <rect
                key={z.id}
                x={z.rect.x * 100}
                y={z.rect.y * 100}
                width={z.rect.width * 100}
                height={z.rect.height * 100}
                fill={phaseFill(z.phase)}
                stroke="rgba(255,248,220,0.35)"
                strokeWidth={0.25}
              />
            ))}
          </svg>
        </div>
        <p className="text-xs leading-relaxed text-[var(--parchment-dim)]">
          Fill = reveal phase (teal early, gold mid, pink late). From{" "}
          <code className="text-[var(--parchment)]/80">getCandidateZones</code> →{" "}
          <code className="text-[var(--parchment)]/80">assignZonePhases</code>.
        </p>
      </div>
      <div className="max-h-[min(70vh,520px)] w-full overflow-auto rounded-md border border-[var(--gold)]/15 bg-black/20 p-3 sm:max-w-md">
        <p className="mb-2 font-mono text-xs text-[var(--parchment-dim)]">
          {zones.length} zones · phased
        </p>
        <ul className="space-y-1 font-mono text-[11px] leading-snug text-[var(--parchment)]/90">
          {zones.map((z) => (
            <li key={z.id}>
              <span className="text-[var(--gold)]/80">{z.id}</span>
              <span className="text-[var(--parchment-dim)]">
                {" "}
                · {z.type} · <span className="text-[var(--mist)]">{z.phase}</span>
              </span>
              {z.phaseDebug?.rule ? (
                <span className="block pl-1 text-[10px] text-[var(--parchment-dim)]/90">
                  {z.phaseDebug.rule}
                </span>
              ) : null}
              {z.metadata?.row != null && z.metadata?.col != null ? (
                <span className="text-[var(--parchment-dim)]">
                  {" "}
                  (r{z.metadata.row},c{z.metadata.col})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
