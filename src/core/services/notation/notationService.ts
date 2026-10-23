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

export function generateFillPattern(complexity: number): DrumNotationPattern {
  const pool = ['c5/8', 'c5/16', 'd4/16', 'f4/16']
  const length = Math.max(4, Math.min(16, complexity * 2 + 4))

  const notes = Array.from({ length }, () => pool[Math.floor(Math.random() * pool.length)])
  const sticking = Array.from({ length }, (_, i) => (i % 2 === 0 ? 'R' : 'L'))

  return {
    title: 'Generated Fill',
    notes,
    sticking,
  }
}
