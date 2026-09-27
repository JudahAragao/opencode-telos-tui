import { describe, it, expect, vi } from "vitest"
import { executeSddCommand, startDashboard, stopDashboard, getDashboardStatus } from "./api.js"

describe("utils/api", () => {
  const sessionID = "test-session-123"

  describe("executeSddCommand", () => {
    it("calls client.session.command with correct arguments", async () => {
      const mockClient = {
        session: {
          command: vi.fn().mockResolvedValue({ text: "Success" })
        }
      }

      const result = await executeSddCommand(mockClient, sessionID, "viz", "status")

      expect(mockClient.session.command).toHaveBeenCalledWith({
        sessionID,
        command: "sdd",
        arguments: "viz status"
      })
      expect(result.matched).toBe(true)
      expect(result.text).toBe("Success")
    })

    it("returns error result when command fails", async () => {
      const mockClient = {
        session: {
          command: vi.fn().mockRejectedValue(new Error("Command failed"))
        }
      }

      const result = await executeSddCommand(mockClient, sessionID, "viz")

      expect(result.matched).toBe(false)
      expect(result.text).toBe("Command failed")
    })
  })

  describe("startDashboard", () => {
    it("extracts URL from result text", async () => {
      const mockClient = {
        session: {
          command: vi.fn().mockResolvedValue({
            text: "**URL:** http://127.0.0.1:7331\nDashboard started"
          })
        }
      }

      const result = await startDashboard(mockClient, sessionID)

      expect(result.url).toBe("http://127.0.0.1:7331")
      expect(result.port).toBe(7331)
    })
  })

  describe("stopDashboard", () => {
    it("returns true when dashboard stopped", async () => {
      const mockClient = {
        session: {
          command: vi.fn().mockResolvedValue({
            text: "🛑 SDD dashboard stopped."
          })
        }
      }

      const result = await stopDashboard(mockClient, sessionID)

      expect(result).toBe(true)
    })

    it("returns false when dashboard not running", async () => {
      const mockClient = {
        session: {
          command: vi.fn().mockResolvedValue({
            text: "ℹ️ SDD dashboard is not running."
          })
        }
      }

      const result = await stopDashboard(mockClient, sessionID)

      expect(result).toBe(false)
    })
  })
})