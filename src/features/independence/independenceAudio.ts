import type { Limb } from './independenceLogic'
export function createDrumPlayer(context: AudioContext) {
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.25), context.sampleRate)
  const samples = noise.getChannelData(0)
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1
  return (limb: Limb, time: number, ride: boolean, ghost: boolean) => {
    const gain = context.createGain()
    const duration = limb === 'RF' ? 0.16 : limb === 'LH' ? 0.12 : ride && limb === 'RH' ? 0.23 : 0.055
    gain.gain.setValueAtTime(ghost ? 0.07 : limb === 'RF' ? 0.35 : 0.16, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    gain.connect(context.destination)
    if (limb === 'RF') {
      const oscillator = context.createOscillator()
      oscillator.frequency.setValueAtTime(130, time)
      oscillator.frequency.exponentialRampToValueAtTime(45, time + duration)
      oscillator.connect(gain); oscillator.start(time); oscillator.stop(time + duration)
    } else {
      const source = context.createBufferSource(); source.buffer = noise
      const filter = context.createBiquadFilter()
      filter.type = limb === 'LH' ? 'bandpass' : 'highpass'
      filter.frequency.value = limb === 'LH' ? 1800 : limb === 'LF' ? 8000 : ride ? 3500 : 6500
      filter.Q.value = limb === 'LH' ? 0.7 : 0.5
      source.connect(filter); filter.connect(gain); source.start(time); source.stop(time + duration)
      if (limb === 'LH') {
        const body = context.createOscillator(); const bodyGain = context.createGain()
        body.frequency.value = 185; body.type = 'triangle'
        bodyGain.gain.setValueAtTime(ghost ? 0.025 : 0.09, time)
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07)
        body.connect(bodyGain); bodyGain.connect(context.destination); body.start(time); body.stop(time + 0.08)
      }
    }
  }
}
