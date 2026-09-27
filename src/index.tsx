/**
 * Telos SDD TUI Plugin
 *
 * Provides native TUI commands for SDD operations (/sdd viz, /sdd status, /sdd tasks, etc.)
 * without invoking the LLM. Commands communicate with the server plugin via the OpenCode SDK.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginMeta } from "@opencode-ai/plugin/tui"
import { registerSddCommands } from "./commands/register.js"
import { sddDebug } from "./utils/debug.js"

const plugin: TuiPlugin = async (
  ctx: TuiPluginApi,
  _options: any,
  _meta: TuiPluginMeta
): Promise<void> => {
  sddDebug("tui", "Telos SDD TUI plugin initializing")

  // Register all /sdd subcommands via keymap layer
  const cleanup = registerSddCommands(ctx)

  // Return cleanup function for plugin unload
  ctx.lifecycle.onDispose(() => {
    sddDebug("tui", "Telos SDD TUI plugin disposing")
    cleanup()
  })
}

export default plugin