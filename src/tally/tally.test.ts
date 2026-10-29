import { describe, it, expect } from 'vitest';
import { calculateQuorum, type QuorumDecision } from './tally.js';
import type { SeatReviewResult, Finding } from '../tribunal/types.js';

describe('calculateQuorum', () => {
  const cleanSeat = (id: 'seat-a' | 'seat-b' | 'seat-c', name: string): SeatReviewResult => ({
    seatId: id,
    seatName: name,
    vote: 'APPROVE',
    summary: 'Looks good',
    findings: [],
  });

  const seatWithBlocker = (
    id: 'seat-a' | 'seat-b' | 'seat-c',
    name: string,
    file = 'src/app.ts',
    line = 20
  ): SeatReviewResult => ({
    seatId: id,
    seatName: name,
    vote: 'REQUEST_CHANGES',
    summary: 'Found critical defect',
    findings: [
      {
        file,
        line,
        severity: 'BLOCKER',
        category: 'correctness',
        title: 'Unhandled error in critical path',
        explanation: 'State can be corrupted when database is unreachable.',
      },
    ],
  });

  const seatWithWarning = (
    id: 'seat-a' | 'seat-b' | 'seat-c',
    name: string
  ): SeatReviewResult => ({
    seatId: id,
    seatName: name,
    vote: 'APPROVE',
    summary: 'Passable with suggestions',
    findings: [
      {
        file: 'src/app.ts',
        line: 45,
        severity: 'WARNING',
        category: 'simplicity',
        title: 'Variable could be const',
        explanation: 'Consider using const instead of let.',
      },
    ],
  });

  it('approves when all 3 seats approve with zero blockers (3-0)', () => {
    const seats = [
      cleanSeat('seat-a', 'Seat A'),
      cleanSeat('seat-b', 'Seat B'),
      cleanSeat('seat-c', 'Seat C'),
    ];

    const decision = calculateQuorum(seats);

    expect(decision.verdict).toBe('APPROVE');
    expect(decision.approveVotes).toBe(3);
    expect(decision.requestChangesVotes).toBe(0);
    expect(decision.blockers).toHaveLength(0);
    expect(decision.summary).toContain('Unanimous approval (3-0)');
  });

  it('approves when 2 seats approve and zero blockers exist (2-0-0)', () => {
    const seats = [
      cleanSeat('seat-a', 'Seat A'),
      seatWithWarning('seat-b', 'Seat B'),
      cleanSeat('seat-c', 'Seat C'),
    ];

    const decision = calculateQuorum(seats);

    expect(decision.verdict).toBe('APPROVE');
    expect(decision.approveVotes).toBe(3);
    expect(decision.requestChangesVotes).toBe(0);
    expect(decision.blockers).toHaveLength(0);
  });

  it('rejects with REQUEST_CHANGES if exactly ONE seat has a blocker (Asymmetric Quorum)', () => {
    const seats = [
      seatWithBlocker('seat-a', 'Seat A'), // 1 blocker
      cleanSeat('seat-b', 'Seat B'),
      cleanSeat('seat-c', 'Seat C'),
    ];

    const decision = calculateQuorum(seats);

    expect(decision.verdict).toBe('REQUEST_CHANGES');
    expect(decision.approveVotes).toBe(2);
    expect(decision.requestChangesVotes).toBe(1);
    expect(decision.blockers).toHaveLength(1);
    expect(decision.summary).toContain('Asymmetric Quorum: 1 seat(s) raised blocking findings');
  });

  it('rejects with REQUEST_CHANGES if multiple seats have blockers', () => {
    const seats = [
      seatWithBlocker('seat-a', 'Seat A', 'src/auth.ts', 10),
      seatWithBlocker('seat-b', 'Seat B', 'src/db.ts', 25),
      cleanSeat('seat-c', 'Seat C'),
    ];

    const decision = calculateQuorum(seats);

    expect(decision.verdict).toBe('REQUEST_CHANGES');
    expect(decision.approveVotes).toBe(1);
    expect(decision.requestChangesVotes).toBe(2);
    expect(decision.blockers).toHaveLength(2);
  });

  it('deduplicates identical blockers across different seats on the same file and line', () => {
    const seats = [
      seatWithBlocker('seat-a', 'Seat A', 'src/app.ts', 20),
      seatWithBlocker('seat-b', 'Seat B', 'src/app.ts', 20),
      cleanSeat('seat-c', 'Seat C'),
    ];

    const decision = calculateQuorum(seats);

    expect(decision.verdict).toBe('REQUEST_CHANGES');
    expect(decision.blockers).toHaveLength(1); // Deduplicated
  });
});
