import type { DrumPlugin } from '../../types/drumming'

const plugins = new Map<string, DrumPlugin>()

export function registerPlugin(plugin: DrumPlugin): void {
  if (plugins.has(plugin.id)) return
  plugins.set(plugin.id, plugin)
  plugin.initialize()
}

export function listPlugins(): DrumPlugin[] {
  return Array.from(plugins.values())
}
