import hashlib
import json


def finding_key(finding) -> str:
    evidence = dict(finding.evidence or {})
    evidence.pop("affected_instances", None)
    value = json.dumps({
        "scanner": finding.scanner_name, "title": finding.title,
        "severity": finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity),
        "evidence": evidence,
    }, sort_keys=True, default=str)
    return hashlib.sha256(value.encode()).hexdigest()


def compare_scans(current, previous) -> dict:
    current_map = {finding_key(item): item for item in current.findings}
    previous_map = {finding_key(item): item for item in previous.findings}
    new_keys = current_map.keys() - previous_map.keys()
    fixed_keys = previous_map.keys() - current_map.keys()
    unchanged_keys = current_map.keys() & previous_map.keys()

    def compact(item):
        return {"scanner_name": item.scanner_name, "title": item.title,
                "severity": item.severity.value if hasattr(item.severity, "value") else str(item.severity),
                "evidence": item.evidence}

    current_score = current.overall_score
    previous_score = previous.overall_score
    score_delta = round(current_score - previous_score, 2) if current_score is not None and previous_score is not None else None
    return {
        "previous_scan_id": str(previous.id),
        "new_findings": [compact(current_map[key]) for key in sorted(new_keys)],
        "fixed_findings": [compact(previous_map[key]) for key in sorted(fixed_keys)],
        "unchanged_findings": [compact(current_map[key]) for key in sorted(unchanged_keys)],
        "score_delta": score_delta,
        "regression_detected": bool(new_keys or (score_delta is not None and score_delta < 0)),
    }


def compare_finding_lists(current_findings, previous_findings, current_score, previous_score, previous_id) -> dict:
    current_map = {finding_key(item): item for item in current_findings}
    previous_map = {finding_key(item): item for item in previous_findings}
    new_keys = current_map.keys() - previous_map.keys()
    fixed_keys = previous_map.keys() - current_map.keys()
    unchanged_keys = current_map.keys() & previous_map.keys()

    def compact(item):
        return {"scanner_name": item.scanner_name, "title": item.title,
                "severity": item.severity.value if hasattr(item.severity, "value") else str(item.severity),
                "evidence": item.evidence}

    score_delta = round(current_score - previous_score, 2) if current_score is not None and previous_score is not None else None
    return {
        "previous_scan_id": str(previous_id),
        "new_findings": [compact(current_map[key]) for key in sorted(new_keys)],
        "fixed_findings": [compact(previous_map[key]) for key in sorted(fixed_keys)],
        "unchanged_findings": [compact(current_map[key]) for key in sorted(unchanged_keys)],
        "score_delta": score_delta,
        "regression_detected": bool(new_keys or (score_delta is not None and score_delta < 0)),
    }
