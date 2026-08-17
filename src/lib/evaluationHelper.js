/**
 * Evaluation Helper utilities for SAH 2026 6-parameter rubric.
 * Seamlessly manages 6-parameter breakdown & compatibility with database columns.
 */

export function prepareEvaluationPayload({
  teamId,
  judgeId,
  understanding,
  innovation,
  technical,
  prototype,
  impact,
  presentation,
  remarks
}) {
  const rubric = {
    understanding: Number(understanding) || 0,
    innovation: Number(innovation) || 0,
    technical: Number(technical) || 0,
    prototype: Number(prototype) || 0,
    impact: Number(impact) || 0,
    presentation: Number(presentation) || 0
  };

  const total =
    rubric.understanding +
    rubric.innovation +
    rubric.technical +
    rubric.prototype +
    rubric.impact +
    rubric.presentation;

  const remarksPayload = JSON.stringify({
    note: remarks?.trim() || '',
    rubric,
    total
  });

  return {
    team_id: teamId,
    judge_id: judgeId,
    understanding_score: rubric.understanding,
    execution_score: rubric.technical + rubric.prototype,
    impact_score: rubric.impact,
    pitch_score: rubric.presentation + rubric.innovation,
    remarks: remarksPayload
  };
}

export function parseEvaluationScores(ev) {
  if (!ev) {
    return {
      rubric: {
        understanding: 0,
        innovation: 0,
        technical: 0,
        prototype: 0,
        impact: 0,
        presentation: 0
      },
      total: 0,
      remarks: ''
    };
  }

  let rubric = {
    understanding: 0,
    innovation: 0,
    technical: 0,
    prototype: 0,
    impact: 0,
    presentation: 0
  };

  let cleanRemarks = '';
  let hasParsedRubric = false;

  if (ev.remarks) {
    try {
      const parsed = JSON.parse(ev.remarks);
      if (parsed && typeof parsed === 'object') {
        if (parsed.rubric) {
          rubric = {
            understanding: Number(parsed.rubric.understanding) || 0,
            innovation: Number(parsed.rubric.innovation) || 0,
            technical: Number(parsed.rubric.technical) || 0,
            prototype: Number(parsed.rubric.prototype) || 0,
            impact: Number(parsed.rubric.impact) || 0,
            presentation: Number(parsed.rubric.presentation) || 0
          };
          hasParsedRubric = true;
        }
        cleanRemarks = parsed.note || '';
      } else {
        cleanRemarks = String(ev.remarks);
      }
    } catch {
      cleanRemarks = ev.remarks;
    }
  }

  // If explicit direct columns are present
  if (ev.innovation_score !== undefined && ev.innovation_score !== null) {
    rubric.innovation = Number(ev.innovation_score);
    hasParsedRubric = true;
  }
  if (ev.technical_score !== undefined && ev.technical_score !== null) {
    rubric.technical = Number(ev.technical_score);
    hasParsedRubric = true;
  }
  if (ev.prototype_score !== undefined && ev.prototype_score !== null) {
    rubric.prototype = Number(ev.prototype_score);
    hasParsedRubric = true;
  }
  if (ev.presentation_score !== undefined && ev.presentation_score !== null) {
    rubric.presentation = Number(ev.presentation_score);
    hasParsedRubric = true;
  }

  let total = 0;

  if (hasParsedRubric) {
    // If the 6-parameter rubric exists, total is strictly the sum of the 6 parameters (Max 50)
    if (ev.understanding_score !== undefined && ev.understanding_score !== null && rubric.understanding === 0) {
      rubric.understanding = Math.min(5, Number(ev.understanding_score) || 0);
    }
    if (ev.impact_score !== undefined && ev.impact_score !== null && rubric.impact === 0) {
      rubric.impact = Math.min(5, Number(ev.impact_score) || 0);
    }
    total = Math.min(50, Math.max(0,
      rubric.understanding +
      rubric.innovation +
      rubric.technical +
      rubric.prototype +
      rubric.impact +
      rubric.presentation
    ));
  } else {
    // Legacy 100-point row (e.g. total_raw = 59 out of 100)
    // Scale legacy 100-point score to 50-mark scale: (raw / 100) * 50 = raw / 2 (or if total_raw <= 50, use total_raw)
    const raw = Number(ev.total_raw) || (
      (Number(ev.understanding_score) || 0) +
      (Number(ev.execution_score) || 0) +
      (Number(ev.impact_score) || 0) +
      (Number(ev.pitch_score) || 0)
    );
    
    if (raw > 50) {
      total = Math.min(50, Math.round((raw / 100) * 50 * 10) / 10);
    } else {
      total = Math.min(50, raw);
    }

    rubric = {
      understanding: Math.min(5, Number(ev.understanding_score) || 0),
      innovation: 0,
      technical: 0,
      prototype: Math.min(15, Number(ev.execution_score) || 0),
      impact: Math.min(5, Number(ev.impact_score) || 0),
      presentation: Math.min(5, Number(ev.pitch_score) || 0)
    };
  }

  return {
    rubric,
    total,
    remarks: cleanRemarks
  };
}
