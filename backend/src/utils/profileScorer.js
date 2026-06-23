/**
 * Profile-Aware ATS Scorer
 * 
 * Ported from Jobsy's `ats_scorer.py` — adapted for CodeArena's Node.js pipeline.
 * 
 * Detects whether a candidate is a Student, Early Career, or Professional,
 * then adjusts scoring weights, flags, and bonus calculations accordingly.
 * This ensures students aren't unfairly penalized for lack of formal experience.
 */

// ── Profile Constants ─────────────────────────────────────────────────────────
const PROFILE_STUDENT      = "student";
const PROFILE_EARLY_CAREER = "early_career";
const PROFILE_PROFESSIONAL = "professional";

// ── Profile-Based Weight Presets (from Jobsy) ─────────────────────────────────
// Keys: technical, soft, tools, format — matching CodeArena's existing weight schema
const PROFILE_WEIGHTS = {
    [PROFILE_STUDENT]: {
        technical: 0.35,
        soft:      0.10,
        tools:     0.20,
        format:    0.35,  // Structure/format matters most for students (education + projects)
    },
    [PROFILE_EARLY_CAREER]: {
        technical: 0.38,
        soft:      0.12,
        tools:     0.25,
        format:    0.25,
    },
    [PROFILE_PROFESSIONAL]: {
        technical: 0.40,
        soft:      0.15,
        tools:     0.25,
        format:    0.20,
    },
};

// ── Experience Extraction Patterns ────────────────────────────────────────────
const EXPERIENCE_PATTERNS = [
    // "5+ years of experience", "3 years experience", "2 yrs"
    /(\d+)\+?\s*(?:years?|yrs?)[\s\w]*(?:experience|exp)/gi,
    // "experience: 4 years"
    /experience\s*(?:of\s+)?(\d+)\+?\s*(?:years?|yrs?)/gi,
    // Resume headers like "2020 - 2024" or "Jan 2021 – Present"
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})\s*[-–—]\s*(?:present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4}))/gi,
];

// Student signal keywords
const STUDENT_KEYWORDS = [
    /\b(?:pursuing|currently\s+pursuing|enrolled|undergraduate|postgraduate|freshman|sophomore|junior\s+year|senior\s+year|semester|cgpa|sgpa|gpa|cumulative\s+gpa)\b/i,
    /\b(?:bachelor'?s?\s+(?:degree|of)|master'?s?\s+(?:degree|of)|b\.?(?:tech|sc|eng|e)|m\.?(?:tech|sc|eng|e)|ph\.?d)\b/i,
    /\b(?:university|college|institute|school\s+of|academy)\b/i,
];

const INTERN_KEYWORDS = /\b(?:intern|internship|trainee|apprentice|co-?op)\b/i;

// ── Quantified Impact Regex (ported from Jobsy's _QUANT_RE) ──────────────────
const QUANT_PATTERNS = [
    { pattern: /(\d+)\s*%/g,                                          label: "percentage" },
    { pattern: /(\d+)\+?\s*(?:users?|clients?|customers?)/gi,         label: "user count" },
    { pattern: /(\d+)\+?\s*(?:requests?|transactions?|queries?)/gi,   label: "request volume" },
    { pattern: /(\d+)\+?\s*(?:endpoints?|modules?|features?|pages?|components?)/gi, label: "scope" },
    { pattern: /(\d+)\+?\s*(?:problems?|questions?|challenges?)/gi,   label: "problem count" },
    { pattern: /(\d+)\s*x\b/gi,                                      label: "multiplier" },
    { pattern: /(\d+)\s*(?:ms|seconds?|hrs?|hours?|minutes?)/gi,      label: "time metric" },
    { pattern: /\$[\d,.]+[kmb]?/gi,                                   label: "monetary" },
    { pattern: /(?:reduced|improved|increased|boosted|cut|saved|grew|accelerated)\s+(?:by\s+)?(\d+)/gi, label: "improvement" },
];

// ── Action Verb Patterns (for student project credit) ─────────────────────────
const ACTION_VERB_RE = /\b(built|building|developed|developing|designed|designing|implemented|implementing|architected|architecting|deployed|deploying|created|creating|integrated|integrating|engineered|engineering|automated|automating|optimized|optimizing|configured|migrated|refactored|launched|published|shipped|tested|debugged|maintained|scaled|containerized|orchestrated|spearheaded|led|managed|directed|founded|co-?founded)\b/gi;


// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Detect candidate profile from resume text and section data.
 * 
 * @param {string} resumeText - Full resume text
 * @param {object} sectionData - Section detection result from LLM (with sections, experienceMonths, seniority)
 * @returns {{ profile: string, experienceMonths: number, signals: string[] }}
 */
function detectProfile(resumeText, sectionData = {}) {
    const lower = resumeText.toLowerCase();
    const signals = [];
    
    // 1. Extract experience duration
    const experienceMonths = sectionData.experienceMonths || extractExperienceMonths(lower);

    // 2. Check for student signals
    const hasStudentKeywords = STUDENT_KEYWORDS.some(re => re.test(lower));
    const hasInternKeywords  = INTERN_KEYWORDS.test(lower);
    const hasEducation       = !!(sectionData.sections?.education?.present);
    const hasProjects        = !!(sectionData.sections?.projects?.present);
    const hasExperience      = !!(sectionData.sections?.experience?.present);

    // Seniority from LLM (if available)
    const seniority = sectionData.seniority || [];

    if (hasStudentKeywords) signals.push("student_keywords_detected");
    if (hasInternKeywords)  signals.push("intern_keywords_detected");
    if (hasEducation)       signals.push("has_education_section");
    if (hasProjects)        signals.push("has_projects_section");

    // 3. Profile decision tree (mirrors Jobsy's _detect_profile)

    // Primary: student keywords + low experience
    if (hasStudentKeywords && experienceMonths < 24) {
        signals.push("profile_student_keywords");
        return { profile: PROFILE_STUDENT, experienceMonths, signals };
    }

    // Legacy: very low exp + education + projects (student without explicit keywords)
    if (experienceMonths < 12 && hasEducation && hasProjects) {
        signals.push("profile_student_classic");
        return { profile: PROFILE_STUDENT, experienceMonths, signals };
    }

    // Pure intern/trainee with <6 months
    if (experienceMonths < 6 && (seniority.includes("intern") || seniority.includes("trainee") || hasInternKeywords)) {
        signals.push("profile_student_intern");
        return { profile: PROFILE_STUDENT, experienceMonths, signals };
    }

    // Early career: some experience but <24 months
    if (experienceMonths < 24) {
        signals.push("profile_early_career");
        return { profile: PROFILE_EARLY_CAREER, experienceMonths, signals };
    }

    // Professional: 24+ months
    signals.push("profile_professional");
    return { profile: PROFILE_PROFESSIONAL, experienceMonths, signals };
}


/**
 * Get adaptive weights by merging profile-based presets with role-based weights.
 * 
 * @param {string} profile - "student" | "early_career" | "professional"
 * @param {object} roleWeights - Existing role-based weights from getRoleWeights()
 * @returns {object} Merged weight object { technical, soft, tools, format }
 */
function getAdaptiveWeights(profile, roleWeights) {
    const profileW = PROFILE_WEIGHTS[profile] || PROFILE_WEIGHTS[PROFILE_PROFESSIONAL];

    // Students: 70% profile-based, 30% role-based (project-heavy weight)
    // Early career: 50/50 blend
    // Professional: 30% profile, 70% role (role specialization matters)
    let profileRatio;
    switch (profile) {
        case PROFILE_STUDENT:      profileRatio = 0.7; break;
        case PROFILE_EARLY_CAREER: profileRatio = 0.5; break;
        default:                   profileRatio = 0.3; break;
    }

    const roleRatio = 1 - profileRatio;
    return {
        technical: profileW.technical * profileRatio + roleWeights.technical * roleRatio,
        soft:      profileW.soft      * profileRatio + roleWeights.soft      * roleRatio,
        tools:     profileW.tools     * profileRatio + roleWeights.tools     * roleRatio,
        format:    profileW.format    * profileRatio + roleWeights.format    * roleRatio,
    };
}


/**
 * Scan resume for quantified impact patterns (numbers, percentages, metrics).
 * Resumes with measurable outcomes score better in real ATS systems.
 * 
 * @param {string} resumeText - Full resume text
 * @returns {{ score: number, patterns: string[], count: number }}
 */
function computeQuantifiedImpact(resumeText) {
    if (!resumeText) return { score: 0, patterns: [], count: 0 };

    const matchedPatterns = [];
    let totalMatches = 0;

    for (const { pattern, label } of QUANT_PATTERNS) {
        // Reset lastIndex for global regexes
        const re = new RegExp(pattern.source, pattern.flags);
        const matches = [...resumeText.matchAll(re)];
        if (matches.length > 0) {
            totalMatches += matches.length;
            // Store up to 3 examples per pattern type
            const examples = matches.slice(0, 3).map(m => m[0].trim());
            matchedPatterns.push(`${label}: ${examples.join(", ")}`);
        }
    }

    // Score: 0-10 scale
    // 0 matches = 0, 1-2 = 3, 3-5 = 5, 6-10 = 7, 11+ = 10
    let score;
    if (totalMatches === 0)       score = 0;
    else if (totalMatches <= 2)   score = 3;
    else if (totalMatches <= 5)   score = 5;
    else if (totalMatches <= 10)  score = 7;
    else                          score = 10;

    return { score, patterns: matchedPatterns, count: totalMatches };
}


/**
 * Detect action verbs in resume text. For students without formal titles,
 * this provides partial credit for demonstrating active development work.
 * 
 * @param {string} resumeText - Full resume text
 * @returns {{ verbs: string[], count: number, hasStrongVerbs: boolean }}
 */
function detectActionVerbs(resumeText) {
    if (!resumeText) return { verbs: [], count: 0, hasStrongVerbs: false };

    const re = new RegExp(ACTION_VERB_RE.source, ACTION_VERB_RE.flags);
    const matches = [...resumeText.matchAll(re)];
    const uniqueVerbs = [...new Set(matches.map(m => m[1].toLowerCase()))];

    return {
        verbs: uniqueVerbs,
        count: uniqueVerbs.length,
        hasStrongVerbs: uniqueVerbs.length >= 5,
    };
}


/**
 * Generate profile-aware audit flags. Students are never flagged for
 * "missing experience". Each flag has a severity and recommendation.
 * 
 * @param {string} resumeText - Full resume text
 * @param {object} sectionData - Section detection result
 * @param {string} profile - Detected profile
 * @param {object} impactResult - Result from computeQuantifiedImpact()
 * @param {object} verbResult - Result from detectActionVerbs()
 * @returns {Array<{ flag: string, severity: string, message: string }>}
 */
function generateFlags(resumeText, sectionData = {}, profile, impactResult = {}, verbResult = {}) {
    const flags = [];
    const sections = sectionData.sections || {};
    const lower = resumeText.toLowerCase();

    const hasExperience = sections.experience?.present;
    const hasProjects   = sections.projects?.present;
    const hasEducation  = sections.education?.present;
    const hasSkills     = sections.skills?.present;

    // ── Universal flags ──────────────────────────────────────────────────
    if (!hasSkills) {
        flags.push({
            flag: "missing_skills",
            severity: "critical",
            message: "No dedicated skills section found. ATS systems rely heavily on keyword matching from a skills section.",
        });
    }

    if (impactResult.count === 0) {
        flags.push({
            flag: "no_quantified_impact",
            severity: "important",
            message: "No quantified metrics found (percentages, user counts, time savings). Adding numbers to bullet points significantly boosts ATS scores.",
        });
    }

    // ── Profile-specific flags ───────────────────────────────────────────
    if (profile === PROFILE_STUDENT) {
        if (!hasExperience && !hasProjects) {
            flags.push({
                flag: "missing_experience_and_projects",
                severity: "critical",
                message: "Neither experience nor projects section found. As a student, at least a projects section is essential.",
            });
        }
        if (!hasEducation) {
            flags.push({
                flag: "missing_education",
                severity: "critical",
                message: "No education section detected. This is essential for student profiles.",
            });
        }
        if (verbResult.count < 3) {
            flags.push({
                flag: "low_action_verbs",
                severity: "important",
                message: "Few action verbs detected in project descriptions. Use verbs like 'built', 'implemented', 'designed' to demonstrate active development work.",
            });
        }
        // Check GPA presence
        if (hasEducation && !/(?:cgpa|cpi|gpa|sgpa|percentage)\s*[:/]?\s*[\d.]+/i.test(resumeText)) {
            flags.push({
                flag: "missing_gpa",
                severity: "nice-to-have",
                message: "No GPA/CGPA found in education section. Including GPA can strengthen a student resume.",
            });
        }
    } else if (profile === PROFILE_EARLY_CAREER) {
        if (!hasExperience && !hasProjects) {
            flags.push({
                flag: "missing_experience_and_projects",
                severity: "critical",
                message: "Neither experience nor projects section found. Include at least internships or personal projects.",
            });
        }
        if (INTERN_KEYWORDS.test(lower) && !hasProjects) {
            flags.push({
                flag: "intern_no_projects",
                severity: "important",
                message: "Intern/trainee experience detected but no projects section. Adding personal projects shows initiative beyond assigned work.",
            });
        }
    } else {
        // PROFESSIONAL
        if (!hasExperience) {
            flags.push({
                flag: "missing_experience",
                severity: "critical",
                message: "No experience section detected. This is critical for professional profiles.",
            });
        }
        if (INTERN_KEYWORDS.test(lower) && !(/\b(?:senior|lead|principal|staff|manager|director|vp|head)\b/i.test(lower))) {
            flags.push({
                flag: "intern_only_profile",
                severity: "important",
                message: "Resume shows intern/trainee titles but no senior roles. This may signal a seniority mismatch if applying for senior positions.",
            });
        }
    }

    return flags;
}


// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Extract approximate experience months from resume text using regex heuristics.
 * This is a fallback when the LLM doesn't provide experienceMonths.
 */
function extractExperienceMonths(text) {
    let maxYears = 0;

    // Check for explicit "X years of experience" patterns
    for (const pattern of EXPERIENCE_PATTERNS.slice(0, 2)) {
        const re = new RegExp(pattern.source, pattern.flags);
        for (const match of text.matchAll(re)) {
            const years = parseInt(match[1], 10);
            if (years > maxYears && years < 50) maxYears = years;
        }
    }

    if (maxYears > 0) return maxYears * 12;

    // Fallback: count date ranges in experience sections
    const dateRangeRe = new RegExp(EXPERIENCE_PATTERNS[2].source, EXPERIENCE_PATTERNS[2].flags);
    let totalMonths = 0;
    const currentYear = new Date().getFullYear();

    for (const match of text.matchAll(dateRangeRe)) {
        const startYear = parseInt(match[1], 10);
        const endYear   = match[2] ? parseInt(match[2], 10) : currentYear;
        if (startYear > 1990 && endYear <= currentYear + 1) {
            totalMonths += (endYear - startYear) * 12;
        }
    }

    return totalMonths;
}


// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
    // Constants
    PROFILE_STUDENT,
    PROFILE_EARLY_CAREER,
    PROFILE_PROFESSIONAL,
    // Public API
    detectProfile,
    getAdaptiveWeights,
    computeQuantifiedImpact,
    detectActionVerbs,
    generateFlags,
    // Internal (exported for testing)
    extractExperienceMonths,
};
