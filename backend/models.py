from datetime import datetime, timezone

from .extensions import db


class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    opportunities = db.relationship(
        "Opportunity",
        backref="admin",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_session_payload(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
        }


class Opportunity(db.Model):
    __tablename__ = "opportunities"

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.String(120), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills = db.Column(db.JSON, nullable=False, default=list)
    category = db.Column(db.String(100), nullable=False)
    future_opportunities = db.Column(db.Text, nullable=False)
    max_applicants = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "duration": self.duration,
            "start_date": self.start_date.isoformat(),
            "description": self.description,
            "skills": self.skills or [],
            "category": self.category,
            "future_opportunities": self.future_opportunities,
            "max_applicants": self.max_applicants,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
