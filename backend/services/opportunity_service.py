from datetime import datetime


def validate_opportunity_payload(data):
    name = (data.get("name") or "").strip()
    duration = (data.get("duration") or "").strip()
    start_date_raw = (data.get("start_date") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip()
    future_opportunities = (data.get("future_opportunities") or "").strip()
    max_applicants_raw = data.get("max_applicants")
    skills_value = data.get("skills") or []

    if isinstance(skills_value, str):
        skills = [item.strip() for item in skills_value.split(",") if item.strip()]
    else:
        skills = [str(item).strip() for item in skills_value if str(item).strip()]

    if not name:
        return None, "Opportunity name is required"
    if not duration:
        return None, "Duration is required"
    if not start_date_raw:
        return None, "Start date is required"
    if not description:
        return None, "Description is required"
    if not skills:
        return None, "At least one skill is required"
    if not category:
        return None, "Category is required"
    if not future_opportunities:
        return None, "Future opportunities are required"

    try:
        start_date = datetime.strptime(start_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return None, "Start date must be in YYYY-MM-DD format"

    max_applicants = None
    if max_applicants_raw not in (None, ""):
        try:
            max_applicants = int(max_applicants_raw)
        except (TypeError, ValueError):
            return None, "Maximum applicants must be a number"
        if max_applicants < 0:
            return None, "Maximum applicants cannot be negative"

    return {
        "name": name,
        "duration": duration,
        "start_date": start_date,
        "description": description,
        "skills": skills,
        "category": category,
        "future_opportunities": future_opportunities,
        "max_applicants": max_applicants,
    }, None
