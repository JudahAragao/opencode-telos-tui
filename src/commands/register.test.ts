import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerSddCommands } from "./register.js"

describe("commands/register", () => {
  let mockCtx: any
  let mockKeymap: any
  let mockClient: any
  let mockRoute: any
  let unregisterFn: any

  beforeEach(() => {
    unregisterFn = vi.fn()
    mockKeymap = {
      registerLayer: vi.fn().mockReturnValue(unregisterFn),
      dispatchCommand: vi.fn()
    }
    mockClient = {
      session: {
        command: vi.fn().mockResolvedValue({ text: "Success" })
      }
    }
    mockRoute = {
      current: {
        name: "session",
        params: { sessionID: "test-session" }
      }
    }
    mockCtx = {
      keymap: mockKeymap,
      client: mockClient,
      route: mockRoute,
      ui: {
        dialog: { replace: vi.fn(), show: vi.fn() },
        toast: { show: vi.fn() }
      },
      state: {
        session: {
          get: vi.fn()
        }
      },
      lifecycle: {
        onDispose: vi.fn()
      }
    }
  })

  it("registers keymap layer with all SDD commands", () => {
    const cleanup = registerSddCommands(mockCtx)

    expect(mockKeymap.registerLayer).toHaveBeenCalledTimes(1)
    const layer = mockKeymap.registerLayer.mock.calls[0][0]

    expect(layer.mode).toBe("global")
    expect(layer.priority).toBe(100)
    expect(layer.commands).toBeDefined()
    expect(layer.commands.length).toBe(10)

    // Verify all expected commands are registered
    const commandIds = layer.commands.map((c: any) => c.id)
    expect(commandIds).toContain("sdd.viz")
    expect(commandIds).toContain("sdd.status")
    expect(commandIds).toContain("sdd.on")
    expect(commandIds).toContain("sdd.off")
    expect(commandIds).toContain("sdd.renew")
    expect(commandIds).toContain("sdd.cache_reset")
    expect(commandIds).toContain("sdd.tasks")
    expect(commandIds).toContain("sdd.acceptance")
    expect(commandIds).toContain("sdd.guide")
    expect(commandIds).toContain("sdd.panel")

    // Verify slash command configs
    const vizCmd = layer.commands.find((c: any) => c.id === "sdd.viz")
    expect(vizCmd.slash).toEqual({ name: "sdd", aliases: ["viz"], arguments: true })

    const statusCmd = layer.commands.find((c: any) => c.id === "sdd.status")
    expect(statusCmd.slash).toEqual({ name: "sdd", aliases: ["status"], arguments: false })

    // Cleanup should be a function
    expect(typeof cleanup).toBe("function")
    cleanup()
  })

  it("cleanup unregisters the layer", () => {
    const cleanup = registerSddCommands(mockCtx)

    cleanup()

    expect(unregisterFn).toHaveBeenCalled()
  })
})