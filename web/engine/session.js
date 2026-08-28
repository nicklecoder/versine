import { makeRng } from './rng.js';
import { getType } from '../math/answer.js';
import { scoreProblem } from './scoring.js';

/**
 * One run of one skill in one mode. Owns all run state; knows nothing about
 * the DOM. The UI drives it with submit()/next()/tick() and re-renders from
 * the events it emits.
 */
export class Session {
  /**
   * @param {{skill:any, level:number, mode:any, seed?:number,
   *          duration?:number, onEvent?:(e:any)=>void}} opts
   */
  constructor({ skill, level, mode, seed, duration, target, deal = null, onEvent = () => {} }) {
    this.skill = skill;
    // Supplied when the level's pre-built library loaded; null falls back to
    // generating, so a missing library degrades rather than breaks.
    this.deal = deal;
    this.mode = mode;
    this.baseLevel = level;
    this.level = level;
    this.rng = makeRng(seed);
    this.onEvent = onEvent;

    this.problem = null;
    this.isRetry = false;
    this.attempts = 0;
    this.startedAt = 0;

    this.served = 0;
    this.answered = 0;
    this.solved = 0;
    this.cleanSolved = 0;
    this.misses = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.points = 0;

    this.totalTime = duration ?? mode.duration ?? Infinity;
    this.timeLeft = this.totalTime;
    /** How many correct answers end the run a winner. Per-level overridable. */
    this.target = target ?? mode.target ?? null;

    this.over = false;
    this.endReason = null;
    /** Missed problems, re-served a few questions later. */
    this.retryQueue = [];
    this.log = [];
    this.lastText = null;
  }

  get timed() {
    return Number.isFinite(this.totalTime);
  }

  start() {
    this.onEvent({ type: 'start' });
    this.nextProblem();
  }

  nextProblem() {
    if (this.over) return null;

    let problem = null;
    this.isRetry = false;

    if (this.mode.allowRetryQueue) {
      const i = this.retryQueue.findIndex((r) => r.dueAt <= this.served);
      if (i >= 0) {
        problem = this.retryQueue.splice(i, 1)[0].problem;
        this.isRetry = true;
      }
    }
    if (!problem) {
      if (this.deal) {
        // A dealt problem is already drawn without replacement, so it cannot
        // repeat until the level's whole deck has been through.
        problem = this.deal();
      } else {
        // Generated fallback, for a level whose library has not been built or
        // could not be fetched. Small levels have a small problem space, so
        // back-to-back repeats feel broken even when they are honest.
        for (let i = 0; i < 6; i++) {
          problem = this.skill.generate(this.rng, this.level);
          if (problem.text !== this.lastText) break;
        }
      }
    }
    this.lastText = problem.text;

    this.problem = problem;
    this.attempts = 0;
    this.startedAt = performance.now();
    this.served++;
    this.onEvent({ type: 'problem', problem, isRetry: this.isRetry });
    return problem;
  }

  /**
   * @param {string} raw
   * @returns {{status:'invalid'|'correct'|'wrong', hint?:string, gained?:number,
   *            advance?:boolean, correctValue?:any}}
   */
  submit(raw) {
    if (this.over || !this.problem) return { status: 'invalid' };

    const spec = this.problem.answer;
    const type = getType(spec.type);
    const parsed = type.parse(raw);
    if (!parsed.ok) return { status: 'invalid', hint: parsed.hint ?? type.hint };

    if (!type.equals(parsed.value, spec.value)) return this.#wrong();

    // Right value, wrong form. Levels that ask for simplest form mean it, and
    // saying so precisely is more use than a bare "not quite".
    if (spec.requireSimplest && type.isSimplest && !type.isSimplest(parsed.value)) {
      const shown = type.format(parsed.value);
      return { ...this.#wrong(), hint: `${shown} is right, but it isn't in lowest terms yet.` };
    }

    return this.#correct();
  }

  #correct() {
    const elapsed = performance.now() - this.startedAt;
    const clean = this.attempts === 0;

    this.answered++;
    this.solved++;
    if (clean) {
      this.cleanSolved++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    }

    const gained = this.mode.scored
      ? scoreProblem({
          level: this.level,
          elapsedMs: elapsed,
          parMs: (this.problem.parSeconds ?? 12) * 1000,
          clean,
          streak: this.streak,
        })
      : 0;
    this.points += gained;

    this.#logAttempt(clean, elapsed);

    // Escalate difficulty in Survival: staying alive should get harder.
    if (this.mode.escalateEvery && this.cleanSolved > 0 &&
        this.cleanSolved % this.mode.escalateEvery === 0) {
      const next = Math.min(this.level + 1, this.skill.levels.length - 1);
      if (next !== this.level) {
        this.level = next;
        this.onEvent({ type: 'levelUp', level: next, name: this.skill.levels[next].name });
      }
    }

    this.onEvent({ type: 'correct', gained, clean, streak: this.streak });
    this.#checkEnd();
    return { status: 'correct', gained, advance: true };
  }

  #wrong() {
    this.attempts++;
    this.misses++;
    this.streak = 0;

    // Every wrong attempt is logged, not just the first: the teacher view's
    // tag analysis wants each swing, not one row per problem.
    this.#logAttempt(false, performance.now() - this.startedAt);

    if (this.attempts === 1 && this.mode.allowRetryQueue) {
      // Come back to this one in a few questions -- spacing beats repetition.
      this.retryQueue.push({ problem: this.problem, dueAt: this.served + 3 });
    }

    this.onEvent({ type: 'wrong' });
    this.#checkEnd();

    // Always another go: in Practice there is no penalty, and in a Time Trial
    // the penalty is the seconds it costs.
    return { status: 'wrong' };
  }

  /** One row per problem answered -- shipped to the server at run end. */
  #logAttempt(correct, ms) {
    this.log.push({
      prompt: this.problem.text ?? '',
      expected: String(this.problem.answer.value),
      correct,
      ms: Math.round(ms),
    });
  }

  tick() {
    if (this.over || !this.timed) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this.onEvent({ type: 'tick', timeLeft: this.timeLeft });
    if (this.timeLeft <= 0) this.end('time');
  }

  #checkEnd() {
    if (this.over) return;
    // Hitting the target ends the run there and then -- reaching the goal
    // should feel like winning, not like the clock merely stopping.
    if (this.target && this.solved >= this.target) this.end('target');
  }

  end(reason = 'quit') {
    if (this.over) return;
    this.over = true;
    this.endReason = reason;
    this.onEvent({ type: 'end', reason, summary: this.summary() });
  }

  summary() {
    const attempted = Math.max(this.answered, 1);
    const passed = this.target ? this.solved >= this.target : false;
    const avgMs = this.log.length
      ? this.log.reduce((a, e) => a + e.ms, 0) / this.log.length
      : 0;

    return {
      solved: this.solved,
      cleanSolved: this.cleanSolved,
      answered: this.answered,
      misses: this.misses,
      accuracy: this.cleanSolved / attempted,
      bestStreak: this.bestStreak,
      points: this.points,
      avgSeconds: avgMs / 1000,
      passed,
      target: this.target,
      timeLeft: Number.isFinite(this.timeLeft) ? this.timeLeft : null,
      endReason: this.endReason,
    };
  }
}
