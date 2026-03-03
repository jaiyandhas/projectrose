"""
feature_extractor.py — NLP feature extraction for Rose's learning pipeline.

Extracts numeric features from raw answer + question text using spaCy.
These features are stored in `extracted_features` and used as ML training inputs.
"""

import re
import spacy
from typing import Optional

# Load spaCy model once at module level
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Fallback: download at first use
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)
    nlp = spacy.load("en_core_web_sm")

# Technical keyword vocabulary (AI / CS domain)
TECH_KEYWORDS = {
    # Core CS / AI
    "algorithm", "complexity", "big-o", "recursion", "iteration", "pointer",
    "cache", "memory", "stack", "queue", "tree", "graph", "hash", "sort",
    "search", "binary", "dynamic programming", "greedy", "divide and conquer",
    # AI / ML
    "neural network", "deep learning", "machine learning", "gradient", "backpropagation",
    "transformer", "attention", "embedding", "tokenization", "nlp", "convolutional",
    "recurrent", "lstm", "gpt", "bert", "epoch", "batch", "overfitting", "regularization",
    "classification", "regression", "clustering", "feature", "training", "inference",
    # OS / Systems
    "process", "thread", "deadlock", "semaphore", "mutex", "scheduling",
    "paging", "virtual memory", "interrupt", "kernel", "cpu", "io",
    # Networking / DB
    "protocol", "tcp", "http", "database", "query", "index", "join",
    "transaction", "acid", "normalization", "sql", "nosql",
}

EXAMPLE_MARKERS = re.compile(
    r"\b(for example|e\.g\.|for instance|consider|such as|like|to illustrate)\b",
    re.IGNORECASE,
)

LIST_MARKERS = re.compile(
    r"(^\s*[-*•]\s|^\s*\d+\.\s)",
    re.MULTILINE,
)

HEADING_MARKERS = re.compile(
    r"(^#{1,3}\s|\*\*[A-Z][^*]{3,}\*\*)",
    re.MULTILINE,
)

STRUCTURE_CONNECTORS = re.compile(
    r"\b(first(ly)?|second(ly)?|third(ly)?|finally|in conclusion|furthermore|moreover|"
    r"therefore|consequently|however|on the other hand|in summary|to summarize)\b",
    re.IGNORECASE,
)

# ── Layer 2 extensions ─────────────────────────────────────────────────────────

# Citation markers: (1), [1], [Smith 2020], (Smith, 2020)
CITATION_PATTERN = re.compile(
    r"(\[\d+\]|\(\d+\)|\[[\w\s,\.]{3,25}\d{4}\]|\([\w\s]+,\s*\d{4}\))",
)

# Reference section heading
REFERENCE_SECTION_PATTERN = re.compile(
    r"^\s*(references|bibliography|works cited|sources?)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Legal references: "Section 34", "Article 21", "IPC 302", "Act, 1956"
LEGAL_REF_PATTERN = re.compile(
    r"\b(section\s+\d+[A-Za-z]?|article\s+\d+|ipc\s+\d+|act[,\s]+\d{4}|"
    r"clause\s+\d+|rule\s+\d+|order\s+\d+|schedule\s+[IVX\d]+)\b",
    re.IGNORECASE,
)

INTRO_MARKERS = re.compile(
    r"\b(introduction|this essay|this answer|in this (response|write-up|paper)|"
    r"to begin|first of all|this question asks|the question is about)\b",
    re.IGNORECASE,
)

CONCLUSION_MARKERS = re.compile(
    r"\b(in conclusion|to conclude|in summary|to summarize|therefore|thus|"
    r"overall|in closing|finally|in the end|to sum up)\b",
    re.IGNORECASE,
)


def extract_features(answer_text: str, question_text: Optional[str] = None) -> dict:
    """
    Extract rich NLP features from an answer (and optionally the question).

    Returns a dict matching the `extracted_features` table columns.
    """
    doc = nlp(answer_text)

    sentences = list(doc.sents)
    words = [t for t in doc if not t.is_punct and not t.is_space]
    word_count = len(words)
    sentence_count = len(sentences)
    avg_sentence_length = word_count / max(sentence_count, 1)

    # Technical keyword hits (case-insensitive substring in lowercased text)
    lower_text = answer_text.lower()
    tech_hits = sum(1 for kw in TECH_KEYWORDS if kw in lower_text)
    keyword_density = tech_hits / max(word_count, 1) * 100  # per 100 words

    # Structural markers
    has_examples = bool(EXAMPLE_MARKERS.search(answer_text))
    has_lists = bool(LIST_MARKERS.search(answer_text))
    has_headings = bool(HEADING_MARKERS.search(answer_text))
    structure_connectors_count = len(STRUCTURE_CONNECTORS.findall(answer_text))

    # spaCy POS / entity richness
    noun_count = sum(1 for t in doc if t.pos_ == "NOUN")
    verb_count = sum(1 for t in doc if t.pos_ == "VERB")
    entity_count = len(doc.ents)

    # Lexical diversity (type-token ratio)
    unique_words = set(t.lemma_.lower() for t in words)
    lexical_diversity = len(unique_words) / max(word_count, 1)

    # Compound score: rough "structure_score" (0-10)
    structure_score = min(10.0, (
        (2.0 if has_lists else 0.0) +
        (2.0 if has_examples else 0.0) +
        (1.5 if has_headings else 0.0) +
        min(2.0, structure_connectors_count * 0.5) +
        min(2.5, keyword_density * 0.5)
    ))

    # ── Layer 2 extensions ──────────────────────────────────────────────────────

    citation_count = len(CITATION_PATTERN.findall(answer_text))
    has_reference_section = bool(REFERENCE_SECTION_PATTERN.search(answer_text))
    legal_ref_count = len(LEGAL_REF_PATTERN.findall(answer_text))

    # Paragraph count (split on blank lines)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", answer_text) if p.strip()]
    paragraph_count = max(1, len(paragraphs))

    # Intro / conclusion presence (check first 20% and last 20% of text)
    text_len = len(answer_text)
    intro_zone = answer_text[:max(1, text_len // 5)]
    conclusion_zone = answer_text[max(0, text_len - text_len // 5):]
    intro_detected = bool(INTRO_MARKERS.search(intro_zone))
    conclusion_detected = bool(CONCLUSION_MARKERS.search(conclusion_zone))

    # Sub-question keyword overlap (deterministic, no model needed)
    sub_question_keyword_hits = 0
    if question_text:
        q_words = set(question_text.lower().split())
        a_words = set(lower_text.split())
        sub_question_keyword_hits = len(q_words & a_words)

    return {
        # Original features
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_length, 2),
        "tech_keyword_count": tech_hits,
        "keyword_density": round(keyword_density, 4),
        "has_examples": has_examples,
        "has_lists": has_lists,
        "has_headings": has_headings,
        "structure_connectors_count": structure_connectors_count,
        "noun_count": noun_count,
        "verb_count": verb_count,
        "entity_count": entity_count,
        "lexical_diversity": round(lexical_diversity, 4),
        "structure_score": round(structure_score, 2),
        # Layer 2 extensions
        "citation_count": citation_count,
        "has_reference_section": has_reference_section,
        "legal_ref_count": legal_ref_count,
        "paragraph_count": paragraph_count,
        "intro_detected": intro_detected,
        "conclusion_detected": conclusion_detected,
        "sub_question_keyword_hits": sub_question_keyword_hits,
    }
