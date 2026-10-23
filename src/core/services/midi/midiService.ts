export interface MidiHit {
  note: number
  velocity: number
  timestamp: number
  device: string
}

export async function connectMidi(onHit: (hit: MidiHit) => void): Promise<() => void> {
  if (!('requestMIDIAccess' in navigator)) {
    throw new Error('MIDI is not supported in this browser.')
  }

  const access = await navigator.requestMIDIAccess()
  const handlers: Array<{ input: MIDIInput; fn: (event: MIDIMessageEvent) => void }> = []
  const inputs = Array.from(access.inputs.values())

  if (!inputs.length) {
    throw new Error('No MIDI inputs detected.')
  }

  inputs.forEach((input) => {
    const handler = (event: MIDIMessageEvent) => {
      if (!event.data) return
      const [status, note, velocity] = Array.from(event.data)
      const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0
      if (!isNoteOn) return

      onHit({
        note,
        velocity,
        timestamp: performance.now(),
        device: input.name ?? 'Generic MIDI Device',
      })
    }

    input.addEventListener('midimessage', handler)
    handlers.push({ input, fn: handler })
  })

  return () => {
    handlers.forEach(({ input, fn }) => input.removeEventListener('midimessage', fn))
  }
}
