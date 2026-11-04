"""
SmartSeed AI Engine — Geospatial utility functions.

Provides haversine distance calculation and physically-impossible-travel
detection used by the anomaly-detection pipeline.
"""

from __future__ import annotations

import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in **kilometres** between two points.

    Uses the Haversine formula.  Inputs are in decimal degrees.

    Args:
        lat1: Latitude of the first point.
        lon1: Longitude of the first point.
        lat2: Latitude of the second point.
        lon2: Longitude of the second point.

    Returns:
        Distance in kilometres (≥ 0).
    """
    EARTH_RADIUS_KM = 6_371.0

    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def is_physically_impossible(distance_km: float, time_hours: float) -> bool:
    """Return ``True`` when the implied travel speed exceeds 500 km/h.

    This is a simple heuristic: if someone would have to travel faster than
    a commercial airliner to cover the distance in the given time, the trip
    is flagged as physically impossible.

    Args:
        distance_km: Distance between two locations in kilometres.
        time_hours: Elapsed time in hours.

    Returns:
        ``True`` if the speed exceeds the 500 km/h threshold.
    """
    MAX_SPEED_KMH = 500.0

    if time_hours <= 0:
        # Zero or negative elapsed time with any positive distance is impossible.
        return distance_km > 0
    return (distance_km / time_hours) > MAX_SPEED_KMH
