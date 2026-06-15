/**
 * NLP Pipeline — TF-IDF + Cosine Similarity for Resume ↔ JD Matching
 * 
 * Pure Node.js implementation (zero external NLP dependencies).
 * Replaces the need for spaCy/NLTK/FAISS with a lightweight approach.
 */

// ── Stopwords ─────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
    "from","as","is","was","are","were","be","been","being","have","has","had",
    "do","does","did","will","would","shall","should","may","might","must","can",
    "could","am","it","its","i","me","my","we","our","you","your","he","him",
    "his","she","her","they","them","their","this","that","these","those","not",
    "no","nor","so","if","then","than","too","very","just","also","about","up",
    "out","into","over","after","before","between","under","during","through",
    "above","below","each","every","all","both","few","more","most","other",
    "some","such","only","own","same","still","even","again","here","there",
    "when","where","why","how","what","which","who","whom","while","per","via",
    "etc","ie","eg","vs","able","across","along","around","because","been",
    "else","ever","get","got","having","however","including","like","make",
    "making","many","much","need","new","now","one","part","rather","re","see",
    "seem","since","take","thing","though","two","use","used","using","way",
    "well","within","without","work","working","yet","etc","e.g","i.e",
    // Resume-specific noise words
    "responsible","responsibilities","duties","role","job","position","company",
    "team","ensure","assist","support","help","provide","maintain","manage",
    "develop","create","implement","design","build","deliver","strong",
    "experience","years","year","required","preferred","knowledge","skills",
    "ability","excellent","proficient","understanding","familiarity",
]);

// ── Tech/Skill Patterns ──────────────────────────────────────────────────────
// Regex patterns for recognizing common tech skills that shouldn't be split
const COMPOUND_SKILLS = [
    // Languages
    /\b(c\+\+|c#|\.net|f#|visual\s+basic|objective[\s-]c)\b/gi,
    // Frameworks & Libraries
    /\b(node\.?js|next\.?js|nuxt\.?js|vue\.?js|react[\s-]?native|angular\.?js|express\.?js|nest\.?js|spring\s+boot|ruby\s+on\s+rails|asp\.net)\b/gi,
    /\b(machine\s+learning|deep\s+learning|natural\s+language\s+processing|computer\s+vision|data\s+science|data\s+engineering|data\s+analytics)\b/gi,
    // Cloud & DevOps
    /\b(amazon\s+web\s+services|google\s+cloud|azure\s+devops|ci[\s/]cd|dev[\s-]?ops|site\s+reliability|infrastructure\s+as\s+code)\b/gi,
    // Databases
    /\b(no[\s-]?sql|my[\s-]?sql|mongo[\s-]?db|dynamo[\s-]?db|cosmos[\s-]?db|sql\s+server|apache\s+kafka|apache\s+spark)\b/gi,
    // Certifications & Degrees
    /\b(bachelor'?s?\s+degree|master'?s?\s+degree|ph\.?d|mba|aws\s+certified|google\s+certified|pmp|scrum\s+master|six\s+sigma)\b/gi,
    // Soft Skills
    /\b(problem[\s-]solving|critical[\s-]thinking|team[\s-]?work|cross[\s-]functional|self[\s-]motivated|detail[\s-]oriented|time[\s-]management|project[\s-]management)\b/gi,
];

// Single-word tech terms to recognize
const TECH_TERMS = new Set([
    "javascript","typescript","python","java","go","golang","rust","ruby","php",
    "swift","kotlin","scala","perl","haskell","elixir","clojure","dart","lua",
    "react","angular","vue","svelte","ember","backbone","jquery","bootstrap",
    "tailwind","webpack","vite","babel","eslint","prettier","jest","mocha",
    "cypress","playwright","selenium","puppeteer","storybook",
    "node","express","fastify","koa","django","flask","fastapi","spring",
    "rails","laravel","gin","fiber","actix","rocket","phoenix",
    "aws","azure","gcp","docker","kubernetes","k8s","terraform","ansible",
    "jenkins","circleci","github","gitlab","bitbucket","vercel","netlify",
    "heroku","nginx","apache","caddy","traefik",
    "postgresql","postgres","mysql","mariadb","mongodb","redis","elasticsearch",
    "dynamodb","cassandra","couchdb","neo4j","graphql","prisma","sequelize",
    "mongoose","typeorm","knex","drizzle",
    "html","css","sass","scss","less","svg","canvas","webgl","threejs",
    "figma","sketch","adobe","photoshop","illustrator","xd",
    "git","linux","bash","zsh","powershell","vim","vscode",
    "rest","api","grpc","websocket","oauth","jwt","ssl","tls","https",
    "agile","scrum","kanban","jira","confluence","notion","trello","slack",
    "tensorflow","pytorch","keras","scikit","pandas","numpy","scipy",
    "hadoop","spark","airflow","mlflow","tableau","powerbi","looker",
    "solidity","blockchain","web3","ethereum","nft","defi",
    "ios","android","flutter","xamarin","unity","unreal",
    "microservices","serverless","lambda","s3","ec2","ecs","eks","rds",
    "cloudformation","cdk","sam","sqs","sns","eventbridge",
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────
/**
 * Tokenize text into normalized word tokens.
 * Handles compound skills, removes stopwords, and normalizes case.
 */
function tokenize(text) {
    if (!text) return [];
    let processed = text.toLowerCase();
    
    // Extract compound skills first (replace with underscored versions)
    const compounds = [];
    for (const pattern of COMPOUND_SKILLS) {
        processed = processed.replace(pattern, (match) => {
            const normalized = match.trim().replace(/[\s-]+/g, "_").toLowerCase();
            compounds.push(normalized);
            return ` ${normalized} `;
        });
    }

    // Split into words
    const words = processed
        .replace(/[^a-z0-9_+#./-]/g, " ")  // Keep chars relevant to tech terms
        .split(/\s+/)
        .filter(w => w.length > 1)
        .filter(w => !STOPWORDS.has(w));

    return [...new Set([...words, ...compounds])];
}

// ── TF-IDF ────────────────────────────────────────────────────────────────────
/**
 * Compute term frequency for a token array.
 */
function computeTF(tokens) {
    const freq = {};
    const total = tokens.length || 1;
    for (const t of tokens) {
        freq[t] = (freq[t] || 0) + 1;
    }
    // Normalize
    for (const t in freq) {
        freq[t] = freq[t] / total;
    }
    return freq;
}

/**
 * Compute IDF from a corpus of token arrays.
 */
function computeIDF(corpus) {
    const docCount = corpus.length;
    const df = {};
    for (const tokens of corpus) {
        const seen = new Set(tokens);
        for (const t of seen) {
            df[t] = (df[t] || 0) + 1;
        }
    }
    const idf = {};
    for (const t in df) {
        idf[t] = Math.log((docCount + 1) / (df[t] + 1)) + 1; // Smoothed IDF
    }
    return idf;
}

/**
 * Compute TF-IDF vectors for resume and JD.
 * Returns { resumeVec, jdVec, vocabulary }
 */
function computeTFIDF(resumeTokens, jdTokens) {
    const corpus = [resumeTokens, jdTokens];
    const idf = computeIDF(corpus);
    const tfResume = computeTF(resumeTokens);
    const tfJd = computeTF(jdTokens);

    // Build unified vocabulary
    const vocabulary = [...new Set([...Object.keys(tfResume), ...Object.keys(tfJd)])];

    const resumeVec = vocabulary.map(t => (tfResume[t] || 0) * (idf[t] || 0));
    const jdVec = vocabulary.map(t => (tfJd[t] || 0) * (idf[t] || 0));

    return { resumeVec, jdVec, vocabulary };
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────
/**
 * Compute cosine similarity between two vectors (0 to 1).
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── Skill Entity Extraction ──────────────────────────────────────────────────
/**
 * Extract technical skills/entities from text using pattern matching.
 * Returns { technical: [], soft: [], tools: [], qualifications: [] }
 */
function extractSkillEntities(text) {
    if (!text) return { technical: [], soft: [], tools: [], qualifications: [] };
    
    const lower = text.toLowerCase();
    const found = {
        technical: new Set(),
        soft: new Set(),
        tools: new Set(),
        qualifications: new Set(),
    };

    // Extract compound skills
    for (const pattern of COMPOUND_SKILLS) {
        const matches = lower.matchAll(new RegExp(pattern.source, "gi"));
        for (const m of matches) {
            const skill = m[0].trim();
            if (skill.match(/problem|critical|team|cross|self|detail|time|project/i)) {
                found.soft.add(skill);
            } else if (skill.match(/bachelor|master|ph\.?d|mba|certified|pmp|scrum|six/i)) {
                found.qualifications.add(skill);
            } else {
                found.technical.add(skill);
            }
        }
    }

    // Extract single-word tech terms
    const words = lower.split(/[^a-z0-9+#.]+/);
    for (const w of words) {
        if (TECH_TERMS.has(w)) {
            // Classify
            if (["jira", "confluence", "notion", "trello", "slack", "figma", "sketch",
                 "git", "github", "gitlab", "bitbucket", "docker", "kubernetes", "k8s",
                 "jenkins", "circleci", "terraform", "ansible", "webpack", "vite",
                 "jest", "mocha", "cypress", "playwright", "selenium", "puppeteer",
                 "tableau", "powerbi", "looker", "storybook", "eslint", "prettier",
                 "babel", "nginx", "apache", "caddy", "traefik",
                 "vercel", "netlify", "heroku"].includes(w)) {
                found.tools.add(w);
            } else {
                found.technical.add(w);
            }
        }
    }

    return {
        technical: [...found.technical],
        soft: [...found.soft],
        tools: [...found.tools],
        qualifications: [...found.qualifications],
    };
}

// ── Keyword Categorization ───────────────────────────────────────────────────
/**
 * Take a flat array of keywords and categorize them.
 */
function categorizeKeywords(keywords) {
    const result = { technical: [], soft: [], tools: [], qualifications: [] };
    for (const kw of keywords) {
        const lower = kw.toLowerCase();
        if (lower.match(/communication|leadership|teamwork|collaboration|problem.solving|critical.thinking|adaptable|mentor|interpersonal|analytical|creative/)) {
            result.soft.push(kw);
        } else if (lower.match(/bachelor|master|degree|certification|certified|years?\s+experience|ph\.?d|mba|pmp/)) {
            result.qualifications.push(kw);
        } else if (lower.match(/jira|git|docker|kubernetes|jenkins|terraform|figma|tableau|webpack|vite|eslint|nginx/)) {
            result.tools.push(kw);
        } else {
            result.technical.push(kw);
        }
    }
    return result;
}

// ── Compute Fit Score ─────────────────────────────────────────────────────────
/**
 * Orchestrate the full NLP pipeline:
 * 1. Tokenize resume + JD
 * 2. Compute TF-IDF vectors
 * 3. Calculate cosine similarity
 * 4. Extract skill entities from both
 * 5. Match & categorize keywords
 * 6. Return comprehensive scoring
 */
function computeFitScore(resumeText, jdText) {
    // 1. Tokenize
    const resumeTokens = tokenize(resumeText);
    const jdTokens = tokenize(jdText);

    // 2. TF-IDF
    const { resumeVec, jdVec, vocabulary } = computeTFIDF(resumeTokens, jdTokens);

    // 3. Cosine Similarity (0-1 → scale to 0-100)
    const rawSimilarity = cosineSimilarity(resumeVec, jdVec);
    const similarityScore = Math.round(rawSimilarity * 100);

    // 4. Extract skills from both
    const resumeSkills = extractSkillEntities(resumeText);
    const jdSkills = extractSkillEntities(jdText);

    // 5. Match keywords
    const resumeLower = resumeText.toLowerCase();
    const allJdSkills = [
        ...jdSkills.technical,
        ...jdSkills.soft,
        ...jdSkills.tools,
        ...jdSkills.qualifications,
    ];

    const matched = [];
    const missing = [];
    const partial = [];

    for (const skill of allJdSkills) {
        const skillLower = skill.toLowerCase();
        if (resumeLower.includes(skillLower)) {
            matched.push(skill);
        } else {
            // Fuzzy: check if any significant word from the skill appears
            const words = skillLower.split(/[\s-_]+/).filter(w => w.length > 3);
            const anyMatch = words.some(w => resumeLower.includes(w));
            if (anyMatch) {
                partial.push(skill);
            } else {
                missing.push(skill);
            }
        }
    }

    const totalSkills = allJdSkills.length || 1;
    const keywordMatchScore = Math.round(
        ((matched.length + partial.length * 0.5) / totalSkills) * 100
    );

    // 6. Combined weighted score
    // 60% keyword match + 40% TF-IDF similarity
    const fitScore = Math.round(keywordMatchScore * 0.6 + similarityScore * 0.4);

    return {
        fitScore,
        similarityScore,
        keywordMatchScore,
        keywords: {
            matched,
            missing,
            partial,
            total: allJdSkills.length,
            categories: {
                resume: resumeSkills,
                jd: jdSkills,
            },
        },
        tfidf: {
            vocabularySize: vocabulary.length,
            resumeTokenCount: resumeTokens.length,
            jdTokenCount: jdTokens.length,
        },
    };
}

module.exports = {
    tokenize,
    computeTF,
    computeIDF,
    computeTFIDF,
    cosineSimilarity,
    extractSkillEntities,
    categorizeKeywords,
    computeFitScore,
    TECH_TERMS,
    STOPWORDS,
};
