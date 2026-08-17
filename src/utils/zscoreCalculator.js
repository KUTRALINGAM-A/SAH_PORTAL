import { parseEvaluationScores } from '../lib/evaluationHelper.js';

/**
 * Z-Score Normalization for fair judge scoring.
 * 
 * Problem: Different judges have different scoring tendencies.
 * A "harsh" judge might give lower scores to a great team while a "lenient" judge
 * gives high scores to an average team.
 * 
 * Solution: Normalize each judge's scores to z-scores (mean=0, std=1),
 * then aggregate per team.
 * 
 * Note: Negative Z-Scores are completely VALID and expected (indicating a score
 * below that specific judge's average evaluation score). They are preserved.
 */

/**
 * Calculate Z-Score normalized rankings for all teams.
 * 
 * @param {Array} evaluations - Array of {team_id, judge_id, total_raw, remarks, ...} objects
 * @param {Object} expectedJudgesMap - Map of team_id -> expected judges count (typically 2-3)
 * @returns {Array} Ranked teams with z-scores, sorted descending
 */
export function calculateZScoreRankings(evaluations, expectedJudgesMap = {}) {
  if (!evaluations || evaluations.length === 0) return [];

  // Step 1: Deduplicate evaluations per (team_id, judge_id) - keep only the latest evaluation
  const latestEvalsByTeamAndJudge = {};
  evaluations.forEach(ev => {
    const key = `${ev.team_id}_${ev.judge_id}`;
    if (
      !latestEvalsByTeamAndJudge[key] ||
      (ev.created_at && (!latestEvalsByTeamAndJudge[key].created_at || new Date(ev.created_at) > new Date(latestEvalsByTeamAndJudge[key].created_at)))
    ) {
      latestEvalsByTeamAndJudge[key] = ev;
    }
  });
  const dedupedEvals = Object.values(latestEvalsByTeamAndJudge);

  // Step 2: Group scores by judge
  const judgeScores = {};
  dedupedEvals.forEach(ev => {
    const parsed = parseEvaluationScores(ev);
    const rawScore = parsed.total; // Guaranteed 0..50

    if (!judgeScores[ev.judge_id]) {
      judgeScores[ev.judge_id] = [];
    }
    judgeScores[ev.judge_id].push({
      team_id: ev.team_id,
      raw_score: rawScore
    });
  });

  // Step 3: Calculate mean and std for each judge
  const judgeStats = {};
  for (const [judgeId, scores] of Object.entries(judgeScores)) {
    const n = scores.length;
    if (n < 2) {
      // With fewer than 2 evaluations, standard deviation cannot be computed: use mean with std=1 (Z=0)
      judgeStats[judgeId] = { mean: scores[0].raw_score, std: 1 };
      continue;
    }
    const mean = scores.reduce((s, e) => s + e.raw_score, 0) / n;
    const variance = scores.reduce((s, e) => s + Math.pow(e.raw_score - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance) || 1; // Avoid division by zero
    judgeStats[judgeId] = { mean, std };
  }

  // Step 4: Normalize each evaluation to z-score (preserving both positive and negative z-scores)
  const zScoresByTeam = {};
  dedupedEvals.forEach(ev => {
    const parsed = parseEvaluationScores(ev);
    const rawScore = parsed.total;
    const { mean, std } = judgeStats[ev.judge_id];
    // Z-Score formula: (X - mu) / sigma
    const zScore = std > 0 ? (rawScore - mean) / std : 0;

    if (!zScoresByTeam[ev.team_id]) {
      zScoresByTeam[ev.team_id] = {
        team_id: ev.team_id,
        z_scores: [],
        raw_scores: [],
        judge_ids: new Set()
      };
    }

    zScoresByTeam[ev.team_id].z_scores.push(zScore);
    zScoresByTeam[ev.team_id].raw_scores.push(rawScore);
    zScoresByTeam[ev.team_id].judge_ids.add(ev.judge_id);
  });

  // Step 5: Aggregate z-scores per team (average z-score)
  const rankings = Object.values(zScoresByTeam).map(team => {
    const avgZScore = team.z_scores.reduce((s, z) => s + z, 0) / team.z_scores.length;
    const avgRawScore = team.raw_scores.reduce((s, r) => s + r, 0) / team.raw_scores.length;
    const expectedJudges = expectedJudgesMap[team.team_id] || 3;
    
    // Total unique panel judges who evaluated this team, capped at expectedJudges
    const completedJudgesCount = Math.min(team.judge_ids.size, expectedJudges);

    return {
      team_id: team.team_id,
      avg_z_score: Math.round(avgZScore * 1000) / 1000,
      avg_raw_score: Math.min(50, Math.round(avgRawScore * 10) / 10),
      judge_count: completedJudgesCount,
      expected_judges: expectedJudges,
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
export function rankingsToCSV(rankings, teamMap = {}) {
  const headers = 'Rank,Team Name,PS Code,Avg Z-Score,Avg Raw Score (out of 50),Evaluations Completed,Total Expected Judges,Evaluation Progress,Status';
  const rows = rankings.map(r => {
    const team = teamMap[r.team_id] || {};
    const teamName = team.team_name || (typeof team === 'string' ? team : r.team_id);
    const psCode = team.problem_statements?.ps_code || team.ps_code || '';
    const expJudges = r.expected_judges || 3;
    const progress = `${r.judge_count}/${expJudges}`;
    const status = r.is_shortlisted ? 'Shortlisted' : (r.judge_count >= expJudges ? 'Evaluated' : (r.judge_count > 0 ? 'In Progress' : 'Pending'));

    return `${r.rank},"${teamName}","${psCode}",${r.avg_z_score},"${r.avg_raw_score}/50",${r.judge_count},${expJudges},"${progress}","${status}"`;
  });
  return [headers, ...rows].join('\n');
}
