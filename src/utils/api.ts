/**
 * API client utilities for communicating with the Telos SDD server plugin
 */

import type { OpencodeClient } from "@opencode-ai/sdk/v2"
import { sddDebug } from "./debug.js"

export interface SddCommandResult {
  text: string
  matched: boolean
}

export interface DashboardStartResult {
  url: string
  port: number
}

export interface DashboardStatusResult {
  running: boolean
  url: string | null
  port: number
}

export interface TaskBoardResult {
  tasks: Array<{
    id: string
    name: string
    column: string
    priority: string
    integration_status: string
    change_id?: string
    links?: string[]
  }>
  columns: Record<string, string[]>
}

export interface SddStatusResult {
  enabled: boolean
  dashboard_url: string | null
  graph_initialized: boolean
  node_count: number
  change_count: number
}

/**
 * Execute an SDD command on the server and return the result
 */
export async function executeSddCommand(
  client: OpencodeClient,
  sessionID: string,
  subcommand: string,
  args: string = ""
): Promise<SddCommandResult> {
  const fullCommand = args ? `sdd ${subcommand} ${args}` : `sdd ${subcommand}`

  sddDebug("api", `Executing command: ${fullCommand}`)

  try {
    const result = await client.session.command({
      sessionID,
      command: "sdd",
      arguments: `${subcommand} ${args}`.trim()
    })

    // The server command returns text in the response
    // The result type varies, so we handle it carefully
    const text = (result as any).text || (result as any).data?.text || ""

    return {
      matched: true,
      text
    }
  } catch (error) {
    sddError("api", `Command failed: ${fullCommand}`, error as Error)
    return {
      matched: false,
      text: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Start the SDD dashboard
 */
export async function startDashboard(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<DashboardStartResult> {
  const result = await executeSddCommand(client, sessionID, "viz")

  if (!result.matched) {
    throw new Error(result.text || "Failed to start dashboard")
  }

  // Extract URL from result text
  const urlMatch = result.text.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s]+)/)
  const url = urlMatch?.[1] || `http://127.0.0.1:7331`

  // Extract port
  const portMatch = url.match(/:(\d+)/)
  const port = portMatch && portMatch[1] ? parseInt(portMatch[1], 10) : 7331

  return { url, port }
}

/**
 * Stop the SDD dashboard
 */
export async function stopDashboard(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<boolean> {
  const result = await executeSddCommand(client, sessionID, "viz", "stop")
  return result.matched && result.text.toLowerCase().includes("stopped")
}

/**
 * Get dashboard status
 */
export async function getDashboardStatus(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<DashboardStatusResult> {
  const result = await executeSddCommand(client, sessionID, "viz", "status")

  if (!result.matched) {
    return { running: false, url: null, port: 7331 }
  }

  const running = result.text.includes("Running:") && !result.text.includes("Running: no")
  const urlMatch = result.text.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s]+)/)
  const url = urlMatch?.[1] || null
  const portMatch = result.text.match(/Preferred port:\s*(\d+)/)
  const port = portMatch && portMatch[1] ? parseInt(portMatch[1], 10) : 7331

  return { running, url, port }
}

/**
 * Get SDD status (toggle, dashboard, graph info)
 */
export async function getSddStatus(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddStatusResult> {
  const result = await executeSddCommand(client, sessionID, "status")

  if (!result.matched) {
    return {
      enabled: false,
      dashboard_url: null,
      graph_initialized: false,
      node_count: 0,
      change_count: 0
    }
  }

  const enabled = result.text.includes("Status: 🟢 ON")
  const dashboardMatch = result.text.match(/\*\*Dashboard:\*\*\s*(.+)/)
  const dashboard_url = dashboardMatch?.[1]?.includes("not running") ? null : dashboardMatch?.[1] || null

  // Try to get graph info from panel command
  const panelResult = await executeSddCommand(client, sessionID, "panel")
  let graph_initialized = false
  let node_count = 0
  let change_count = 0

  if (panelResult.matched) {
    graph_initialized = !panelResult.text.includes("not initialized")
    const nodeMatch = panelResult.text.match(/Nodes \( (\d+) \)/)
    const changeMatch = panelResult.text.match(/Changes \( (\d+) \)/)
    node_count = nodeMatch && nodeMatch[1] ? parseInt(nodeMatch[1], 10) : 0
    change_count = changeMatch && changeMatch[1] ? parseInt(changeMatch[1], 10) : 0
  }

  return {
    enabled,
    dashboard_url,
    graph_initialized,
    node_count,
    change_count
  }
}

/**
 * Get task board data
 */
export async function getTaskBoard(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<TaskBoardResult> {
  const result = await executeSddCommand(client, sessionID, "tasks")

  if (!result.matched) {
    return { tasks: [], columns: {} }
  }

  // Parse the task board output
  // This is a simplified parser - in reality you'd want the server to return structured data
  const tasks: TaskBoardResult["tasks"] = []
  const columns: TaskBoardResult["columns"] = {}

  return { tasks, columns }
}

/**
 * Open change for a task
 */
export async function openTaskChange(
  client: OpencodeClient,
  sessionID: string,
  taskId: string,
  approve: boolean = false
): Promise<SddCommandResult> {
  const args = approve ? `change ${taskId} --approve` : `change ${taskId}`
  return executeSddCommand(client, sessionID, "tasks", args)
}

/**
 * Integrate pending tasks
 */
export async function integrateTasks(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "tasks", "integrate")
}

/**
 * Enable SDD enforcement
 */
export async function enableSdd(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "on")
}

/**
 * Disable SDD enforcement
 */
export async function disableSdd(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "off")
}

/**
 * Renew workflow
 */
export async function renewWorkflow(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "renew")
}

/**
 * Reset caches
 */
export async function resetCache(
  client: OpencodeClient,
  sessionID: string,
  _args?: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "cache_reset")
}

/**
 * Show acceptance criteria
 */
export async function showAcceptance(
  client: OpencodeClient,
  sessionID: string,
  requirementId?: string
): Promise<SddCommandResult> {
  const args = requirementId ? requirementId : ""
  return executeSddCommand(client, sessionID, "acceptance", args)
}

/**
 * Show guidance for a node
 */
export async function showGuidance(
  client: OpencodeClient,
  sessionID: string,
  nodeId: string
): Promise<SddCommandResult> {
  return executeSddCommand(client, sessionID, "guide", nodeId)
}

function sddError(namespace: string, message: string, error: Error): void {
  sddDebug(namespace, `ERROR: ${message}`, error)
}