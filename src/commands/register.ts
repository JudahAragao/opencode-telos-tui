/**
 * Register all /sdd subcommands as TUI keymap commands
 */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { executeSddCommand, startDashboard, stopDashboard, getDashboardStatus, getSddStatus, getTaskBoard, openTaskChange, integrateTasks, enableSdd, disableSdd, renewWorkflow, resetCache, showAcceptance, showGuidance } from "../utils/api.js"
import { showDashboardDialog, showStatusDialog, showPanelDialog, showTaskBoardDialog } from "../ui/index.js"
import { sddDebug } from "../utils/debug.js"

interface CommandHandler {
  (ctx: TuiPluginApi, input?: string): Promise<void>
}

/**
 * Create a command handler that executes an SDD command and shows result in a dialog/toast
 */
function createCommandHandler(
  executeFn: (client: any, sessionID: string, args?: string) => Promise<any>,
  options: {
    title: string
    showDialog?: boolean
    parseResult?: (result: any) => { title: string; message: string }
    toastOnSuccess?: boolean
    toastOnError?: boolean
  } = { title: "" }
): CommandHandler {
  return async (ctx, input) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    const client = ctx.client
    if (!client) {
      ctx.ui.toast({ message: "Client not available", variant: "error" })
      return
    }

    try {
      const result = await executeFn(client, sessionID, input)

      if (options.showDialog && options.parseResult) {
        const parsed = options.parseResult(result)
        showStatusDialog(ctx, parsed.title, parsed.message)
      } else if (options.toastOnSuccess) {
        ctx.ui.toast({
          message: result.text || `${options.title} completed`,
          variant: "success"
        })
      }
    } catch (error) {
      sddError("commands", `${options.title} failed`, error as Error)
      if (options.toastOnError) {
        ctx.ui.toast({
          message: `${options.title} failed: ${error instanceof Error ? error.message : String(error)}`,
          variant: "error"
        })
      }
    }
  }
}

/**
 * Create a command handler that parses arguments and routes to sub-actions
 */
function createSubcommandHandler(
  handlers: Record<string, CommandHandler>,
  defaultHandler?: CommandHandler
): CommandHandler {
  return async (ctx, input) => {
    const args = input?.trim().toLowerCase().split(/\s+/) || []
    const subcommand = args[0] || ""
    const rest = args.slice(1).join(" ")

    const handler = handlers[subcommand] || defaultHandler
    if (handler) {
      await handler(ctx, rest)
    } else {
      ctx.ui.toast({
        message: `Unknown subcommand: ${subcommand}. Available: ${Object.keys(handlers).join(", ")}`,
        variant: "warning"
      })
    }
  }
}

function sddError(namespace: string, message: string, error: Error): void {
  sddDebug(namespace, `ERROR: ${message}`, error)
}

/**
 * Register all SDD commands in a keymap layer
 */
export function registerSddCommands(ctx: TuiPluginApi): () => void {
  sddDebug("commands", "Registering SDD TUI commands")

  // ─── /sdd viz ─────────────────────────────────────────────────────────────
  const vizHandler = createSubcommandHandler({
    "": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await startDashboard(ctx.client, sessionID)
        showDashboardDialog(ctx, "SDD Dashboard Started", `Dashboard running at ${result.url}\n\nOpen in browser to view the Knowledge Graph visualization.`, result.url)
      } catch (error) {
        sddError("commands", "Start dashboard failed", error as Error)
        ctx.ui.toast({ message: `Failed to start dashboard: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "stop": createCommandHandler(
      stopDashboard,
      { title: "Stop Dashboard", toastOnSuccess: true, toastOnError: true }
    ),
    "off": createCommandHandler(
      stopDashboard,
      { title: "Stop Dashboard", toastOnSuccess: true, toastOnError: true }
    ),
    "status": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await getDashboardStatus(ctx.client, sessionID)
        showStatusDialog(ctx, "SDD Dashboard Status", result.running
          ? `**Running:** Yes\n**URL:** ${result.url}\n**Port:** ${result.port}`
          : `**Running:** No\n**Preferred Port:** ${result.port}\n\nUse \`/sdd viz\` to start the dashboard.`)
      } catch (error) {
        sddError("commands", "Dashboard status failed", error as Error)
        ctx.ui.toast({ message: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    }
  })

  // ─── /sdd status ──────────────────────────────────────────────────────────
  const statusHandler = async (ctx: TuiPluginApi, _input?: string) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    try {
      const result = await getSddStatus(ctx.client, sessionID)
      showStatusDialog(ctx, "SDD Status", `**Enforcement:** ${result.enabled ? "🟢 ON" : "🔴 OFF"}\n` +
        `**Dashboard:** ${result.dashboard_url || "Not running"}\n` +
        `**Graph Initialized:** ${result.graph_initialized ? "Yes" : "No"}\n` +
        `**Nodes:** ${result.node_count}\n` +
        `**Changes:** ${result.change_count}`)
    } catch (error) {
      sddError("commands", "Status failed", error as Error)
      ctx.ui.toast({ message: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
    }
  }

  // ─── /sdd on/off ──────────────────────────────────────────────────────────
  const onHandler = createCommandHandler(
    enableSdd,
    { title: "Enable SDD", toastOnSuccess: true, toastOnError: true }
  )

  const offHandler = createCommandHandler(
    disableSdd,
    { title: "Disable SDD", toastOnSuccess: true, toastOnError: true }
  )

  // ─── /sdd renew ───────────────────────────────────────────────────────────
  const renewHandler = async (ctx: TuiPluginApi, _input?: string) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    try {
      const result = await renewWorkflow(ctx.client, sessionID)
      showStatusDialog(ctx, "Workflow Renewed", result.text)
    } catch (error) {
      sddError("commands", "Renew workflow failed", error as Error)
      ctx.ui.toast({ message: `Failed to renew workflow: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
    }
  }

  // ─── /sdd cache_reset ─────────────────────────────────────────────────────
  const cacheResetHandler = async (ctx: TuiPluginApi, _input?: string) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    try {
      const result = await resetCache(ctx.client, sessionID)
      showStatusDialog(ctx, "Cache Reset Complete", result.text)
    } catch (error) {
      sddError("commands", "Cache reset failed", error as Error)
      ctx.ui.toast({ message: `Failed to reset cache: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
    }
  }

  // ─── /sdd tasks ───────────────────────────────────────────────────────────
  const tasksHandler = createSubcommandHandler({
    "": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await getTaskBoard(ctx.client, sessionID)
        showTaskBoardDialog(ctx, "SDD Task Board", result.tasks.length > 0
          ? `Found ${result.tasks.length} tasks across ${Object.keys(result.columns).length} columns.\n\nUse the Kanban tab in the dashboard for full management.`
          : "No tasks on the board yet.\n\nCreate tasks from the dashboard Kanban or run \`sdd.integrate_tasks\` from the agent.",
          result.tasks,
          () => {
            ctx.ui.toast({ message: "Opening dashboard...", variant: "info" })
          })
      } catch (error) {
        sddError("commands", "Task board failed", error as Error)
        ctx.ui.toast({ message: `Failed to get tasks: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "board": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await getTaskBoard(ctx.client, sessionID)
        showTaskBoardDialog(ctx, "SDD Task Board", result.tasks.length > 0
          ? `Found ${result.tasks.length} tasks across ${Object.keys(result.columns).length} columns.`
          : "No tasks on the board yet.",
          result.tasks,
          () => {
            ctx.ui.toast({ message: "Opening dashboard Kanban...", variant: "info" })
          })
      } catch (error) {
        sddError("commands", "Task board failed", error as Error)
        ctx.ui.toast({ message: `Failed to get tasks: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "kanban": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        await startDashboard(ctx.client, sessionID)
        ctx.ui.toast({ message: "Dashboard started. Open the Kanban tab in the dashboard.", variant: "success" })
      } catch (error) {
        sddError("commands", "Start dashboard failed", error as Error)
        ctx.ui.toast({ message: `Failed to start dashboard: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "integrate": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await integrateTasks(ctx.client, sessionID)
        showStatusDialog(ctx, "Task Integration", result.text)
      } catch (error) {
        sddError("commands", "Integrate tasks failed", error as Error)
        ctx.ui.toast({ message: `Failed to integrate tasks: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "pending": async (ctx, _input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      try {
        const result = await integrateTasks(ctx.client, sessionID)
        showStatusDialog(ctx, "Pending Task Integration", result.text)
      } catch (error) {
        sddError("commands", "Pending integration failed", error as Error)
        ctx.ui.toast({ message: `Failed to get pending: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    },
    "change": async (ctx, input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      const args = input?.trim().split(/\s+/) || []
      const taskId = args[0]
      const approve = args.includes("--approve")

      if (!taskId) {
        // Show task list for selection
        const result = await getTaskBoard(ctx.client, sessionID)
        if (result.tasks.length === 0) {
          ctx.ui.toast({ message: "No tasks available", variant: "warning" })
          return
        }

        const taskList = result.tasks.map(t => `- ${t.id}: ${t.name} (${t.column})`).join("\n")
        showStatusDialog(ctx, "Select Task for Change", `Available tasks:\n\n${taskList}\n\nUsage: /sdd tasks change <TASK-ID> [--approve]`)
        return
      }

      try {
        const result = await openTaskChange(ctx.client, sessionID, taskId, approve)
        if (result.matched) {
          showStatusDialog(ctx, "Task Change", result.text)
        } else {
          ctx.ui.toast({ message: result.text, variant: "error" })
        }
      } catch (error) {
        sddError("commands", "Open task change failed", error as Error)
        ctx.ui.toast({ message: `Failed to open change: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
      }
    }
  })

  // ─── /sdd acceptance ──────────────────────────────────────────────────────
  const acceptanceHandler = createSubcommandHandler({
    "": async (ctx, input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      const reqId = input?.trim()
      if (!reqId) {
        ctx.ui.toast({ message: "Provide a Requirement ID: /sdd acceptance REQ-001", variant: "warning" })
        return
      }

      const result = await showAcceptance(ctx.client, sessionID, reqId)
      if (result.matched) {
        showStatusDialog(ctx, `Acceptance - ${reqId}`, result.text)
      } else {
        ctx.ui.toast({ message: result.text, variant: "error" })
      }
    },
    "list": async (ctx, input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      const reqId = input?.trim()
      if (!reqId) {
        ctx.ui.toast({ message: "Provide a Requirement ID", variant: "warning" })
        return
      }

      const result = await showAcceptance(ctx.client, sessionID, reqId)
      if (result.matched) {
        showStatusDialog(ctx, `Acceptance - ${reqId}`, result.text)
      } else {
        ctx.ui.toast({ message: result.text, variant: "error" })
      }
    },
    "summary": async (ctx, input) => {
      const sessionID = getActiveSessionId(ctx)
      if (!sessionID) {
        ctx.ui.toast({ message: "No active session", variant: "error" })
        return
      }

      const reqId = input?.trim()
      if (!reqId) {
        ctx.ui.toast({ message: "Provide a Requirement ID", variant: "warning" })
        return
      }

      const result = await showAcceptance(ctx.client, sessionID, reqId)
      if (result.matched) {
        showStatusDialog(ctx, `Acceptance Summary - ${reqId}`, result.text)
      } else {
        ctx.ui.toast({ message: result.text, variant: "error" })
      }
    }
  }, async (ctx, input) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    const reqId = input?.trim()
    if (!reqId) {
      ctx.ui.toast({ message: "Provide a Requirement ID: /sdd acceptance REQ-001", variant: "warning" })
      return
    }

    const result = await showAcceptance(ctx.client, sessionID, reqId)
    if (result.matched) {
      showStatusDialog(ctx, `Acceptance - ${reqId}`, result.text)
    } else {
      ctx.ui.toast({ message: result.text, variant: "error" })
    }
  })

  // ─── /sdd guide ───────────────────────────────────────────────────────────
  const guideHandler = async (ctx: TuiPluginApi, input?: string) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    const match = input?.match(/^(\S+)\s+(.+)$/)
    if (!match || !match[1]) {
      ctx.ui.toast({ message: "Usage: /sdd guide NODE-001 human guidance", variant: "warning" })
      return
    }

    const result = await showGuidance(ctx.client, sessionID, match[1])
    if (result.matched) {
      ctx.ui.toast({ message: result.text, variant: "success" })
    } else {
      ctx.ui.toast({ message: result.text, variant: "error" })
    }
  }

  // ─── /sdd panel/help ──────────────────────────────────────────────────────
  const panelHandler = async (ctx: TuiPluginApi, _input?: string) => {
    const sessionID = getActiveSessionId(ctx)
    if (!sessionID) {
      ctx.ui.toast({ message: "No active session", variant: "error" })
      return
    }

    try {
      const result = await executeSddCommand(ctx.client, sessionID, "panel")
      if (result.matched) {
        showPanelDialog(ctx, "SDD Command Panel", result.text, (cmd) => {
          ctx.keymap.dispatchCommand(cmd)
        })
      } else {
        ctx.ui.toast({ message: result.text, variant: "error" })
      }
    } catch (error) {
      sddError("commands", "Panel failed", error as Error)
      ctx.ui.toast({ message: `Failed to show panel: ${error instanceof Error ? error.message : String(error)}`, variant: "error" })
    }
  }

  // Build the keymap layer
  const commands = [
    // /sdd viz
    {
      id: "sdd.viz",
      title: "SDD Dashboard",
      group: "SDD",
      slash: { name: "sdd", aliases: ["viz"], arguments: true },
      run: vizHandler
    },
    // /sdd status
    {
      id: "sdd.status",
      title: "SDD Status",
      group: "SDD",
      slash: { name: "sdd", aliases: ["status"], arguments: false },
      run: statusHandler
    },
    // /sdd on
    {
      id: "sdd.on",
      title: "Enable SDD Enforcement",
      group: "SDD",
      slash: { name: "sdd", aliases: ["on", "enable"], arguments: false },
      run: onHandler
    },
    // /sdd off
    {
      id: "sdd.off",
      title: "Disable SDD Enforcement",
      group: "SDD",
      slash: { name: "sdd", aliases: ["off", "disable"], arguments: false },
      run: offHandler
    },
    // /sdd renew
    {
      id: "sdd.renew",
      title: "Renew SDD Workflow",
      group: "SDD",
      slash: { name: "sdd", aliases: ["renew"], arguments: false },
      run: renewHandler
    },
    // /sdd cache_reset
    {
      id: "sdd.cache_reset",
      title: "Reset SDD Caches",
      group: "SDD",
      slash: { name: "sdd", aliases: ["cache_reset", "cachereset"], arguments: false },
      run: cacheResetHandler
    },
    // /sdd tasks
    {
      id: "sdd.tasks",
      title: "SDD Task Board",
      group: "SDD",
      slash: { name: "sdd", aliases: ["tasks"], arguments: true },
      run: tasksHandler
    },
    // /sdd acceptance
    {
      id: "sdd.acceptance",
      title: "SDD Acceptance Criteria",
      group: "SDD",
      slash: { name: "sdd", aliases: ["acceptance"], arguments: true },
      run: acceptanceHandler
    },
    // /sdd guide
    {
      id: "sdd.guide",
      title: "SDD Human Guidance",
      group: "SDD",
      slash: { name: "sdd", aliases: ["guide"], arguments: true },
      run: guideHandler
    },
    // /sdd panel
    {
      id: "sdd.panel",
      title: "SDD Command Panel",
      group: "SDD",
      slash: { name: "sdd", aliases: ["panel", "help"], arguments: false },
      run: panelHandler
    }
  ]

  // Register the layer
  const unregister = ctx.keymap.registerLayer({
    mode: "global",
    priority: 100,
    commands,
    bindings: []
  })

  sddDebug("commands", "SDD TUI commands registered successfully")

  // Return cleanup function
  return () => {
    unregister()
    sddDebug("commands", "SDD TUI commands unregistered")
  }
}

/**
 * Get the active session ID from the TUI state
 */
function getActiveSessionId(ctx: TuiPluginApi): string | undefined {
  // Try to get from route first (most reliable)
  if (ctx.route.current.name === "session" && ctx.route.current.params?.sessionID) {
    return ctx.route.current.params.sessionID as string
  }

  return undefined
}