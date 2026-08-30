from collections import defaultdict
from math import exp

from app.models.scan import Finding, Severity

PENALTIES = {Severity.critical: 40, Severity.high: 25, Severity.medium: 14, Severity.low: 6, Severity.info: 1}
FAILURE_PENALTY = 10
MINIMUM_SCORE = 1.0
PENALTY_HALF_LIFE = 100.0


def score_breakdown(findings: list[Finding], categories: set[str] | None = None,
                   failed_scanners: int = 0) -> dict:
    by_category = defaultdict(float)
    for finding in findings:
        by_category[finding.category] += PENALTIES[finding.severity] * finding.confidence
    if categories:
        for category in categories:
            by_category.setdefault(category, 0.0)
    if not by_category:
        category_scores = {category: 100.0 for category in sorted(categories or set())}
        coverage_score = max(MINIMUM_SCORE, 100.0 - FAILURE_PENALTY * failed_scanners)
        return {"benchmark": "strict-v1", "formula": "min(category_mean, coverage_score)",
                "severity_penalties": {severity.value: value for severity, value in PENALTIES.items()},
                "minimum_score": MINIMUM_SCORE,
                "category_scores": category_scores, "global_score": 100.0,
                "coverage_score": round(coverage_score, 2), "overall_score": round(coverage_score, 2),
                "failed_scanners": failed_scanners}
    category_scores = {
        category: round(100.0 * exp(-penalty / PENALTY_HALF_LIFE), 2)
        for category, penalty in sorted(by_category.items())
    }
    category_mean = sum(category_scores.values()) / len(category_scores)
    coverage_score = max(MINIMUM_SCORE, 100.0 - FAILURE_PENALTY * failed_scanners)
    overall = round(min(category_mean, coverage_score), 2)
    return {"benchmark": "strict-v1", "formula": "min(exponential_category_mean, coverage_score)",
            "severity_penalties": {severity.value: value for severity, value in PENALTIES.items()},
            "minimum_score": MINIMUM_SCORE,
            "penalty_half_life": PENALTY_HALF_LIFE,
            "category_penalties": {category: round(penalty, 2)
                                    for category, penalty in sorted(by_category.items())},
            "category_scores": category_scores, "global_score": round(category_mean, 2),
            "coverage_score": round(coverage_score, 2), "overall_score": overall,
            "failed_scanners": failed_scanners}


def calculate_score(findings: list[Finding], categories: set[str] | None = None) -> float:
    return score_breakdown(findings, categories)["overall_score"]
