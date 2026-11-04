"""
SmartSeed AI Engine — Mathematical utility helpers.

Small, pure-Python functions used throughout the scoring and normalisation
pipeline.
"""

from __future__ import annotations

import math


def sigmoid(x: float) -> float:
    """Standard logistic sigmoid σ(x) = 1 / (1 + e^{-x}).

    Numerically stable for large positive *and* negative values.

    Args:
        x: Input value.

    Returns:
        A float in the range (0, 1).
    """
    # Prevent overflow for very negative x
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    exp_x = math.exp(x)
    return exp_x / (1.0 + exp_x)


def min_max_normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalise *value* to the **[0, 1]** range using min–max scaling.

    The result is clamped so it never exceeds the [0, 1] bounds.

    Args:
        value: The raw value to normalise.
        min_val: The minimum of the expected range.
        max_val: The maximum of the expected range.

    Returns:
        A float clamped to [0.0, 1.0].  Returns 0.0 when *min_val* == *max_val*.
    """
    if max_val == min_val:
        return 0.0
    normalized = (value - min_val) / (max_val - min_val)
    return max(0.0, min(1.0, normalized))


def weighted_average(values_weights: list[tuple[float, float]]) -> float:
    """Compute a weighted arithmetic mean.

    Args:
        values_weights: A list of ``(value, weight)`` tuples.

    Returns:
        The weighted average, or ``0.0`` when the total weight is zero or the
        list is empty.
    """
    if not values_weights:
        return 0.0
    total_weight = sum(w for _, w in values_weights)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in values_weights) / total_weight
