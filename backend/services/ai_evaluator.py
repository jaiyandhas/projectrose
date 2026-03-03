import os
import json
import re
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

model = genai.GenerativeModel("gemini-2.0-flash")

EVALUATION_PROMPT = """\
You are an expert academic evaluator. Evaluate the student's answer to the question below.

QUESTION:
{question}

STUDENT ANSWER:
{answer}

{sample_section}

Provide ONLY structured feedback, not numeric scores:
- strengths: 2-4 specific things the answer did well.
- missing_points: 2-4 key concepts or points missing from the answer.
- improvements: 2-4 concrete, actionable suggestions to improve the answer.
- summary: A 2-3 sentence overall assessment.

Return ONLY valid JSON, no markdown, no explanation outside the JSON:
{{
  "feedback": {{
    "strengths": ["..."],
    "missing_points": ["..."],
    "improvements": ["..."],
    "summary": "..."
  }}
}}
"""


def _build_sample_section(sample_answer: Optional[str]) -> str:
    if sample_answer and sample_answer.strip():
        return f"REFERENCE / SAMPLE ANSWER (for comparison):\n{sample_answer}\n"
    return "(No sample answer provided — evaluate based on the question alone.)\n"


def evaluate_answer(
    question: str,
    answer: str,
    sample_answer: Optional[str] = None,
) -> dict:
    """
    Call Gemini to generate qualitative feedback only.

    Numeric scoring is handled exclusively by the local hybrid engine
    (deterministic + ML). LLMs are never used for marks.
    """
    if os.getenv("OFFLINE_MODE", "").strip().lower() in {"1", "true", "yes"}:
        raise RuntimeError("LLM feedback disabled in OFFLINE_MODE")

    prompt = EVALUATION_PROMPT.format(
        question=question,
        answer=answer,
        sample_section=_build_sample_section(sample_answer),
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=1024,
        ),
    )

    raw = response.text.strip()

    # Strip ```json ... ``` fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned invalid JSON: {exc}\nRaw: {raw}")

    feedback = data.get("feedback") or {}
    return {"feedback": feedback}
