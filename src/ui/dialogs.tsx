/**
 * UI components - using the TUI plugin API's built-in dialog components
 */

import type { JSX } from "@opentui/solid"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

/**
 * Show a dashboard dialog with URL and actions
 */
export function showDashboardDialog(
  ctx: TuiPluginApi,
  title: string,
  description: string,
  url?: string,
  onOpenBrowser?: () => void,
  onCopyUrl?: () => void
): void {
  const actions: Array<{ label: string; onSelect: () => void }> = []

  if (url) {
    actions.push(
      { label: "Open in Browser", onSelect: onOpenBrowser || (() => {
          navigator.clipboard?.writeText(url).then(() => {
            ctx.ui.toast({ message: `Copied ${url} to clipboard`, variant: "success" })
          }).catch(() => {
            ctx.ui.toast({ message: `URL: ${url}`, variant: "info" })
          })
        })
      },
      { label: "Copy URL", onSelect: onCopyUrl || (() => {
          navigator.clipboard?.writeText(url).then(() => {
            ctx.ui.toast({ message: "URL copied to clipboard", variant: "success" })
          }).catch(() => {
            ctx.ui.toast({ message: `URL: ${url}`, variant: "info" })
          })
        })
      }
    )
  }

  actions.push({ label: "Close", onSelect: () => {} })

  ctx.ui.dialog.replace(() => (
    <DialogContent title={title} description={description} actions={actions} />
  ))
}

/**
 * Show a status dialog
 */
export function showStatusDialog(
  ctx: TuiPluginApi,
  title: string,
  description: string,
  actions: Array<{ label: string; onSelect: () => void }> = []
): void {
  ctx.ui.dialog.replace(() => (
    <DialogContent title={title} description={description} actions={[
      ...actions,
      { label: "Close", onSelect: () => {} }
    ]} />
  ))
}

/**
 * Show a panel dialog with command list
 */
export function showPanelDialog(
  ctx: TuiPluginApi,
  title: string,
  description: string,
  onRunCommand?: (command: string) => void
): void {
  const commands = [
    { cmd: "sdd", desc: "Show this panel" },
    { cmd: "sdd on", desc: "Enable SDD enforcement" },
    { cmd: "sdd off", desc: "Disable SDD enforcement" },
    { cmd: "sdd status", desc: "Show current toggle state" },
    { cmd: "sdd renew", desc: "Renew the active workflow window" },
    { cmd: "sdd cache_reset", desc: "Clear caches without killing the session" },
    { cmd: "sdd tasks", desc: "List the Kanban task board" },
    { cmd: "sdd tasks board", desc: "Open the task board in dashboard" },
    { cmd: "sdd tasks integrate", desc: "Show pending AI integration tasks" },
    { cmd: "sdd tasks change <ID>", desc: "Open SDD Change for a task" },
    { cmd: "sdd acceptance <REQ-ID>", desc: "Show acceptance criteria for requirement" },
    { cmd: "sdd acceptance create <REQ-ID> <text>", desc: "Create acceptance criterion" },
    { cmd: "sdd acceptance accept <AC-ID>", desc: "Accept an acceptance criterion" },
    { cmd: "sdd guide <NODE-ID> <text>", desc: "Register human guidance for a node" },
    { cmd: "sdd viz", desc: "Start the Knowledge Graph dashboard" },
    { cmd: "sdd viz stop", desc: "Stop the dashboard" },
    { cmd: "sdd viz status", desc: "Show dashboard status" }
  ]

  ctx.ui.dialog.replace(() => (
    <DialogContent
      title={title}
      description={description}
      actions={[{ label: "Close", onSelect: () => {} }]}
      customContent={() => (
        <div class="command-list">
          {commands.map((cmd, i) => (
            <div
              data-key={`cmd-${i}`}
              class="command-item"
              onClick={() => onRunCommand?.(cmd.cmd)}
              style={{ cursor: onRunCommand ? "pointer" : "default" } as any}
            >
              <code class="command-name">{cmd.cmd}</code>
              <span class="command-desc">{cmd.desc}</span>
            </div>
          ))}
        </div>
      )}
    />
  ))
}

/**
 * Show a task board dialog
 */
export function showTaskBoardDialog(
  ctx: TuiPluginApi,
  title: string,
  description: string,
  tasks: Array<{
    id: string
    name: string
    column: string
    priority: string
    integration_status: string
    change_id?: string
    links?: string[]
  }> = [],
  onOpenDashboard?: () => void
): void {
  const columnOrder = ["backlog", "ready", "in_progress", "blocked", "done"]
  const columnLabels: Record<string, string> = {
    backlog: "📥 Backlog",
    ready: "✅ Ready",
    in_progress: "🔄 In Progress",
    blocked: "🚫 Blocked",
    done: "✅ Done"
  }
  const priorityColors: Record<string, string> = {
    critical: "#da3633",
    high: "#f0883e",
    medium: "#d29922",
    low: "#8b949e"
  }

  ctx.ui.dialog.replace(() => (
    <DialogContent
      title={title}
      description={description}
      actions={[
        ...(onOpenDashboard ? [{ label: "Open Dashboard Kanban", onSelect: onOpenDashboard }] : []),
        { label: "Close", onSelect: () => {} }
      ]}
      customContent={() => (
        <div class="task-board" style={{ maxWidth: "90vw", maxHeight: "90vh" } as any}>
          {columnOrder.map((col) => {
            const colTasks = tasks.filter(t => t.column === col)
            if (colTasks.length === 0) return null

            return (
              <div class="column" data-key={`col-${col}`}>
                <h4 class="column-header">
                  {columnLabels[col] || col} <span class="count">({colTasks.length})</span>
                </h4>
                <div class="tasks">
                  {colTasks.map((task) => (
                    <div class="task-card" data-key={`task-${task.id}`}>
                      <div class="task-header">
                        <span class="task-id">{task.id}</span>
                        <span class="task-priority"
                          style={{ backgroundColor: priorityColors[task.priority] || priorityColors["medium"] } as any}>
                          {task.priority}
                        </span>
                      </div>
                      <div class="task-name">{task.name}</div>
                      {task.change_id && (
                        <div class="task-change">Change: {task.change_id}</div>
                      )}
                      {task.links && task.links.length > 0 && (
                        <div class="task-links">
                          Links: {task.links.join(", ")}
                        </div>
                      )}
                      <div class="task-integration">
                        Integration: {task.integration_status}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div class="empty-column">(empty)</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    />
  ))
}

/**
 * Internal dialog content component that wraps the TUI dialog
 */
function DialogContent(props: {
  title: string
  description: string
  actions: Array<{ label: string; onSelect: () => void }>
  customContent?: () => JSX.Element
}): JSX.Element {
  return (
    <div class="sdd-dialog-content">
      <div class="dialog-header">
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      {props.customContent ? props.customContent() : null}
      <div class="dialog-footer">
        {props.actions.map((action, i) => (
          <button
            data-key={`action-${i}`}
            class={`btn ${i === props.actions.length - 1 ? "btn-secondary" : "btn-primary"}`}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}