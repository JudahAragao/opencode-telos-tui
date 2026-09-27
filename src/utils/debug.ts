/**
 * Debug utility for TUI plugin
 */

const DEBUG_ENABLED = (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DEBUG === "true") ||
  (typeof process !== "undefined" && (process.env as any)?.NODE_ENV === "development")

export function sddDebug(namespace: string, message: string, ...args: unknown[]): void {
  if (!DEBUG_ENABLED) return

  const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] || "??:??:??"
  const prefix = `[${timestamp}] [telos:sdd:${namespace}]`

  console.debug(prefix, message, ...args)
}

export function sddLog(namespace: string, message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] || "??:??:??"
  const prefix = `[${timestamp}] [telos:sdd:${namespace}]`
  console.log(prefix, message, ...args)
}

export function sddError(namespace: string, message: string, error?: Error): void {
  const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] || "??:??:??"
  const prefix = `[${timestamp}] [telos:sdd:${namespace}]`
  console.error(prefix, message, error)
}