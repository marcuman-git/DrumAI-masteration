import { useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import type { DrumNotationPattern } from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

const questionBank: Array<{
  id: string
  prompt: DrumNotationPattern
  answers: string[]
  correct: string
  difficulty: Difficulty
}> = [
  {
    id: 'q1',
    prompt: { title: 'Question 1', notes: ['c5/8', 'c5/8', 'd4/8', 'c5/8'] },
    answers: ['Straight 8ths with backbeat', 'Triplet phrase', 'Syncopated sixteenths'],
    correct: 'Straight 8ths with backbeat',
    difficulty: 'Beginner',
  },
  {
    id: 'q2',
    prompt: { title: 'Question 2', notes: ['c5/16', 'c5/16', 'd4/8', 'f4/8'] },
    answers: ['Straight 8ths with backbeat', 'Syncopated sixteenths', 'Shuffle'],
    correct: 'Syncopated sixteenths',
    difficulty: 'Intermediate',
  },
  {
    id: 'q3',
    prompt: { title: 'Question 3', notes: ['c5/8', 'd4/16', 'c5/16', 'c5/8'] },
    answers: ['Triplet phrase', 'Linear sixteenth phrase', 'Half-time groove'],
    correct: 'Linear sixteenth phrase',
    difficulty: 'Intermediate',
  },
  {
    id: 'q4',
    prompt: { title: 'Question 4', notes: ['c5/16', 'd4/16', 'c5/16', 'f4/16', 'c5/8'] },
    answers: ['Linear burst into accent', 'Basic 8ths', 'Shuffle ride'],
    correct: 'Linear burst into accent',
    difficulty: 'Advanced',
  },
  {
    id: 'q5',
    prompt: { title: 'Question 5', notes: ['c5/8', 'c5/16', 'd4/16', 'f4/16', 'c5/16'] },
    answers: ['Odd grouping phrase', 'Paradiddle orchestration', 'Rock backbeat'],
    correct: 'Odd grouping phrase',
    difficulty: 'Advanced',
  },
  {
    id: 'q6',
    prompt: { title: 'Question 6', notes: ['c5/16', 'd4/16', 'c5/16', 'd4/16', 'f4/16', 'c5/16'] },
    answers: ['Metric modulation phrase', 'Simple 8ths', 'Basic triplet'],
    correct: 'Metric modulation phrase',
    difficulty: 'Expert',
  },
]

export function RhythmDictationView() {
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | Difficulty>('All')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [tempo, setTempo] = useState(95)

  const questions = useMemo(() => {
    if (difficultyFilter === 'All') return questionBank
    const filtered = questionBank.filter((item) => item.difficulty === difficultyFilter)
    return filtered.length ? filtered : questionBank
  }, [difficultyFilter])

  const question = questions[questionIndex % questions.length]

  function handleDifficultyChange(value: 'All' | Difficulty) {
    setDifficultyFilter(value)
    setQuestionIndex(0)
    setSelected(null)
    setResult(null)
  }

  async function playQuestion() {
    await playPattern(question.prompt, tempo)
  }

  function submitAnswer() {
    if (!selected) return
    setResult(selected === question.correct ? 'correct' : 'incorrect')
  }

  function nextQuestion() {
    if (!result) return
    setQuestionIndex((value) => (value + 1) % questions.length)
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
      <SectionHeader title="Rhythm Dictation" subtitle="Ear training with guided answer feedback and multi-level difficulty tracks." />

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
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirm Answer
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!result}
              className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            Current: {question.difficulty}
          </p>

          <label className="mt-3 block text-xs text-zinc-300">
            Difficulty Track
            <select
              value={difficultyFilter}
              onChange={(event) => handleDifficultyChange(event.target.value as 'All' | Difficulty)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="All">All</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </label>

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
          <p className="mt-2 text-xs text-zinc-400">Pool size: {questions.length} quiz items in current track.</p>
        </GlassCard>
      </div>
    </div>
  )
}
