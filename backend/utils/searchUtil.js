/**
 * Utility for normalizing and expanding policy search keywords.
 */

const SYNONYMS = {
    'pf': ['provident fund', 'epf', 'deduction'],
    'provident fund': ['pf', 'epf'],
    'gratuity': ['grtuity', 'retirement benefits'],
    'grtuity': ['gratuity'],
    'bond': ['trainee bond', 'bond agreement', 'service agreement'],
    'notice': ['notice period', 'resignation', 'separation'],
    'separation': ['resignation', 'notice period'],
    'insurance': ['coverage', 'sum insured', 'health insurance', 'medical'],
    'coverage': ['sum insured', 'insurance amount'],
    'late': ['late coming', 'late entry', 'attendance'],
    'absent': ['attendance', 'leave'],
    'permission': ['permission policy', 'short leave'],
    'pl': ['privilege leave', 'earned leave', 'el'],
    'el': ['privilege leave', 'earned leave', 'pl'],
    'privilege': ['pl', 'el', 'earned leave'],
    'wfh': ['work from home', 'remote'],
};

/**
 * Normalizes a query string and returns an array of relevant keywords and synonyms.
 */
function normalizeAndExpandKeywords(query) {
    if (!query) return [];

    // 1. Basic normalization
    let normalized = query.toLowerCase()
        .replace(/[&\-_]/g, ' ') // Replace symbols with spaces
        .replace(/\s+/g, ' ')    // Collapse spaces
        .trim();

    // 2. Split into individual words
    const words = normalized.split(' ');
    const results = new Set([normalized, ...words]);

    // 3. Add synonyms for each word and for the whole phrase
    words.forEach(word => {
        if (SYNONYMS[word]) {
            SYNONYMS[word].forEach(s => results.add(s));
        }
    });

    if (SYNONYMS[normalized]) {
        SYNONYMS[normalized].forEach(s => results.add(s));
    }

    // 4. Handle specific combinations (e.g., "pf & gratuity")
    if (normalized.includes('pf') && normalized.includes('gratuity')) {
        results.add('provident fund');
    }

    return Array.from(results).filter(k => k.length > 1);
}

module.exports = {
    normalizeAndExpandKeywords
};
