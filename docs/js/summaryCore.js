function normalizeEvents(rawEvents) {
  return rawEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    durationMinutes: event.durationMinutes,
    isAllDay: event.isAllDay,
    raw: event.raw,
  }));
}

function suggestAchievements(events) {
  const keywords = ["exam", "deadline", "presentation", "meeting", "interview", "project", "lab", "assignment"];
  return events.filter(ev => {
    return ev.durationMinutes >= 60 || keywords.some(k => (ev.title || '').toLowerCase().includes(k));
  }).map(ev => ev.id);
}

function calculateWeeklyStats(events) {
  const totals = {};
  const counts = {};
  let achievements = 0;
  let suggested = 0;

  events.forEach(ev => {
    const cats = ev.tags && ev.tags.length ? ev.tags : ['Other'];
    cats.forEach(cat => {
      if (!totals[cat]) {
        totals[cat] = 0;
        counts[cat] = 0;
      }
      totals[cat] += ev.durationMinutes;
      counts[cat] += 1;
    });
    if (ev.isAchievement) achievements++;
    if (ev.isSuggestedAchievement) suggested++;
  });

  const hours = {};
  for (const cat in totals) {
    hours[cat] = totals[cat] / 60;
  }

  const hasRest = events.some(ev => ev.tags && ev.tags.includes('Rest / Self-care'));
  const hasHealth = events.some(ev => ev.tags && ev.tags.includes('Health / Movement'));
  const lateNightEvents = events.filter(ev => ev.start.getHours() >= 22).length;

  const metrics = {
    lateNightEvents,
    noRest: !hasRest,
    noHealth: !hasHealth,
  };

  return {
    totals,
    hours,
    counts,
    achievements,
    suggested,
    metrics,
  };
}

function buildLlmPayload(events, stats) {
  const sorted = [...events].sort((a,b) => a.start - b.start);
  const weekRange = {
    start: sorted.length ? sorted[0].start.toISOString().split('T')[0] : '',
    end: sorted.length ? sorted[sorted.length - 1].end.toISOString().split('T')[0] : '',
  };
  const eventSummaries = events.map(ev => ({
    title: ev.title,
    categories: ev.tags && ev.tags.length ? ev.tags : ['Other'],
    durationMinutes: ev.durationMinutes,
    isAchievement: ev.isAchievement || false,
    isSuggestedAchievement: ev.isSuggestedAchievement || false,
    notes: ev.notes || '',
  }));
  return {
    week: weekRange,
    events: eventSummaries,
    stats,
  };
}

export { normalizeEvents, suggestAchievements, calculateWeeklyStats, buildLlmPayload };
