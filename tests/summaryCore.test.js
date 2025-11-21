import { describe, it, expect } from 'vitest';
import {
  normalizeEvents,
  suggestAchievements,
  calculateWeeklyStats,
  buildLlmPayload,
} from '../docs/js/summaryCore.js';

// Adjust these tests if your summaryCore.js uses slightly different
// property names or shapes – this is a good baseline.

describe('suggestAchievements', () => {
  it('suggests events based on duration or keywords', () => {
    const events = [
      { id: '1', title: 'Regular meeting', durationMinutes: 90 },
      { id: '2', title: 'Exam review', durationMinutes: 30 },
      { id: '3', title: 'Quick chat', durationMinutes: 10 },
    ];

    const suggested = suggestAchievements(events);
    const asArray = Array.isArray(suggested) ? suggested : Array.from(suggested);

    expect(asArray).toContain('1'); // long event
    expect(asArray).toContain('2'); // keyword-based
    expect(asArray).not.toContain('3');
  });
});

describe('calculateWeeklyStats', () => {
  it('computes minutes and counts per category and achievement totals', () => {
    const eventsWithTags = [
      {
        id: '1',
        durationMinutes: 60,
        tags: ['Work'],
        isAchievement: true,
        isSuggestedAchievement: false,
      },
      {
        id: '2',
        durationMinutes: 30,
        tags: ['Health / Movement'],
        isAchievement: false,
        isSuggestedAchievement: true,
      },
      {
        id: '3',
        durationMinutes: 15,
        tags: ['Work', 'Admin / Errands'],
        isAchievement: false,
        isSuggestedAchievement: false,
      },
    ];

    const stats = calculateWeeklyStats(eventsWithTags);

    // These property names might differ slightly in your implementation:
    // adjust so tests match reality.
    expect(stats.totalMinutesByCategory['Work']).toBe(75);
    expect(stats.totalMinutesByCategory['Health / Movement']).toBe(30);
    expect(stats.totalMinutesByCategory['Admin / Errands']).toBe(15);

    expect(stats.eventCountsByCategory['Work']).toBe(2);
    expect(stats.eventCountsByCategory['Health / Movement']).toBe(1);
    expect(stats.eventCountsByCategory['Admin / Errands']).toBe(1);

    expect(stats.totalAchievements).toBe(1);
    expect(stats.totalSuggestedAchievements).toBe(1);
  });
});

describe('buildLlmPayload', () => {
  it('builds a payload with week, events and stats', () => {
    const eventsWithTags = [
      {
        id: '1',
        title: 'Run',
        durationMinutes: 30,
        tags: ['Health / Movement'],
        isAchievement: true,
        isSuggestedAchievement: false,
        notes: 'Felt great',
      },
    ];

    const stats = {
      weekStart: new Date('2025-01-06'),
      weekEnd: new Date('2025-01-12'),
      totalMinutesByCategory: { 'Health / Movement': 30 },
      eventCountsByCategory: { 'Health / Movement': 1 },
      totalAchievements: 1,
      totalSuggestedAchievements: 0,
      flags: { noRestEvents: false },
    };

    const payload = buildLlmPayload(eventsWithTags, stats);

    expect(payload.weekRange).toBeDefined();
    expect(payload.weekRange.start).toBeDefined();
    expect(payload.weekRange.end).toBeDefined();

    expect(Array.isArray(payload.events)).toBe(true);
    expect(payload.events[0].title).toBe('Run');
    expect(payload.events[0].categories).toContain('Health / Movement');
    expect(payload.events[0].isAchievement).toBe(true);

    expect(payload.stats).toBeDefined();
    expect(payload.stats.totalMinutesByCategory['Health / Movement']).toBe(30);
    expect(payload.flags).toBeDefined();
  });
});
