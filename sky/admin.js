const captchas = { login: "", signup: "", forgot: "" };
const appState = {
    currentAdmin: null,
    opportunities: [],
    editingOpportunityId: null,
};

function generateCaptcha(type) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    captchas[type] = code;
    document.getElementById(`${type}CaptchaText`).textContent = code;
}

function showPage(pageId) {
    document.querySelectorAll(".form-page").forEach((page) => page.classList.remove("active"));
    setTimeout(() => document.getElementById(pageId).classList.add("active"), 50);
    document.querySelectorAll(".error-msg").forEach((error) => error.classList.remove("show"));
    document.querySelectorAll("input, textarea, select").forEach((field) => field.classList.remove("error"));
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (message) el.querySelector("span").textContent = message;
    el.classList.add("show");
}

function clearAllErrors(formId) {
    document.querySelectorAll(`#${formId} .error-msg`).forEach((error) => error.classList.remove("show"));
    document.querySelectorAll(`#${formId} input, #${formId} textarea, #${formId} select`).forEach((field) =>
        field.classList.remove("error")
    );
}

function shakeForm(formId) {
    const form = document.getElementById(formId);
    form.classList.add("shake");
    setTimeout(() => form.classList.remove("shake"), 400);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(message) {
    document.getElementById("toastMsg").textContent = message;
    document.getElementById("toast").classList.add("show");
    setTimeout(() => document.getElementById("toast").classList.remove("show"), 3000);
}

function checkStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const labels = ["", "Weak", "Medium", "Strong", "Very Strong"];
    const classes = ["", "weak", "medium", "strong", "very-strong"];

    for (let i = 1; i <= 4; i++) {
        const bar = document.getElementById(`str${i}`);
        bar.className = "strength-bar";
        if (i <= score) bar.classList.add(classes[score]);
    }

    document.getElementById("strengthLabel").textContent = value.length > 0 ? labels[score] : "";
}

function showDashboard(admin) {
    appState.currentAdmin = admin;
    document.getElementById("authWrapper").style.display = "none";
    document.getElementById("dashboardWrapper").classList.add("active");
    document.body.style.alignItems = "stretch";

    const name = (admin.full_name || admin.email || "Admin").trim();
    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    document.getElementById("dashName").textContent = name;
    document.getElementById("dashAvatar").textContent = initials || "AD";

    if (window.innerWidth <= 768) {
        document.getElementById("menuToggle").style.display = "flex";
    }
}

async function handleLogout() {
    try {
        await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    appState.currentAdmin = null;
    appState.opportunities = [];
    appState.editingOpportunityId = null;

    document.getElementById("dashboardWrapper").classList.remove("active");
    document.getElementById("authWrapper").style.display = "flex";
    document.body.style.alignItems = "";
    showPage("loginPage");
    showToast("Signed out successfully");
}

function bindNavigation() {
    document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
        item.addEventListener("click", function () {
            const page = this.getAttribute("data-page");
            document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
            this.classList.add("active");

            document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active"));

            const mapping = {
                dashboard: ["dashboardSection", "Dashboard"],
                learner: ["learnerSection", "Learner Management"],
                verifier: ["verifierSection", "Verifier Management"],
                collaborator: ["collaboratorSection", "Collaborator Management"],
                opportunity: ["opportunitySection", "Opportunity Management"],
                reports: ["reportsSection", "Reports and Analytics"],
            };

            const [sectionId, title] = mapping[page] || mapping.dashboard;
            document.getElementById(sectionId).classList.add("active");
            document.getElementById("pageTitle").textContent = title;
        });
    });
}

function changeChartPeriod(period) {
    document.querySelectorAll(".tabs .tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.textContent.toLowerCase() === period);
    });

    const chartData = {
        daily: "M0,120 Q50,110 100,90 T200,70 T300,50 T400,40",
        weekly: "M0,110 Q50,95 100,85 T200,65 T300,45 T400,35",
        monthly: "M0,100 Q50,85 100,75 T200,55 T300,40 T400,30",
        quarterly: "M0,90 Q50,75 100,65 T200,50 T300,35 T400,25",
        yearly: "M0,80 Q50,65 100,55 T200,40 T300,30 T400,20",
    };

    const linePath = document.getElementById("linePath");
    const lineArea = document.getElementById("lineArea");
    const path = chartData[period];

    linePath.setAttribute("d", path);
    lineArea.setAttribute("d", `${path} L400,150 L0,150 Z`);
}

function toggleNotifications() {
    document.getElementById("notificationDropdown").classList.toggle("active");
}

function markAllRead() {
    document.querySelectorAll(".notif-item.unread").forEach((item) => item.classList.remove("unread"));
    showToast("All notifications marked as read");
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);

    const icon = document.getElementById("themeIcon");
    icon.innerHTML =
        newTheme === "dark"
            ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
            : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
}

function openSearch() {
    document.getElementById("searchContainer").classList.add("active");
    document.getElementById("searchInput").focus();
}

function closeSearch() {
    document.getElementById("searchContainer").classList.remove("active");
}

function openCourseDetails(courseName, stats) {
    document.getElementById("modalCourseTitle").textContent = courseName;
    document.getElementById("modalEnrolled").textContent = stats.enrolled;
    document.getElementById("modalCompleted").textContent = stats.completed;
    document.getElementById("modalInProgress").textContent = stats.inProgress;
    document.getElementById("modalHalfDone").textContent = stats.halfDone;
    document.getElementById("courseModal").classList.add("active");
}

function closeCourseModal() {
    document.getElementById("courseModal").classList.remove("active");
}

function openOpportunityDetails(opportunity) {
    document.getElementById("opportunityDetailTitle").textContent = opportunity.name;
    document.getElementById("opportunityDetailDuration").textContent = opportunity.duration;
    document.getElementById("opportunityDetailStartDate").textContent = formatDateForDisplay(opportunity.start_date);
    document.getElementById("opportunityDetailApplicants").textContent =
        opportunity.max_applicants ?? "Not specified";
    document.getElementById("opportunityDetailDescription").textContent = opportunity.description;
    document.getElementById("opportunityDetailFuture").textContent = opportunity.future_opportunities;
    document.getElementById("opportunityDetailPrereqs").textContent = "Not specified";

    const skillsContainer = document.getElementById("opportunityDetailSkills");
    skillsContainer.innerHTML = "";
    (opportunity.skills || []).forEach((skill) => {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.textContent = skill;
        skillsContainer.appendChild(tag);
    });

    document.getElementById("opportunityDetailsModal").classList.add("active");
}

function closeOpportunityDetailsModal() {
    document.getElementById("opportunityDetailsModal").classList.remove("active");
}

function openCollaboratorCourses(name, role) {
    document.getElementById("collaboratorName").textContent = `${name}'s Submitted Courses`;
    document.getElementById("collaboratorRole").textContent = `Role: ${role}`;
    document.getElementById("collaboratorCoursesModal").classList.add("active");
}

function closeCollaboratorCoursesModal() {
    document.getElementById("collaboratorCoursesModal").classList.remove("active");
}

function approveCourse(courseName) {
    showToast(`${courseName} has been approved!`);
}

function rejectCourse(courseName) {
    showToast(`${courseName} has been rejected.`);
}

function viewCourseDetails(courseName) {
    showToast(`Viewing details for ${courseName}`);
}

function resetOpportunityForm() {
    appState.editingOpportunityId = null;
    document.getElementById("opportunityForm").reset();
    document.getElementById("oppId").value = "";
    document.getElementById("opportunityModalTitle").textContent = "Add New Opportunity";
    document.getElementById("opportunitySubmitBtn").textContent = "Create Opportunity";
}

function openOpportunityModal() {
    resetOpportunityForm();
    document.getElementById("opportunityModal").classList.add("active");
}

function openOpportunityEdit(opportunityId) {
    const opportunity = appState.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) return;

    appState.editingOpportunityId = opportunityId;
    document.getElementById("oppId").value = opportunity.id;
    document.getElementById("oppName").value = opportunity.name;
    document.getElementById("oppDuration").value = opportunity.duration;
    document.getElementById("oppStartDate").value = opportunity.start_date;
    document.getElementById("oppDescription").value = opportunity.description;
    document.getElementById("oppSkills").value = (opportunity.skills || []).join(", ");
    document.getElementById("oppCategory").value = opportunity.category;
    document.getElementById("oppFuture").value = opportunity.future_opportunities;
    document.getElementById("oppMaxApplicants").value = opportunity.max_applicants ?? "";
    document.getElementById("opportunityModalTitle").textContent = "Edit Opportunity";
    document.getElementById("opportunitySubmitBtn").textContent = "Update Opportunity";
    document.getElementById("opportunityModal").classList.add("active");
}

function closeOpportunityModal() {
    document.getElementById("opportunityModal").classList.remove("active");
    resetOpportunityForm();
}

function openQuickAddModal() {
    document.getElementById("quickAddModal").classList.add("active");
}

function closeQuickAddModal() {
    document.getElementById("quickAddModal").classList.remove("active");
}

function openBulkUploadModal() {
    document.getElementById("bulkUploadModal").classList.add("active");
}

function closeBulkUploadModal() {
    document.getElementById("bulkUploadModal").classList.remove("active");
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    document.getElementById("fileName").textContent = file ? `✓ Selected: ${file.name}` : "";
}

function downloadSampleCSV() {
    const csvContent = "First Name,Last Name,Email\nJohn,Doe,john.doe@example.com\nJane,Smith,jane.smith@example.com";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_students.csv";
    a.click();
    window.URL.revokeObjectURL(url);
}

function openQuickAddVerifierModal() {
    document.getElementById("quickAddVerifierModal").classList.add("active");
}

function closeQuickAddVerifierModal() {
    document.getElementById("quickAddVerifierModal").classList.remove("active");
}

function openBulkUploadVerifierModal() {
    document.getElementById("bulkUploadVerifierModal").classList.add("active");
}

function closeBulkUploadVerifierModal() {
    document.getElementById("bulkUploadVerifierModal").classList.remove("active");
}

function handleVerifierFileSelect(event) {
    const file = event.target.files[0];
    document.getElementById("verifierFileName").textContent = file ? `✓ Selected: ${file.name}` : "";
}

function downloadSampleVerifierCSV() {
    const csvContent =
        "First Name,Last Name,Email,Subject\nDr. John,Doe,john.doe@qf.edu.qa,Mathematics\nProf. Jane,Smith,jane.smith@qf.edu.qa,Physics";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_verifiers.csv";
    a.click();
    window.URL.revokeObjectURL(url);
}

function openVerifierDetails(name, stats) {
    document.getElementById("verifierName").textContent = name;
    document.getElementById("verifierTotalStudents").textContent = stats.totalStudents;
    document.getElementById("verifierCertified").textContent = stats.certified;
    document.getElementById("verifierInProgress").textContent = stats.inProgress;

    const container = document.getElementById("subjectsContainer");
    container.innerHTML = "";
    stats.subjects.forEach((subject) => {
        const div = document.createElement("div");
        div.className = "subject-item";
        div.innerHTML = `<span class="subject-name">${subject.name}</span><span class="subject-students">${subject.students} students</span>`;
        container.appendChild(div);
    });

    document.getElementById("verifierDetailsModal").classList.add("active");
}

function closeVerifierDetailsModal() {
    document.getElementById("verifierDetailsModal").classList.remove("active");
}

function filterStudents() {
    const statusFilter = document.getElementById("statusFilter").value;
    document.querySelectorAll("#studentsTableBody tr").forEach((row) => {
        const rowStatus = row.getAttribute("data-status");
        row.style.display = statusFilter === "all" || rowStatus === statusFilter ? "" : "none";
    });
}

function filterVerifiers() {
    const statusFilter = document.getElementById("verifierStatusFilter").value;
    document.querySelectorAll("#verifiersTableBody tr").forEach((row) => {
        const rowStatus = row.getAttribute("data-status");
        row.style.display = statusFilter === "all" || rowStatus === statusFilter ? "" : "none";
    });
}

async function apiFetch(url, options = {}) {
    const config = {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        credentials: "same-origin",
        ...options,
    };

    if (config.body && typeof config.body !== "string") {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.message || "Something went wrong");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

async function syncSession() {
    try {
        const data = await apiFetch("/api/auth/session", { method: "GET" });
        if (data.authenticated) {
            showDashboard(data.admin);
            await loadOpportunities();
        }
    } catch (error) {
        console.error("Session sync failed", error);
    }
}

async function loadOpportunities() {
    try {
        const data = await apiFetch("/api/opportunities", { method: "GET" });
        appState.opportunities = data.opportunities || [];
        renderOpportunities();
    } catch (error) {
        if (error.status === 401) {
            await handleLogout();
            return;
        }
        showToast(error.message || "Unable to load opportunities");
    }
}

function renderOpportunities() {
    const grid = document.getElementById("opportunitiesGrid");
    const emptyState = document.getElementById("opportunitiesEmptyState");

    grid.innerHTML = "";

    if (!appState.opportunities.length) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    appState.opportunities.forEach((opportunity) => {
        grid.appendChild(buildOpportunityCard(opportunity));
    });
}

function buildOpportunityCard(opportunity) {
    const card = document.createElement("div");
    card.className = "opportunity-card";

    const header = document.createElement("div");
    header.className = "opportunity-card-header";

    const title = document.createElement("h5");
    title.textContent = opportunity.name;

    const meta = document.createElement("div");
    meta.className = "opportunity-meta";
    meta.appendChild(buildMetaItem(categoryIcon(), toTitleCase(opportunity.category)));
    meta.appendChild(buildMetaItem(durationIcon(), opportunity.duration));
    meta.appendChild(buildMetaItem(dateIcon(), formatDateForDisplay(opportunity.start_date)));

    header.appendChild(title);
    header.appendChild(meta);

    const description = document.createElement("p");
    description.className = "opportunity-description";
    description.textContent = opportunity.description;

    const skillsWrapper = document.createElement("div");
    skillsWrapper.className = "opportunity-skills";
    skillsWrapper.innerHTML = '<div class="opportunity-skills-label">Skills You\'ll Gain</div>';

    const skillsTags = document.createElement("div");
    skillsTags.className = "skills-tags";
    (opportunity.skills || []).forEach((skill) => {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.textContent = skill;
        skillsTags.appendChild(tag);
    });
    skillsWrapper.appendChild(skillsTags);

    const footer = document.createElement("div");
    footer.className = "opportunity-footer";

    const applicants = document.createElement("span");
    applicants.className = "applicants-count";
    applicants.textContent =
        opportunity.max_applicants === null || opportunity.max_applicants === undefined
            ? "Applicants not specified"
            : `${opportunity.max_applicants} applicants`;

    const actions = document.createElement("div");
    actions.className = "opportunity-actions";
    actions.appendChild(buildActionButton("View Details", "view", () => openOpportunityDetails(opportunity)));
    actions.appendChild(buildActionButton("Edit", "edit", () => openOpportunityEdit(opportunity.id)));
    actions.appendChild(buildActionButton("Delete", "delete", () => deleteOpportunity(opportunity.id)));

    footer.appendChild(applicants);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(skillsWrapper);
    card.appendChild(footer);
    return card;
}

function buildMetaItem(icon, text) {
    const span = document.createElement("span");
    span.innerHTML = icon;
    span.appendChild(document.createTextNode(text));
    return span;
}

function buildActionButton(label, variant, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `opportunity-action-btn ${variant}`;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function formatDateForDisplay(dateValue) {
    if (!dateValue) return "";
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toTitleCase(value) {
    return String(value || "")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function categoryIcon() {
    return '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
}

function durationIcon() {
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
}

function dateIcon() {
    return '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
}

async function deleteOpportunity(opportunityId) {
    if (!window.confirm("Delete this opportunity permanently?")) return;

    try {
        await apiFetch(`/api/opportunities/${opportunityId}`, { method: "DELETE" });
        appState.opportunities = appState.opportunities.filter((item) => item.id !== opportunityId);
        renderOpportunities();
        showToast("Opportunity deleted successfully");
    } catch (error) {
        showToast(error.message || "Unable to delete opportunity");
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    clearAllErrors("loginForm");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const captchaInput = document.getElementById("loginCaptchaInput").value.trim();
    const rememberMe = document.getElementById("loginRememberMe").checked;
    let valid = true;

    if (!email || !isValidEmail(email)) {
        showError("loginEmailErr");
        document.getElementById("loginEmail").classList.add("error");
        valid = false;
    }
    if (!password) {
        showError("loginPasswordErr", "Please enter your password");
        document.getElementById("loginPassword").classList.add("error");
        valid = false;
    }
    if (!captchaInput) {
        showError("loginCaptchaErr", "Please enter the captcha code");
        valid = false;
    } else if (captchaInput !== captchas.login) {
        showError("loginCaptchaErr", "Captcha does not match. Please try again.");
        generateCaptcha("login");
        valid = false;
    }

    if (!valid) {
        shakeForm("loginForm");
        return;
    }

    try {
        const data = await apiFetch("/api/auth/login", {
            method: "POST",
            body: {
                email,
                password,
                remember_me: rememberMe,
            },
        });

        showToast("Login successful! Redirecting...");
        generateCaptcha("login");
        setTimeout(async () => {
            showDashboard(data.admin);
            await loadOpportunities();
        }, 700);
    } catch (error) {
        showError("loginPasswordErr", error.message || "Invalid email or password");
        document.getElementById("loginPassword").classList.add("error");
        shakeForm("loginForm");
        generateCaptcha("login");
    }
}

async function handleSignupSubmit(event) {
    event.preventDefault();
    clearAllErrors("signupForm");

    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const confirmPassword = document.getElementById("signupConfirmPassword").value.trim();
    const captchaInput = document.getElementById("signupCaptchaInput").value.trim();
    let valid = true;

    if (!fullName) {
        showError("signupNameErr");
        document.getElementById("signupName").classList.add("error");
        valid = false;
    }
    if (!email || !isValidEmail(email)) {
        showError("signupEmailErr");
        document.getElementById("signupEmail").classList.add("error");
        valid = false;
    }
    if (!password || password.length < 8) {
        showError("signupPasswordErr");
        document.getElementById("signupPassword").classList.add("error");
        valid = false;
    }
    if (!confirmPassword || password !== confirmPassword) {
        showError("signupConfirmPasswordErr");
        document.getElementById("signupConfirmPassword").classList.add("error");
        valid = false;
    }
    if (!captchaInput) {
        showError("signupCaptchaErr", "Please enter the captcha code");
        valid = false;
    } else if (captchaInput !== captchas.signup) {
        showError("signupCaptchaErr", "Captcha does not match.");
        generateCaptcha("signup");
        valid = false;
    }

    if (!valid) {
        shakeForm("signupForm");
        return;
    }

    try {
        await apiFetch("/api/auth/signup", {
            method: "POST",
            body: {
                full_name: fullName,
                email,
                password,
                confirm_password: confirmPassword,
            },
        });

        showToast("Account created successfully!");
        generateCaptcha("signup");
        event.target.reset();
        checkStrength("");
        setTimeout(() => showPage("loginPage"), 1000);
    } catch (error) {
        const message = error.message || "Unable to create account";
        if (/email/i.test(message)) {
            showError("signupEmailErr", message);
            document.getElementById("signupEmail").classList.add("error");
        } else if (/password/i.test(message)) {
            showError("signupPasswordErr", message);
            document.getElementById("signupPassword").classList.add("error");
        } else {
            showToast(message);
        }
        shakeForm("signupForm");
        generateCaptcha("signup");
    }
}

async function handleForgotSubmit(event) {
    event.preventDefault();
    clearAllErrors("forgotForm");

    const email = document.getElementById("forgotEmail").value.trim();
    const captchaInput = document.getElementById("forgotCaptchaInput").value.trim();
    let valid = true;

    if (!email || !isValidEmail(email)) {
        showError("forgotEmailErr");
        document.getElementById("forgotEmail").classList.add("error");
        valid = false;
    }
    if (!captchaInput) {
        showError("forgotCaptchaErr", "Please enter the captcha code");
        valid = false;
    } else if (captchaInput !== captchas.forgot) {
        showError("forgotCaptchaErr", "Captcha does not match.");
        generateCaptcha("forgot");
        valid = false;
    }

    if (!valid) {
        shakeForm("forgotForm");
        return;
    }

    try {
        await apiFetch("/api/auth/forgot-password", {
            method: "POST",
            body: { email },
        });
        showToast("If the email is registered, a reset link has been generated.");
        generateCaptcha("forgot");
        event.target.reset();
    } catch (error) {
        showToast(error.message || "Unable to process request");
        shakeForm("forgotForm");
    }
}

async function handleOpportunitySubmit(event) {
    event.preventDefault();

    const payload = {
        name: document.getElementById("oppName").value.trim(),
        duration: document.getElementById("oppDuration").value.trim(),
        start_date: document.getElementById("oppStartDate").value,
        description: document.getElementById("oppDescription").value.trim(),
        skills: document
            .getElementById("oppSkills")
            .value.split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        category: document.getElementById("oppCategory").value,
        future_opportunities: document.getElementById("oppFuture").value.trim(),
        max_applicants: document.getElementById("oppMaxApplicants").value.trim(),
    };

    if (
        !payload.name ||
        !payload.duration ||
        !payload.start_date ||
        !payload.description ||
        !payload.skills.length ||
        !payload.category ||
        !payload.future_opportunities
    ) {
        showToast("Please fill all required fields");
        return;
    }

    if (payload.max_applicants === "") {
        payload.max_applicants = null;
    }

    const isEditing = Boolean(appState.editingOpportunityId);
    const endpoint = isEditing ? `/api/opportunities/${appState.editingOpportunityId}` : "/api/opportunities";
    const method = isEditing ? "PUT" : "POST";

    try {
        const data = await apiFetch(endpoint, { method, body: payload });
        const savedOpportunity = data.opportunity;

        if (isEditing) {
            appState.opportunities = appState.opportunities.map((item) =>
                item.id === savedOpportunity.id ? savedOpportunity : item
            );
            showToast("Opportunity updated successfully!");
        } else {
            appState.opportunities.unshift(savedOpportunity);
            showToast("Opportunity created successfully!");
        }

        renderOpportunities();
        closeOpportunityModal();
    } catch (error) {
        showToast(error.message || "Unable to save opportunity");
    }
}

function bindFormHandlers() {
    document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
    document.getElementById("signupForm").addEventListener("submit", handleSignupSubmit);
    document.getElementById("forgotForm").addEventListener("submit", handleForgotSubmit);
    document.getElementById("opportunityForm").addEventListener("submit", handleOpportunitySubmit);

    document.getElementById("quickAddForm").addEventListener("submit", (event) => {
        event.preventDefault();
        showToast("Student added successfully! Email invitation sent.");
        closeQuickAddModal();
        event.target.reset();
    });

    document.getElementById("bulkUploadForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const fileInput = document.getElementById("csvFileInput");
        if (!fileInput.files.length) {
            showToast("Please select a CSV file");
            return;
        }
        showToast("Students uploaded successfully! Email invitations sent.");
        closeBulkUploadModal();
        event.target.reset();
        document.getElementById("fileName").textContent = "";
    });

    document.getElementById("quickAddVerifierForm").addEventListener("submit", (event) => {
        event.preventDefault();
        showToast("Verifier added successfully! Email invitation sent.");
        closeQuickAddVerifierModal();
        event.target.reset();
    });

    document.getElementById("bulkUploadVerifierForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const fileInput = document.getElementById("csvVerifierFileInput");
        if (!fileInput.files.length) {
            showToast("Please select a CSV file");
            return;
        }
        showToast("Verifiers uploaded successfully! Email invitations sent.");
        closeBulkUploadVerifierModal();
        event.target.reset();
        document.getElementById("verifierFileName").textContent = "";
    });
}

function bindGlobalHandlers() {
    document.querySelectorAll("input, textarea, select").forEach((field) => {
        field.addEventListener("input", function () {
            this.classList.remove("error");
            const error = this.closest(".form-group")?.querySelector(".error-msg");
            if (error) error.classList.remove("show");
        });
    });

    document.addEventListener("click", (event) => {
        const dropdown = document.getElementById("notificationDropdown");
        const notifButton = document.getElementById("notifBtn");
        if (dropdown && notifButton && !dropdown.contains(event.target) && !notifButton.contains(event.target)) {
            dropdown.classList.remove("active");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSearch();
            closeCourseModal();
            closeOpportunityModal();
            closeOpportunityDetailsModal();
            closeCollaboratorCoursesModal();
            closeQuickAddModal();
            closeBulkUploadModal();
            closeQuickAddVerifierModal();
            closeBulkUploadVerifierModal();
            closeVerifierDetailsModal();
        }
    });

    document.getElementById("searchContainer").addEventListener("click", function (event) {
        if (event.target === this) closeSearch();
    });

    [
        ["courseModal", closeCourseModal],
        ["opportunityDetailsModal", closeOpportunityDetailsModal],
        ["collaboratorCoursesModal", closeCollaboratorCoursesModal],
        ["opportunityModal", closeOpportunityModal],
        ["quickAddModal", closeQuickAddModal],
        ["bulkUploadModal", closeBulkUploadModal],
        ["quickAddVerifierModal", closeQuickAddVerifierModal],
        ["bulkUploadVerifierModal", closeBulkUploadVerifierModal],
        ["verifierDetailsModal", closeVerifierDetailsModal],
    ].forEach(([id, closeHandler]) => {
        document.getElementById(id).addEventListener("click", function (event) {
            if (event.target === this) closeHandler();
        });
    });

    window.addEventListener("resize", () => {
        const toggle = document.getElementById("menuToggle");
        if (toggle) toggle.style.display = window.innerWidth <= 768 ? "flex" : "none";
    });
}

function init() {
    generateCaptcha("login");
    generateCaptcha("signup");
    generateCaptcha("forgot");
    bindNavigation();
    bindFormHandlers();
    bindGlobalHandlers();
    syncSession();
}

document.addEventListener("DOMContentLoaded", init);
