# CertifyMe Backend Implementation - Interview Guide

---

## 📋 Overview

This document provides a comprehensive breakdown of the Flask backend implementation for the CertifyMe Admin Portal. It covers all backend files, functions, architecture decisions, and expected interview questions.

**Project Type:** Full Stack Intern Assessment  
**Tech Stack:** Flask, Flask-SQLAlchemy, PostgreSQL/SQLite, Python  
**Duration:** 2 Days (Day 1: Auth, Day 2: Opportunities)

---

# 🏗️ BACKEND ARCHITECTURE

## Project Structure

```
backend/
├── __init__.py         → Flask app factory & route registration
├── config.py           → Configuration management
├── extensions.py       → Database extension initialization
├── models.py           → Database models (Admin, Opportunity)
├── routes/
│   ├── __init__.py
│   ├── auth.py         → Authentication endpoints
│   └── opportunities.py → Opportunity CRUD endpoints
├── services/
│   ├── __init__.py
│   ├── auth_service.py → Auth business logic
│   └── opportunity_service.py → Validation logic
└── utils/
    ├── __init__.py
    └── tokens.py       → Password reset token handling
```

---

# 📁 DETAILED FILE BREAKDOWN

## **1. backend/**init**.py** - Application Factory

### Purpose

Creates and configures the Flask application instance using the factory pattern.

### Key Functions

#### `create_app()`

```python
def create_app():
    # Initializes Flask app
    # Sets static folder to serve frontend
    # Initializes SQLAlchemy
    # Creates database tables
    # Registers blueprints (routes)
    return app
```

- **Why factory pattern?** Allows multiple app instances, easier testing, better separation of concerns
- Creates app context for database operations
- Automatically creates tables via `db.create_all()`

#### `register_routes(app)`

```python
def register_routes(app):
    # Registers blueprints for auth and opportunities
    # Sets URL prefixes (/api/auth, /api/opportunities)
    # Serves static frontend files
```

### Interview Questions

**Q1: Why did you use the Flask factory pattern?**

> The factory pattern provides several advantages:
>
> - **Testability**: Can create multiple app instances with different configs
> - **Flexibility**: Can initialize the app with different configurations (dev, test, prod)
> - **Cleaner code**: Separates app creation from configuration
> - **Better for blueprints**: Allows registering blueprints after app creation
>
> For example, I can create separate test instances with SQLite while production uses PostgreSQL.

**Q2: What happens when create_app() is called?**

> - Flask app instance is created with the static folder pointing to `sky/` (frontend)
> - Configuration is loaded from `Config` class
> - SQLAlchemy database extension is initialized
> - Database tables are automatically created using `db.create_all()`
> - Blueprints for auth and opportunities are registered with URL prefixes
> - A health check endpoint is registered

**Q3: Why serve static files from the backend?**

> The frontend (HTML, CSS, JS) is served from the same backend to keep the entire application self-contained. When user visits `http://localhost:5000/`, the backend automatically sends `admin.html`. All API calls go to `/api/*` endpoints.

---

## **2. backend/config.py** - Configuration Management

### Purpose

Centralized configuration for the Flask application.

### Key Code

```python
class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
```

### Features

- **Environment Variables**: Loads from `.env` file via `python-dotenv`
- **Database URL**: Configurable PostgreSQL/SQLite
- **Session Lifetime**: 30 days for "Remember Me" functionality
- **SECRET_KEY**: Used for session encryption and token generation

### Interview Questions

**Q1: Why use environment variables for configuration?**

> Environment variables keep sensitive information (database URL, secret key) out of the codebase. This is a security best practice:
>
> - Never commit `.env` to GitHub
> - Different environments (dev, staging, prod) can have different values
> - Easier to deploy to different servers without code changes

**Q2: What's the difference between PERMANENT_SESSION_LIFETIME and session timeout?**

> - **PERMANENT_SESSION_LIFETIME = 30 days**: When "Remember Me" is checked, the session lasts 30 days
> - **Without "Remember Me"**: Session is temporary and expires when browser closes
> - The `session.permanent = remember_me` line in login controls this behavior

**Q3: Why raise an error if DATABASE_URL is not set?**

> This is a fail-fast approach. If the database URL is not configured, the app shouldn't start. This prevents silent failures where the app runs but can't connect to the database. It forces the developer to properly configure the environment.

---

## **3. backend/extensions.py** - Database Extension

### Purpose

Initializes and exports the SQLAlchemy database extension.

### Code

```python
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
```

### Why Separate File?

Avoids circular imports. `db` is imported in models, routes, and services. If it were defined in `__init__.py`, it would create circular dependency issues.

### Interview Questions

**Q1: Why is the database extension separated into a different file?**

> To avoid circular imports. If I defined `db = SQLAlchemy()` in `__init__.py`:
>
> - `__init__.py` would import models → models import db → creates circular import
> - By defining db in `extensions.py`, all files import from extensions without circular dependency
> - This is a standard Flask best practice pattern

**Q2: How does SQLAlchemy work with Flask?**

> Flask-SQLAlchemy provides:
>
> - Integration with Flask's app context
> - Automatic connection pooling
> - Query interface via `db.session`
> - Model definition through `db.Model` base class
> - Automatic database operations within app context

---

## **4. backend/models.py** - Database Models

### Purpose

Defines the structure of database tables using ORM.

### Model 1: Admin

```python
class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                          default=lambda: datetime.now(timezone.utc))

    opportunities = db.relationship("Opportunity", backref="admin",
                                   cascade="all, delete-orphan", lazy=True)

    def to_session_payload(self):
        return {"id": self.id, "full_name": self.full_name, "email": self.email}
```

**Columns Explained:**

- `email`: UNIQUE + INDEX for fast lookups during login
- `password_hash`: Never store plain passwords (security)
- `created_at`: Auto-generated timestamp in UTC
- `opportunities`: Relationship to Opportunity model (1-to-many)

**Cascade Delete:** If an admin is deleted, all their opportunities are automatically deleted.

### Model 2: Opportunity

```python
class Opportunity(db.Model):
    __tablename__ = "opportunities"

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id"),
                         nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.String(120), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills = db.Column(db.JSON, nullable=False, default=list)
    category = db.Column(db.String(100), nullable=False)
    future_opportunities = db.Column(db.Text, nullable=False)
    max_applicants = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                          default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                          default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "skills": self.skills or [],
            "created_at": self.created_at.isoformat(),
            # ... all fields
        }
```

**Key Design Decisions:**

- `skills` is JSON column to store array of skills
- `admin_id` is indexed for fast filtering by admin
- `to_dict()` method for serializing to JSON responses
- `updated_at` auto-updates on modification

### Interview Questions

**Q1: Why not store plain passwords?**

> Storing plain passwords is a major security vulnerability. If the database is breached, attackers get all passwords. Instead:
>
> - Passwords are hashed using `werkzeug.security.generate_password_hash()`
> - Uses PBKDF2 algorithm with salt
> - To verify: compare hashed input with stored hash using `check_password_hash()`
> - Even if DB is breached, passwords are protected

**Q2: What's the purpose of `admin_id` in Opportunity?**

> It's a foreign key that:
>
> - Links each opportunity to the admin who created it
> - Enables data isolation (each admin only sees their own opportunities)
> - Indexed for fast database queries
> - Enforces referential integrity (can't create opportunity for non-existent admin)

**Q3: Why store skills as JSON instead of separate table?**

> For this simple use case, JSON is sufficient because:
>
> - Skills are not queried independently
> - Avoids complexity of many-to-many relationships
> - Frontend sends skills as comma-separated strings, which are parsed to JSON array
> - Simpler to work with and deploy
> - Trade-off: Can't efficiently query by individual skill (but not needed here)

**Q4: What does `cascade="all, delete-orphan"` do?**

> When an admin is deleted:
>
> - All their opportunities are automatically deleted from the database
> - Prevents orphaned opportunities with no associated admin
> - Alternative: Set admin_id to NULL (but we want full deletion)

**Q5: Why use timezone-aware datetime?**

> - `datetime.now(timezone.utc)` instead of `datetime.now()`
> - Stores all timestamps in UTC
> - Prevents issues with daylight savings and different server timezones
> - When deployed across regions, UTC is the standard

---

## **5. backend/routes/auth.py** - Authentication Endpoints

### Purpose

Handles all authentication-related API endpoints.

### Endpoint 1: POST /api/auth/signup

```python
@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = normalize_email(data.get("email"))
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    # Validate input
    validation_error = validate_signup_payload(full_name, email, password, confirm_password)
    if validation_error:
        return jsonify({"message": validation_error}), 400

    # Check if email already exists
    if get_admin_by_email(email):
        return jsonify({"message": "Email already exists"}), 409

    # Create admin
    create_admin(full_name, email, password)
    return jsonify({"message": "Account created successfully"}), 201
```

**Key Points:**

- Returns **201** (Created) on success
- Returns **400** (Bad Request) on validation error
- Returns **409** (Conflict) if email exists

### Endpoint 2: POST /api/auth/login

```python
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me"))

    # Verify credentials
    admin = verify_admin_credentials(email, password)
    if not admin:
        return jsonify({"message": "Invalid email or password"}), 401

    # Set session
    session.clear()
    session["admin_id"] = admin.id
    session.permanent = remember_me  # 30 days if True, temporary if False

    return jsonify({"message": "Login successful", "admin": admin.to_session_payload()}), 200
```

**Session Handling:**

- `session["admin_id"]` stores admin ID
- `session.permanent = remember_me` controls session lifetime
- `session.clear()` clears old session before creating new one

### Endpoint 3: POST /api/auth/logout

```python
@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Signed out successfully"}), 200
```

### Endpoint 4: POST /api/auth/forgot-password

```python
@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = normalize_email(data.get("email"))
    admin = get_admin_by_email(email)

    if admin:
        # Generate reset token
        token = build_reset_serializer(current_app.config["SECRET_KEY"]).dumps({"admin_id": admin.id})
        reset_link = f"{request.host_url.rstrip('/')}/api/auth/reset-password/{token}"
        current_app.logger.info("Generated reset link for %s: %s", admin.email, reset_link)

    # Always return same message (don't reveal if email exists)
    return jsonify({"message": "If the email is registered, a reset link has been generated."}), 200
```

**Security Feature:**

- Returns same message regardless of whether email exists
- Prevents email enumeration attacks

### Endpoint 5 & 6: GET/POST /api/auth/reset-password/<token>

```python
@auth_bp.get("/reset-password/<token>")
def validate_reset_token(token):
    admin, error_message = resolve_reset_token(current_app.config["SECRET_KEY"], token)
    if error_message:
        return jsonify({"message": error_message}), 400

    return jsonify({"message": "Reset token is valid", "admin": admin.to_session_payload()}), 200

@auth_bp.post("/reset-password/<token>")
def reset_password(token):
    admin, error_message = resolve_reset_token(current_app.config["SECRET_KEY"], token)
    if error_message:
        return jsonify({"message": error_message}), 400

    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    # Validate passwords
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
    if password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400

    update_admin_password(admin, password)
    return jsonify({"message": "Password reset successfully"}), 200
```

### Helper Function: current_admin()

```python
def current_admin():
    admin_id = session.get("admin_id")
    if not admin_id:
        return None
    return db.session.get(Admin, admin_id)
```

Used to get currently logged-in admin from session.

### Interview Questions

**Q1: What's the difference between 400, 401, and 409 HTTP status codes?**

> - **400 (Bad Request)**: Client sent invalid data (missing fields, validation errors)
> - **401 (Unauthorized)**: Authentication failed or not provided (wrong password, not logged in)
> - **409 (Conflict)**: Email already exists in database (can't create duplicate)
> - Using correct status codes helps frontend handle different error scenarios

**Q2: Why clear session before creating a new one during login?**

> `session.clear()` removes any old session data before setting new admin_id. This:
>
> - Prevents session fixation attacks
> - Ensures only valid admin_id is in session
> - Cleans up any stale data from previous login

**Q3: How does "Remember Me" work?**

> - Frontend sends `remember_me: true/false` flag
> - Backend sets `session.permanent = remember_me`
> - If `True`: Session lifetime = 30 days (PERMANENT_SESSION_LIFETIME)
> - If `False`: Session is temporary and expires when browser closes
> - Browser stores session cookie with appropriate expiry

**Q4: Why always show same message for forgot password?**

> This is a security best practice to prevent **email enumeration attacks**:
>
> - If we said "Email not registered", attackers could build a list of valid emails
> - By always showing the same message, we don't leak information
> - Only admin with valid email receives reset link

**Q5: What's a reset token and how does it work?**

> Token is generated using `itsdangerous.URLSafeTimedSerializer`:
>
> - Encodes admin_id with a salt ("reset-password")
> - Includes timestamp information
> - Has 1-hour expiry (max_age=3600)
> - When user clicks reset link, token is validated
> - If expired or invalid, shows error message

**Q6: Why verify credentials before returning admin data in login?**

> Only after verifying correct email AND password combination, we:
>
> - Return admin data to frontend
> - Set session with admin_id
> - This prevents unauthorized access

---

## **6. backend/routes/opportunities.py** - Opportunity CRUD Endpoints

### Purpose

Handles all opportunity management endpoints.

### Endpoint 1: GET /api/opportunities

```python
@opportunities_bp.get("")
def list_opportunities():
    admin, error_response = require_admin()
    if error_response:
        return error_response

    opportunities = (
        db.session.execute(
            db.select(Opportunity)
            .where(Opportunity.admin_id == admin.id)
            .order_by(Opportunity.created_at.desc())
        )
        .scalars()
        .all()
    )
    return jsonify({"opportunities": [item.to_dict() for item in opportunities]}), 200
```

**Key Features:**

- `require_admin()` checks if user is authenticated
- Filters by `admin_id` (data isolation)
- Orders by newest first
- Returns empty list if no opportunities

### Endpoint 2: POST /api/opportunities

```python
@opportunities_bp.post("")
def create_opportunity():
    admin, error_response = require_admin()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    parsed, error_message = validate_opportunity_payload(data)
    if error_message:
        return jsonify({"message": error_message}), 400

    opportunity = Opportunity(admin_id=admin.id, **parsed)
    db.session.add(opportunity)
    db.session.commit()

    return jsonify({
        "message": "Opportunity created successfully",
        "opportunity": opportunity.to_dict()
    }), 201
```

**Process:**

1. Check authentication
2. Validate all required fields
3. Create Opportunity with current admin_id
4. Commit to database
5. Return created opportunity

### Endpoint 3: GET /api/opportunities/<id>

```python
@opportunities_bp.get("/<int:opportunity_id>")
def get_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response
    return jsonify({"opportunity": opportunity.to_dict()}), 200
```

**Security:** Uses `get_owned_opportunity()` to verify admin owns this opportunity

### Endpoint 4: PUT /api/opportunities/<id>

```python
@opportunities_bp.put("/<int:opportunity_id>")
def update_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    parsed, error_message = validate_opportunity_payload(data)
    if error_message:
        return jsonify({"message": error_message}), 400

    for key, value in parsed.items():
        setattr(opportunity, key, value)

    db.session.commit()
    return jsonify({
        "message": "Opportunity updated successfully",
        "opportunity": opportunity.to_dict()
    }), 200
```

**Update Logic:**

- Validates new data same as creation
- Updates all fields using `setattr()`
- Auto-updates `updated_at` timestamp
- Returns updated opportunity

### Endpoint 5: DELETE /api/opportunities/<id>

```python
@opportunities_bp.delete("/<int:opportunity_id>")
def delete_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response

    db.session.delete(opportunity)
    db.session.commit()
    return jsonify({"message": "Opportunity deleted successfully"}), 200
```

### Helper Functions

```python
def require_admin():
    """Check if user is authenticated"""
    admin_id = session.get("admin_id")
    if not admin_id:
        return None, (jsonify({"message": "Authentication required"}), 401)

    admin = db.session.get(Admin, admin_id)
    if not admin:
        return None, (jsonify({"message": "Authentication required"}), 401)

    return admin, None

def get_owned_opportunity(opportunity_id):
    """Get opportunity only if owned by current admin"""
    admin, error_response = require_admin()
    if error_response:
        return None, error_response

    opportunity = db.session.get(Opportunity, opportunity_id)
    if not opportunity or opportunity.admin_id != admin.id:
        return None, (jsonify({"message": "Opportunity not found"}), 404)

    return opportunity, None
```

### Interview Questions

**Q1: What does `require_admin()` do and why is it important?**

> - Checks if user is authenticated by looking for `admin_id` in session
> - Returns 401 (Unauthorized) if not logged in
> - Prevents unauthorized access to protected endpoints
> - Used in all opportunity endpoints to ensure only authenticated users can access

**Q2: How is data isolation implemented?**

> In `get_owned_opportunity()`:
>
> ```python
> if not opportunity or opportunity.admin_id != admin.id:
>     return None, (jsonify({"message": "Opportunity not found"}), 404)
> ```
>
> - Checks if opportunity belongs to current admin
> - Returns 404 if not, as if opportunity doesn't exist
> - Prevents admin B from accessing admin A's opportunities

**Q3: Why validate data the same way for POST and PUT?**

> - Ensures consistency: same rules apply for creation and editing
> - Prevents invalid data from entering database through either endpoint
> - If field becomes optional, both endpoints respect that
> - Less code duplication

**Q4: What happens when you delete an opportunity?**

> - `db.session.delete(opportunity)` marks it for deletion
> - `db.session.commit()` writes deletion to database
> - Returns 200 with success message
> - Frontend removes it from UI immediately

**Q5: Why use `setattr()` in update instead of manual assignment?**

> `setattr(opportunity, key, value)` is more flexible:
>
> - Dynamic field updates (no hardcoded list of fields)
> - If new fields are added to model, update endpoint works automatically
> - Less code to maintain
> - Alternative: manually assign each field (`opportunity.name = data['name']`) is more verbose

**Q6: What's the difference between 401 and 404 in `get_owned_opportunity()`?**

> - **401 (Unauthorized)**: User not logged in (from `require_admin()`)
> - **404 (Not Found)**: User logged in but opportunity doesn't belong to them
> - This prevents leaking information: attacker can't tell if opportunity exists

---

## **7. backend/services/auth_service.py** - Authentication Business Logic

### Purpose

Handles core authentication logic separate from routes.

### Key Functions

#### `normalize_email(email)`

```python
def normalize_email(email):
    return (email or "").strip().lower()
```

- Removes whitespace and converts to lowercase
- Ensures consistent email format
- `"ADMIN@TEST.COM"` becomes `"admin@test.com"`

#### `validate_signup_payload(full_name, email, password, confirm_password)`

```python
def validate_signup_payload(full_name, email, password, confirm_password):
    if not full_name:
        return "Full name is required"
    if not email or "@" not in email:
        return "A valid email is required"
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if password != confirm_password:
        return "Passwords do not match"
    return None
```

**Validation Rules:**

1. Full name must not be empty
2. Email must contain "@" (basic validation)
3. Password minimum 8 characters
4. Passwords must match
5. Returns first error found

#### `get_admin_by_email(email)`

```python
def get_admin_by_email(email):
    normalized_email = normalize_email(email)
    return db.session.execute(
        db.select(Admin).where(func.lower(Admin.email) == normalized_email)
    ).scalar_one_or_none()
```

**Features:**

- Case-insensitive email lookup
- Returns admin object or None
- Uses indexed email column for fast query

#### `create_admin(full_name, email, password)`

```python
def create_admin(full_name, email, password):
    admin = Admin(
        full_name=full_name.strip(),
        email=normalize_email(email),
        password_hash=generate_password_hash(password),
    )
    db.session.add(admin)
    db.session.commit()
    return admin
```

**Process:**

1. Create Admin object with normalized data
2. Hash password using werkzeug
3. Add to session
4. Commit to database

#### `verify_admin_credentials(email, password)`

```python
def verify_admin_credentials(email, password):
    admin = get_admin_by_email(email)
    if not admin or not check_password_hash(admin.password_hash, password):
        return None
    return admin
```

**Security:**

- Returns None if email not found OR password wrong
- Prevents attackers from knowing which failed
- Uses `check_password_hash()` for secure comparison

#### `update_admin_password(admin, password)`

```python
def update_admin_password(admin, password):
    admin.password_hash = generate_password_hash(password)
    db.session.commit()
```

### Interview Questions

**Q1: Why normalize email to lowercase?**

> - Emails are case-insensitive (RFC 5321)
> - Prevents duplicate accounts: `Admin@Test.com` and `admin@test.com` are same email
> - Consistent database storage
> - Lookup is case-insensitive

**Q2: Is "@" enough for email validation?**

> No, it's basic validation. Proper email validation requires:
>
> - Regex pattern matching
> - Domain verification
> - But for MVP/interview purposes, "@" check is acceptable
> - In production, use email validation library or regex

**Q3: Why return None for both "email not found" and "wrong password"?**

> This is **security through obfuscation**:
>
> - Don't tell attackers which attempts succeed
> - Prevents email enumeration attacks
> - If both fail scenarios return None, attackers can't distinguish between them

**Q4: Why use `check_password_hash()` instead of plain comparison?**

> - Hash is one-way function, can't reverse to get password
> - `check_password_hash()` uses constant-time comparison
> - Prevents timing attacks where attacker measures comparison time
> - Even if database is breached, passwords are protected

**Q5: What's the difference between `generate_password_hash()` and storing plain text?**

> - `generate_password_hash()` uses PBKDF2 with salt
> - Each hash is unique even for same password (due to salt)
> - Impossible to reverse engineer password from hash
> - Industry standard security practice

---

## **8. backend/services/opportunity_service.py** - Validation Logic

### Purpose

Validates opportunity data before saving to database.

### Key Function: `validate_opportunity_payload(data)`

```python
def validate_opportunity_payload(data):
    name = (data.get("name") or "").strip()
    duration = (data.get("duration") or "").strip()
    start_date_raw = (data.get("start_date") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip()
    future_opportunities = (data.get("future_opportunities") or "").strip()
    max_applicants_raw = data.get("max_applicants")
    skills_value = data.get("skills") or []

    # Parse skills
    if isinstance(skills_value, str):
        skills = [item.strip() for item in skills_value.split(",") if item.strip()]
    else:
        skills = [str(item).strip() for item in skills_value if str(item).strip()]

    # Validate required fields
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

    # Validate date format
    try:
        start_date = datetime.strptime(start_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return None, "Start date must be in YYYY-MM-DD format"

    # Validate optional field
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
```

### Features

**Flexible Skills Input:**

- Accepts comma-separated string: `"Python, JavaScript"`
- Accepts array: `["Python", "JavaScript"]`
- Parses to consistent array format

**Date Validation:**

- Requires `YYYY-MM-DD` format
- Parses to Python `date` object
- Stored in database as `Date` type

**Optional Field:**

- `max_applicants` is optional
- If provided, must be positive integer

**Return Format:**

- Returns tuple: `(parsed_data, error_message)`
- If valid: `(dict, None)`
- If invalid: `(None, error_string)`

### Interview Questions

**Q1: Why parse skills from both string and array formats?**

> Frontend flexibility:
>
> - Frontend might send skills as `"Python, JavaScript"` (string)
> - Or as `["Python", "JavaScript"]` (array)
> - Backend should handle both gracefully
> - Easier for frontend developers to work with API

**Q2: What's the purpose of `.strip()` throughout the function?**

> - Removes leading/trailing whitespace
> - `"  Python  "` becomes `"Python"`
> - Prevents validation errors from extra spaces
> - Cleans data before storing in database

**Q3: Why return tuple (data, error) instead of raising exceptions?**

> - More Pythonic for this use case
> - Caller can check for error without try-catch
> - Allows returning detailed error message
> - Easier for API to return specific error to frontend

**Q4: How do you handle different date formats?**

> Currently, only `YYYY-MM-DD` is accepted:
>
> - `strptime("%Y-%m-%d")` is strict format checker
> - Rejects `DD-MM-YYYY` or other formats
> - Consistent date handling across system
> - In production, might support multiple formats

**Q5: Why validate max_applicants twice?**

> Two checks:
>
> 1. `int(max_applicants_raw)` - Check if it's a valid integer
> 2. `max_applicants < 0` - Check if it's non-negative
>
> - Prevents negative applicant counts (nonsensical)
> - User-friendly error messages for each failure

---

## **9. backend/utils/tokens.py** - Password Reset Tokens

### Purpose

Generate and validate secure password reset tokens.

### Key Functions

#### `build_reset_serializer(secret_key)`

```python
def build_reset_serializer(secret_key):
    return URLSafeTimedSerializer(secret_key, salt="reset-password")
```

**URLSafeTimedSerializer:**

- Creates timestamped, signed tokens
- Salt = "reset-password" distinguishes from other tokens
- Uses SECRET_KEY for signing

#### `resolve_reset_token(secret_key, token)`

```python
def resolve_reset_token(secret_key, token):
    serializer = build_reset_serializer(secret_key)
    try:
        payload = serializer.loads(token, max_age=3600)
    except SignatureExpired:
        return None, "Reset link has expired"
    except BadSignature:
        return None, "Invalid reset link"

    admin = db.session.get(Admin, payload.get("admin_id"))
    if not admin:
        return None, "Invalid reset link"
    return admin, None
```

**Process:**

1. Decode token using same salt and secret key
2. Check if expired (3600 seconds = 1 hour)
3. Check if signature is valid
4. Verify admin still exists
5. Return admin or error

### How It Works

**Token Generation (Forgot Password):**

```
1. User submits email
2. Find admin by email
3. Generate token: serializer.dumps({"admin_id": admin.id})
4. Send reset link: /api/auth/reset-password/{token}
5. Token contains admin_id, timestamp, and signature
```

**Token Validation (Reset Password):**

```
1. User clicks reset link
2. Token sent to backend
3. Verify signature (tamper-proof)
4. Check timestamp (not expired)
5. Extract admin_id and fetch admin
6. Allow password reset
```

### Interview Questions

**Q1: What's `itsdangerous` and why use it?**

> Library for generating secure tokens:
>
> - **Signed**: Uses SECRET_KEY to sign, can't be forged
> - **Timestamped**: Includes creation time for expiry checks
> - **URL-safe**: Uses base64 encoding, safe for URLs
> - Alternative: JWT, but itsdangerous is simpler for this case

**Q2: Why 1-hour expiry for reset token?**

> Security vs usability trade-off:
>
> - **Too short (15 min)**: User might miss email, becomes frustrating
> - **Too long (7 days)**: Security risk, if email leaked, reset link valid too long
> - **1 hour**: Common practice, reasonable window
> - Can be configured via `max_age` parameter

**Q3: What happens if token is modified?**

> Signature validation fails:
>
> - Token is encrypted with SECRET_KEY
> - Modifying any character invalidates signature
> - `BadSignature` exception raised
> - Returns error: "Invalid reset link"
> - Prevents attackers from changing admin_id in token

**Q4: Why include salt="reset-password"?**

> Salt distinguishes tokens by purpose:
>
> - Same SECRET_KEY used for sessions and other tokens
> - Salt ensures reset tokens can't be confused with session tokens
> - If `salt="session"` was used, token would verify but mean different thing
> - Security practice: different salts for different purposes

**Q5: What if admin is deleted after token is generated?**

> In `resolve_reset_token()`:
>
> ```python
> admin = db.session.get(Admin, payload.get("admin_id"))
> if not admin:
>     return None, "Invalid reset link"
> ```
>
> - Token decodes successfully (signature valid)
> - But admin not found in database
> - Returns error: "Invalid reset link"
> - Prevents resetting password for deleted admin

---

# 🎯 COMMONLY ASKED INTERVIEW QUESTIONS

## Architecture & Design

**Q: Why did you separate routes, services, and utils?**

> Separation of concerns:
>
> - **Routes**: Handle HTTP requests/responses, validation
> - **Services**: Business logic, database operations
> - **Utils**: Helper functions (tokens, formatting)
> - Easier to test each layer independently
> - Reusable functions across routes

**Q: How would you scale this backend?**

> - Add caching (Redis) for frequently accessed data
> - Database indexes on common queries
> - Pagination for large opportunity lists
> - Connection pooling for database
> - API rate limiting
> - Load balancing with multiple instances

**Q: What security vulnerabilities are you aware of?**

> - **SQL Injection**: Using SQLAlchemy ORM prevents this
> - **Password exposure**: Passwords are hashed, never logged
> - **Email enumeration**: Same message for forgot password
> - **CSRF**: Flask sessions are secure by default
> - **XSS**: Frontend escapes HTML (not shown here)
> - **Unauthorized access**: Check `admin_id` before operations

**Q: How would you handle concurrent requests?**

> - Flask-SQLAlchemy uses connection pooling
> - Each request gets its own database connection
> - Sessions are per-request (thread-local)
> - No global state (stateless design)
> - Database handles concurrent writes with transactions

## Technical Depth

**Q: Explain the session handling flow**

> 1. User logs in with credentials
> 2. Backend verifies password hash
> 3. Creates session with `admin_id`
> 4. Sets `session.permanent = remember_me`
> 5. Session cookie sent to browser
> 6. Browser includes cookie in future requests
> 7. `session.get("admin_id")` retrieves admin ID
> 8. On logout, `session.clear()` deletes cookie
> 9. If "Remember Me": 30-day expiry
> 10. Otherwise: Expires when browser closes

**Q: How are passwords secured?**

> - Never stored in plain text
> - `generate_password_hash()` uses PBKDF2 algorithm
> - Each password gets unique salt
> - Even identical passwords produce different hashes
> - Verification using `check_password_hash()` with constant-time comparison
> - Prevents timing attacks

**Q: How is data isolation implemented?**

> Every endpoint that accesses opportunities:
>
> 1. Calls `require_admin()` to get current admin
> 2. Queries with `WHERE admin_id == admin.id`
> 3. For get/update/delete: `get_owned_opportunity()`
> 4. Returns 404 if opportunity doesn't belong to admin
>
> - Admin A can't query, modify, or delete Admin B's opportunities
> - Database level: Foreign key constraint
> - Application level: Explicit admin_id checks

**Q: Explain error handling in opportunities endpoint**

> ```python
> # Authentication check
> admin, error_response = require_admin()
> if error_response:
>     return error_response  # 401 if not logged in
>
> # Validation check
> parsed, error_message = validate_opportunity_payload(data)
> if error_message:
>     return jsonify({"message": error_message}), 400
>
> # Authorization check
> opportunity, error_response = get_owned_opportunity(id)
> if error_response:
>     return error_response  # 404 if not owned
> ```
>
> Three layers: authentication → validation → authorization

## Real-World Scenarios

**Q: What if a user forgets their password?**

> 1. Click "Forgot Password"
> 2. Enter email address
> 3. Backend generates reset token (1-hour valid)
> 4. Token sent in reset link
> 5. User clicks link, token validated
> 6. User enters new password
> 7. Backend updates password_hash
> 8. User can login with new password

**Q: What happens if two users try to update same opportunity simultaneously?**

> - Frontend prevents this (only creator can edit)
> - Database doesn't prevent race condition
> - Last write wins (last update overwrites)
> - In production: Add version/timestamp checks or optimistic locking

**Q: How do you prevent an admin from accessing another admin's opportunity?**

> - Every opportunity operation requires authentication
> - Check that `opportunity.admin_id == current_admin.id`
> - Return 404 (not 403) so attackers can't enumerate IDs
> - Database foreign key ensures admin must exist

**Q: What happens if the database connection fails?**

> - Flask raises `OperationalError` exception
> - Currently not caught, app crashes
> - Production: Implement retry logic, connection pooling
> - Return 500 error to user, log error
> - Health check endpoint monitors connectivity

## Testing & Debugging

**Q: How would you test this backend?**

> - **Unit tests**: Test services (validate_opportunity_payload)
> - **Integration tests**: Test routes with test database
> - **Authentication tests**: Login, logout, forgot password
> - **Authorization tests**: Verify data isolation
> - **Error case tests**: Invalid inputs, missing fields
> - Use SQLite in-memory database for tests

**Q: How would you debug a failing request?**

> - Check Flask terminal logs for HTTP status codes
> - Use browser DevTools to see request/response
> - Add print statements in route handlers
> - Use debugger: `import pdb; pdb.set_trace()`
> - Check database directly with SQL queries
> - Enable Flask debug mode (FLASK_DEBUG=1)

---

# 📝 KEY CONCEPTS TO REMEMBER

## Security

- ✅ Passwords hashed, never plain text
- ✅ Session validation on every protected request
- ✅ Data isolation: admin_id checks everywhere
- ✅ Secure tokens: signed, timestamped, salted
- ✅ Generic error messages prevent enumeration attacks

## Database Design

- ✅ Foreign keys enforce referential integrity
- ✅ Cascade delete prevents orphaned data
- ✅ Indexes on frequently queried columns
- ✅ UTC timestamps for consistency
- ✅ JSON column for flexible data (skills)

## API Design

- ✅ RESTful endpoints (GET, POST, PUT, DELETE)
- ✅ Proper HTTP status codes (200, 201, 400, 401, 404)
- ✅ Consistent error message format
- ✅ Separation of concerns (routes, services)
- ✅ Validation at multiple layers

## Architecture

- ✅ Factory pattern for app creation
- ✅ Environment variables for configuration
- ✅ Blueprints for modular routes
- ✅ Services layer for business logic
- ✅ Utils for reusable functions

---

# 🚀 TALKING POINTS FOR INTERVIEW

When discussing this implementation:

1. **"I implemented full authentication flow"**
   - Sign up with validation
   - Login with remember me
   - Logout with session clear
   - Forgot password with secure tokens
   - Token expiry (1 hour)

2. **"Data isolation is enforced at application level"**
   - Every query checks admin_id
   - Can't access other admin's opportunities
   - Returns 404 to prevent enumeration

3. **"Security is a priority"**
   - Passwords hashed with PBKDF2
   - Secure tokens with signatures
   - No sensitive data in logs
   - Session management best practices

4. **"Code is modular and maintainable"**
   - Separated routes, services, utils
   - Reusable validation functions
   - Clear error handling
   - Easy to test and extend

5. **"Follows REST principles"**
   - Proper HTTP methods (GET, POST, PUT, DELETE)
   - Correct status codes
   - Consistent naming conventions
   - JSON request/response format

6. **"Scalable design"**
   - Can add caching layer
   - Database-agnostic (SQLite/PostgreSQL)
   - Horizontal scaling possible
   - Connection pooling ready

---

**Good luck with your interview! Remember to explain the WHY behind your decisions, not just WHAT you built.** 🎯
