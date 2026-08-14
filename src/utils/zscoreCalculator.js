/**
 * Z-Score Normalization for fair judge scoring.
 * 
 * Problem: Different judges have different scoring tendencies.
 * A "harsh" judge might give 70/100 to a great team while a "lenient" judge
 * gives 90/100 to an average team.
 * 
 * Solution: Normalize each judge's scores to z-scores (mean=0, std=1),
 * then aggregate per team.
 */

/**
 * Calculate Z-Score normalized rankings for all teams.
 * 
 * @param {Array} evaluations - Array of {team_id, judge_id, total_raw} objects
 * @returns {Array} Ranked teams with z-scores, sorted descending
 */
export function calculateZScoreRankings(evaluations) {
  if (!evaluations || evaluations.length === 0) return [];

  // Group scores by judge
  const judgeScores = {};
  evaluations.forEach(ev => {
    if (!judgeScores[ev.judge_id]) {
      judgeScores[ev.judge_id] = [];
    }
    judgeScores[ev.judge_id].push({
      team_id: ev.team_id,
      raw_score: ev.total_raw
    });
  });

  // Calculate mean and std for each judge
  const judgeStats = {};
  for (const [judgeId, scores] of Object.entries(judgeScores)) {
    const n = scores.length;
    if (n < 2) {
      // Not enough data for z-score, use raw normalization
      judgeStats[judgeId] = { mean: scores[0].raw_score, std: 1 };
      continue;
    }
    const mean = scores.reduce((s, e) => s + e.raw_score, 0) / n;
    const variance = scores.reduce((s, e) => s + Math.pow(e.raw_score - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance) || 1; // Avoid division by zero
    judgeStats[judgeId] = { mean, std };
  }

  // Normalize each evaluation to z-score
  const zScoresByTeam = {};
  evaluations.forEach(ev => {
    const { mean, std } = judgeStats[ev.judge_id];
    const zScore = (ev.total_raw - mean) / std;

    if (!zScoresByTeam[ev.team_id]) {
      zScoresByTeam[ev.team_id] = {
        team_id: ev.team_id,
        z_scores: [],
        raw_scores: [],
        judge_count: 0
      };
    }

    zScoresByTeam[ev.team_id].z_scores.push(zScore);
    zScoresByTeam[ev.team_id].raw_scores.push(ev.total_raw);
    zScoresByTeam[ev.team_id].judge_count++;
  });

  // Aggregate z-scores per team (average z-score)
  const rankings = Object.values(zScoresByTeam).map(team => {
    const avgZScore = team.z_scores.reduce((s, z) => s + z, 0) / team.z_scores.length;
    const avgRawScore = team.raw_scores.reduce((s, r) => s + r, 0) / team.raw_scores.length;

    return {
      team_id: team.team_id,
      avg_z_score: Math.round(avgZScore * 1000) / 1000,
      avg_raw_score: Math.round(avgRawScore * 100) / 100,
      judge_count: team.judge_count,
      z_scores: team.z_scores.map(z => Math.round(z * 1000) / 1000)
    };
  });

  // Sort by average z-score (descending)
  rankings.sort((a, b) => b.avg_z_score - a.avg_z_score);

  // Assign ranks
  rankings.forEach((team, index) => {
    team.rank = index + 1;
  });

  return rankings;
}

/**
 * Get the Top N teams from rankings
 * @param {Array} rankings - Output from calculateZScoreRankings
 * @param {number} n - Number of top teams to select (default: 50)
 * @returns {Array} Top N teams
 */
export function getTopNTeams(rankings, n = 50) {
  return rankings.slice(0, n);
}

/**
 * Export rankings to CSV format string
 */
export function rankingsToCSV(rankings, teamNames = {}) {
  const headers = 'Rank,Team ID,Team Name,Avg Z-Score,Avg Raw Score,Judges Evaluated';
  const rows = rankings.map(r =>
    `${r.rank},"${r.team_id}","${teamNames[r.team_id] || ''}",${r.avg_z_score},${r.avg_raw_score},${r.judge_count}`
  );
  return [headers, ...rows].join('\n');
}
