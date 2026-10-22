export interface MetronomeConfig {
  bpm: number
  subdivision: number
  swing: number
  humanizeMs: number
  accentPattern: number[]
  clickVolume: number
}

export class MetronomeEngine {
  private context: AudioContext | null = null
  private timer: number | null = null
  private nextNoteTime = 0
  private beatIndex = 0

  start(config: MetronomeConfig, onTick: (beat: number, time: number) => void): void {
    if (this.timer) return
    this.context = this.context ?? new AudioContext()
    this.nextNoteTime = this.context.currentTime

    const schedule = () => {
      if (!this.context) return

      while (this.nextNoteTime < this.context.currentTime + 0.1) {
        this.scheduleClick(config, this.nextNoteTime, this.beatIndex)
        onTick(this.beatIndex, this.nextNoteTime)

        const beatsPerSecond = config.bpm / 60
        const step = 1 / (beatsPerSecond * config.subdivision)
        const swingOffset = this.beatIndex % 2 === 1 ? step * (config.swing * 0.33) : 0
        const humanizeOffset = (Math.random() * 2 - 1) * (config.humanizeMs / 1000)

        this.nextNoteTime += step + swingOffset + humanizeOffset
        this.beatIndex += 1
      }
    }

    this.timer = window.setInterval(schedule, 25)
  }

  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  private scheduleClick(config: MetronomeConfig, time: number, beat: number): void {
    if (!this.context) return

    const osc = this.context.createOscillator()
    const gain = this.context.createGain()

    const accent = config.accentPattern[beat % config.accentPattern.length] ?? 1
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
