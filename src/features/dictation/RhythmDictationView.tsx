import { useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import type { DrumNotationPattern } from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const questionBank: Array<{
  prompt: DrumNotationPattern
  answers: string[]
  correct: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
}> = [
  {
    prompt: { title: 'Question 1', notes: ['c5/8', 'c5/8', 'd4/8', 'c5/8'] },
    answers: ['Straight 8ths with backbeat', 'Triplet phrase', 'Syncopated sixteenths'],
    correct: 'Straight 8ths with backbeat',
    difficulty: 'Beginner',
  },
  {
    prompt: { title: 'Question 2', notes: ['c5/16', 'c5/16', 'd4/8', 'f4/8'] },
    answers: ['Straight 8ths with backbeat', 'Syncopated sixteenths', 'Shuffle'],
    correct: 'Syncopated sixteenths',
    difficulty: 'Intermediate',
  },
]

export function RhythmDictationView() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [tempo, setTempo] = useState(95)

  const question = useMemo(() => questionBank[questionIndex], [questionIndex])

  async function playQuestion() {
    await playPattern(question.prompt, tempo)
  }

  function submitAnswer() {
    if (!selected) return
    setResult(selected === question.correct ? 'correct' : 'incorrect')
  }

  function nextQuestion() {
    if (!result) return
    setQuestionIndex((value) => (value + 1) % questionBank.length)
    setSelected(null)
    setResult(null)
  }

  function answerClasses(answer: string): string {
    if (!result) {
      return selected === answer
        ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
        : 'border-white/10 text-zinc-200'
    }

    if (answer === question.correct) {
      return 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
    }

    if (answer === selected && selected !== question.correct) {
      return 'border-rose-400/50 bg-rose-500/20 text-rose-100'
    }

    return 'border-white/10 text-zinc-400'
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Rhythm Dictation" subtitle="Ear training with multiple-choice, subdivision recognition, and progressive challenge." />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Listen and Identify</p>
            <button
              type="button"
              onClick={playQuestion}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Volume2 size={12} /> Play Rhythm
            </button>
          </div>

          <div className="grid gap-2">
            {question.answers.map((answer) => (
              <button
                key={answer}
                type="button"
                onClick={() => setSelected(answer)}
                disabled={Boolean(result)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${answerClasses(answer)}`}
              >
                {answer}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!selected || Boolean(result)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-100"
            >
              Confirm Answer
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!result}
              className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
            >
              Next Quiz
            </button>
          </div>

          {result ? (
            <p className={`text-sm ${result === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {result === 'correct' ? 'Correct notation and subdivision.' : `Not quite. Correct answer: ${question.correct}`}
            </p>
          ) : null}
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Mode + Difficulty</p>
          <p className="mt-2 inline-block rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            Difficulty: {question.difficulty}
          </p>
          <label className="mt-3 block text-xs text-zinc-300">
            Playback Tempo {tempo} BPM
            <input
              type="range"
              min={60}
              max={180}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>
          <p className="mt-3 text-xs text-zinc-400">Modes: Multiple choice, interactive notation, ear training.</p>
          <p className="mt-2 text-xs text-zinc-400">Difficulty scale: Beginner to expert.</p>
        </GlassCard>
      </div>
    </div>
  )
}
