import type { GrooveInstrument } from './grooveLibraryLogic'
export function createGroovePlayer(context: AudioContext) {
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.3), context.sampleRate)
  const samples = noise.getChannelData(0)
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1
  return (instrument: GrooveInstrument, time: number, soft: boolean, volume: number) => {
    if (volume <= 0) return
    const gain = context.createGain()
    const duration = instrument === 'Ride' ? 0.28 : instrument === 'Kick' ? 0.16 : instrument === 'Snare' ? 0.12 : 0.055
    const strength = volume * (soft ? 0.22 : 0.8)
    gain.gain.setValueAtTime(Math.max(0.0001, strength * (instrument === 'Kick' ? 1 : 0.5)), time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    gain.connect(context.destination)
    if (instrument === 'Kick' || instrument === 'Shell') {
      const oscillator = context.createOscillator()
      oscillator.type = instrument === 'Shell' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(instrument === 'Kick' ? 130 : 1250, time)
      if (instrument === 'Kick') oscillator.frequency.exponentialRampToValueAtTime(45, time + duration)
      oscillator.connect(gain); oscillator.start(time); oscillator.stop(time + duration)
    } else {
      const source = context.createBufferSource(); source.buffer = noise
      const filter = context.createBiquadFilter()
      filter.type = instrument === 'Snare' ? 'bandpass' : 'highpass'
      filter.frequency.value = instrument === 'Snare' ? 1800 : instrument === 'Ride' ? 3500 : 6500
      filter.Q.value = 0.7
      source.connect(filter); filter.connect(gain); source.start(time); source.stop(time + duration)
      if (instrument === 'Snare') {
        const body = context.createOscillator(); const bodyGain = context.createGain()
        body.type = 'triangle'; body.frequency.value = 185
        bodyGain.gain.setValueAtTime(Math.max(0.0001, strength * 0.25), time)
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07)
        body.connect(bodyGain); bodyGain.connect(context.destination); body.start(time); body.stop(time + 0.08)
      }
    }
  }
}
