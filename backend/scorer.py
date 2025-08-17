def score_event(ev) -> float:
    """
    Cheap initial scoring. You can swap this for an ML model later.
    """
    s = 0.0
    if ev.get("label", "").lower().startswith("radar spike"):
        s += 0.6
        s += min(0.4, float(ev.get("metric", 0)) / 100.0)
    if ev.get("src_ip"):
        s += 0.5
    return max(0.0, min(1.0, s))
