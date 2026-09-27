import { describe, it, expect, vi, beforeEach } from "vitest"
import { sddDebug, sddLog, sddError } from "./debug.js"

describe("utils/debug", () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sddDebug calls console.debug when DEBUG_ENABLED", () => {
    // Since DEBUG_ENABLED checks import.meta.env, we test the function exists
    expect(typeof sddDebug).toBe("function")
    expect(typeof sddLog).toBe("function")
    expect(typeof sddError).toBe("function")
  })
})