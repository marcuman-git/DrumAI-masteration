export interface MetronomeConfig {
  bpm: number
  subdivision: number
  swing: number
  humanizeMs: number
  accentPattern: number[]
  clickVolume: number
}

export function resolveAccentMultiplier(config: Pick<MetronomeConfig, 'accentPattern' | 'subdivision'>, beat: number): number {
  const hasStepAccents = config.accentPattern.length >= config.subdivision * 4
  const beatStep = Math.floor(beat / Math.max(1, config.subdivision))
  const accentIndex = hasStepAccents ? beat % config.accentPattern.length : beatStep % config.accentPattern.length
  return config.accentPattern[accentIndex] ?? 1
}

export class MetronomeEngine {
  private context: AudioContext | null = null
  private timer: number | null = null
  private nextNoteTime = 0
  private beatIndex = 0
  private config: MetronomeConfig | null = null
  private tickHandler: ((beat: number, time: number) => void) | null = null

  start(config: MetronomeConfig, onTick: (beat: number, time: number) => void): void {
    this.config = config
    this.tickHandler = onTick
    if (this.timer) return
    this.context = this.context ?? new AudioContext()
    this.nextNoteTime = this.context.currentTime

    const schedule = () => {
      if (!this.context || !this.config) return

      while (this.nextNoteTime < this.context.currentTime + 0.1) {
        this.scheduleClick(this.config, this.nextNoteTime, this.beatIndex)
        this.tickHandler?.(this.beatIndex, this.nextNoteTime)

        const beatsPerSecond = this.config.bpm / 60
        const step = 1 / (beatsPerSecond * this.config.subdivision)
        const swingOffset = this.beatIndex % 2 === 1 ? step * (this.config.swing * 0.33) : 0
        const humanizeOffset = (Math.random() * 2 - 1) * (this.config.humanizeMs / 1000)

        this.nextNoteTime += step + swingOffset + humanizeOffset
        this.beatIndex += 1
      }
    }

    this.timer = window.setInterval(schedule, 25)
  }

  updateConfig(config: MetronomeConfig): void {
    this.config = config
  }

  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.config = null
    this.tickHandler = null
    this.beatIndex = 0
  }

  private scheduleClick(config: MetronomeConfig, time: number, beat: number): void {
    if (!this.context) return

    const osc = this.context.createOscillator()
    const gain = this.context.createGain()

    const accent = resolveAccentMultiplier(config, beat)
    osc.type = accent > 1 ? 'triangle' : 'sine'
    osc.frequency.value = accent > 1 ? 1540 : 980

    const velocity = Math.min(1, config.clickVolume * accent)
    gain.gain.setValueAtTime(velocity, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)

    osc.connect(gain)
    gain.connect(this.context.destination)

    osc.start(time)
    osc.stop(time + 0.05)
  }
}
