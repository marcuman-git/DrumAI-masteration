import { Factory } from 'vexflow'

export interface DrumNotationPattern {
  title: string
  notes: string[]
  sticking?: string[]
}

export function renderDrumPattern(container: HTMLElement, pattern: DrumNotationPattern): void {
  try {
    container.innerHTML = ''
    if (!container.id) {
      container.id = `notation-${Math.random().toString(36).slice(2)}`
    }

    const width = Math.max(480, container.clientWidth || 480)
    const factory = new Factory({
      renderer: {
        elementId: container.id,
        width,
        height: 170,
      },
    })

    const score = factory.EasyScore()
    const system = factory.System({ x: 12, y: 20, width: width - 24 })

    const voice = score.voice(score.notes(pattern.notes.join(', '), { stem: 'up' }))
    system.addStave({ voices: [voice] })
    factory.draw()
  } catch (error) {
    container.innerHTML =
      '<div style="padding:16px;color:#111;font-family:sans-serif;">Unable to render notation for this pattern.</div>'
    console.error(error)
  }
}

export function generateFillPattern(complexity: number, style = 'Rock'): DrumNotationPattern {
  const stylePools: Record<string, string[]> = {
    Rock: ['c5/8', 'd4/8', 'f4/8', 'c5/16'],
    Funk: ['c5/16', 'd4/16', 'd4/8', 'f4/16'],
    Fusion: ['c5/16', 'd4/16', 'f4/16', 'c5/8'],
    Metal: ['f4/16', 'f4/16', 'd4/16', 'c5/16'],
    Gospel: ['d4/16', 'c5/16', 'd4/8', 'f4/16'],
    Progressive: ['c5/16', 'd4/16', 'f4/16', 'c5/8', 'd4/8'],
  }
  const pool = stylePools[style] ?? stylePools.Rock
  const restPool = ['c5/8r', 'c5/16r', 'd4/16r']
  const length = Math.max(4, Math.min(16, complexity * 2 + 4))

  const restChance = Math.min(0.28, complexity * 0.025)
  const notes = Array.from({ length }, () => {
    if (Math.random() < restChance) {
      return restPool[Math.floor(Math.random() * restPool.length)]
    }
    return pool[Math.floor(Math.random() * pool.length)]
  })

  return {
    title: 'Generated Fill',
    notes,
  }
}
