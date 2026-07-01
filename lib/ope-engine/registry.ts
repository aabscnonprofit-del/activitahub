// OPE V2 — Module 2: OPE Engine — active provider registry (Step 5).
//
// Holds the module's ACTIVE Engine Provider so the OPE Contract is usable without explicit
// injection, while keeping the provider replaceable (set/get/reset). The DEFAULT active provider is
// the frozen-engine adapter. This file imports the adapter (a sibling provider) — NOT lib/ope/*;
// only the adapter imports the frozen engine.
//
// The active provider is stored in a global-symbol-keyed cell so that, even if this module is
// instantiated more than once by a bundler/loader (a known ESM duplication hazard), set/get/reset
// all operate on a single shared cell. Pure singleton state for a registry; safe under Next and tsx.

import { frozenEngineProvider } from './frozen-engine-adapter'
import type { EngineProvider } from './provider'

interface Holder { provider: EngineProvider }

const ACTIVE = Symbol.for('alh.ope-engine.activeProvider')

function holder(): Holder {
  const store = globalThis as unknown as Record<symbol, Holder | undefined>
  if (!store[ACTIVE]) store[ACTIVE] = { provider: frozenEngineProvider }
  return store[ACTIVE] as Holder
}

/** The currently active provider (default: the frozen-engine adapter). */
export function getActiveProvider(): EngineProvider {
  return holder().provider
}

/** Replace the active provider (e.g. a different engine, or a stub in tests). */
export function setActiveProvider(provider: EngineProvider): void {
  holder().provider = provider
}

/** Restore the default active provider (the frozen-engine adapter). */
export function resetActiveProvider(): void {
  holder().provider = frozenEngineProvider
}
