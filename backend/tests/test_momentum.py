"""
Momentum score calculation tests — pure unit tests, no DB needed.
"""
from app.services.momentum_service import calculate_momentum


def test_momentum_score_calculation():
    score = calculate_momentum(
        focus_time_secs=3600,  # 1 hour
        tasks_done=5,
        total_tasks=5,
        drift_count=0,
        outcome_filled=True,
        unique_domains=2,
    )
    assert score > 80, f"Expected >80 for perfect session, got {score}"


def test_drift_reduces_score():
    score_no_drift = calculate_momentum(
        focus_time_secs=1800, tasks_done=3, total_tasks=5,
        drift_count=0, outcome_filled=True, unique_domains=3,
    )
    score_with_drift = calculate_momentum(
        focus_time_secs=1800, tasks_done=3, total_tasks=5,
        drift_count=4, outcome_filled=True, unique_domains=3,
    )
    assert score_with_drift < score_no_drift, "Drift should reduce score"


def test_completed_tasks_increase_score():
    score_no_tasks = calculate_momentum(
        focus_time_secs=1800, tasks_done=0, total_tasks=5,
        drift_count=0, outcome_filled=False, unique_domains=3,
    )
    score_all_tasks = calculate_momentum(
        focus_time_secs=1800, tasks_done=5, total_tasks=5,
        drift_count=0, outcome_filled=False, unique_domains=3,
    )
    assert score_all_tasks > score_no_tasks, "Completing tasks should increase score"


def test_score_clamped_between_0_and_100():
    score_min = calculate_momentum(
        focus_time_secs=0, tasks_done=0, total_tasks=0,
        drift_count=100, outcome_filled=False, unique_domains=50,
    )
    assert 0 <= score_min <= 100, f"Score {score_min} out of range"

    score_max = calculate_momentum(
        focus_time_secs=7200, tasks_done=100, total_tasks=100,
        drift_count=0, outcome_filled=True, unique_domains=0,
    )
    assert 0 <= score_max <= 100, f"Score {score_max} out of range"


def test_focus_time_bonus():
    score_short = calculate_momentum(
        focus_time_secs=600, tasks_done=0, total_tasks=0,
        drift_count=0, outcome_filled=False, unique_domains=5,
    )
    score_long = calculate_momentum(
        focus_time_secs=7200, tasks_done=0, total_tasks=0,
        drift_count=0, outcome_filled=False, unique_domains=5,
    )
    assert score_long > score_short, "Longer focus should give higher score"


def test_outcome_bonus():
    score_no_outcome = calculate_momentum(
        focus_time_secs=1800, tasks_done=2, total_tasks=4,
        drift_count=1, outcome_filled=False, unique_domains=3,
    )
    score_with_outcome = calculate_momentum(
        focus_time_secs=1800, tasks_done=2, total_tasks=4,
        drift_count=1, outcome_filled=True, unique_domains=3,
    )
    assert score_with_outcome == score_no_outcome + 10, "Outcome should add exactly 10 points"
