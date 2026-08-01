from collections import defaultdict

from app.models.scan import Finding, Severity

PENALTIES = {Severity.critical: 40, Severity.high: 25, Severity.medium: 14, Severity.low: 6, Severity.info: 1}
FAILURE_PENALTY = 10


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
        overall = max(0.0, 100.0 - FAILURE_PENALTY * failed_scanners)
        return {"benchmark": "strict-v1", "formula": "min(global_score, category_mean) - scanner_failure_penalties",
                "severity_penalties": {severity.value: value for severity, value in PENALTIES.items()},
                "category_scores": category_scores, "global_score": round(overall, 2),
                "coverage_score": round(overall, 2), "overall_score": round(overall, 2),
                "failed_scanners": failed_scanners}
    category_scores = {category: round(max(0.0, 100.0 - penalty), 2)
                       for category, penalty in sorted(by_category.items())}
    global_score = max(0.0, 100.0 - sum(by_category.values()))
    coverage_score = max(0.0, global_score - FAILURE_PENALTY * failed_scanners)
    category_mean = sum(category_scores.values()) / len(category_scores)
    overall = round(min(global_score, category_mean, coverage_score), 2)
    return {"benchmark": "strict-v1", "formula": "min(global_score, category_mean, coverage_score)",
            "severity_penalties": {severity.value: value for severity, value in PENALTIES.items()},
            "category_scores": category_scores, "global_score": round(global_score, 2),
            "coverage_score": round(coverage_score, 2), "overall_score": overall,
            "failed_scanners": failed_scanners}


def calculate_score(findings: list[Finding], categories: set[str] | None = None) -> float:
    return score_breakdown(findings, categories)["overall_score"]
