import { describe, it, expect } from 'vitest';
import { calculateWeeklyStats, suggestAchievements, buildLlmPayload } from '../docs/js/summaryCore.js';

// Tests for suggestAchievements function
describe('suggestAchievements', () => {
  it('suggests events based on duration and keywords', () => {
    const events = [
      { id: '1', title: 'Project meeting', durationMinutes: 90 },
      { id: '2', title: 'Exam review', durationMinutes: 30 },
      { id: '3', title: 'Chat', durationMinutes: 45 },
    ];
    const suggestions = suggestAchievements(events);
    // suggestions may be returned as a Set or array
    if (Array.isArray(suggestions)) {
      expect(suggestions.includes('1')).toBe(true);
      expect(suggestions.includes('2')).toBe(true);
      expect(suggestions.includes('3')).toBe(false);
    } else {
      expect(suggestions.has('1')).toBe(true);
      expect(suggestions.has('2')).toBe(true);
      expect(suggestions.has('3')).toBe(false);
    }
  });
});

// Tests for calculateWeeklyStats function
describe('calculateWeeklyStats', () => {
  it('calculates correct category totals and counts', () => {
    const events = [
      {
        id: '1',
        durationMinutes: 120,
        tags: ['Work'],
        isAchievement: true,
        isSuggestedAchievement: false,
        start: '2025-11-17T09:00:00',
        end: '2025-11-17T11:00:00',
      },
      {
        id: '2',
        durationMinutes: 60,
        tags: ['Health / Movement'],
        isAchievement: false,
        isSuggestedAchievement: false,
        start: '2025-11-17T18:00:00',
        end: '2025-11-17T19:00:00',
      },
      {
        id: '3',
        durationMinutes: 30,
        tags: ['Work', 'Family'],
        isAchievement: false,
        isSuggestedAchievement: true,
        start: '2025-11-17T21:30:00',
        end: '2025-11-17T22:00:00',
      },
    ];
    const stats = calculateWeeklyStats(events);
    expect(stats.hoursPerCategory['Work']).toBeCloseTo((120 + 30) / 60);
    expect(stats.counts['Work']).toBe(2);
    expect(stats.hoursPerCategory['Health / Movement']).toBeCloseTo(1);
    expect(stats.counts['Family']).toBe(1);
    expect(stats.totalAchievements).toBe(1);
    expect(stats.totalSuggestions).toBe(1);
    // Event 3 ends at 22:00 so counts as a late-night event
    expect(stats.metrics.lateNightCount).toBeGreaterThanOrEqual(1);
    // Should include some missing categories like 'Rest / Self-care'
    expect(stats.metrics.missingCategories).toContain('Rest / Self-care');
  });
});

// Tests for buildLlmPayload function
describe('buildLlmPayload', () => {
  it('builds a payload with week bounds and events', () => {
    const events = [
      {
        id: '1',
        title: 'Team meeting',
        tags: ['Work'],
        durationMinutes: 60,
        isAchievement: true,
        isSuggestedAchievement: false,
        notes: 'Discussed project progress',
        start: '2025-11-17T09:00:00',
        end: '2025-11-17T10:00:00',
      },
    ];
    const stats = {
      hoursPerCategory: { Work: 1 },
      counts: { Work: 1 },
      totalAchievements: 1,
      totalSuggestions: 0,
      metrics: {},
    };
    const payload = buildLlmPayload(events, stats);
    expect(payload.weekStart).toBeDefined();
    expect(payload.weekEnd).toBeDefined();
    expect(Array.isArray(payload.events)).toBe(true);
    expect(payload.events.length).toBe(1);
    const ev = payload.events[0];
    expect(ev.title).toBe('Team meeting');
    expect(ev.categories).toEqual(['Work']);
    expect(ev.durationMinutes).toBe(60);
    expect(ev.isAchievement).toBe(true);
    expect(ev.isSuggestedAchievement).toBe(false);
    expect(payload.stats.totalAchievements).toBe(1);
  });
});
