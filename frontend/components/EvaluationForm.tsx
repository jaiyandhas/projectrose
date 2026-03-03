"use client";
import { useState } from "react";
import { Send, ChevronDown } from "lucide-react";

interface EvaluationFormProps {
    onSubmit: (data: {
        question_text: string;
        answer_text: string;
        sample_answer_text?: string;
    }) => void;
    loading: boolean;
}

export default function EvaluationForm({ onSubmit, loading }: EvaluationFormProps) {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [sample, setSample] = useState("");
    const [showSample, setShowSample] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            question_text: question,
            answer_text: answer,
            sample_answer_text: sample || undefined,
        });
    };

    const charCount = answer.length;
    const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Question */}
            <div>
                <label className="label">Question</label>
                <textarea
                    className="input-field"
                    placeholder="e.g. Explain how transformers work in NLP..."
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                    minLength={10}
                />
            </div>

            {/* Answer */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label className="label" style={{ margin: 0 }}>Your Answer</label>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {wordCount} words · {charCount} chars
                    </span>
                </div>
                <textarea
                    className="input-field"
                    placeholder="Write your answer here..."
                    rows={10}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                    minLength={20}
                />
            </div>

            {/* Optional sample answer */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowSample(!showSample)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        fontSize: "13px",
                        fontWeight: 500,
                        padding: 0,
                    }}
                >
                    <ChevronDown
                        size={14}
                        style={{
                            transition: "transform 0.25s",
                            transform: showSample ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                    />
                    Add Reference / Sample Answer (optional)
                </button>

                {showSample && (
                    <div className="accordion-open" style={{ marginTop: "12px" }}>
                        <textarea
                            className="input-field"
                            placeholder="Paste a model answer for comparison..."
                            rows={5}
                            value={sample}
                            onChange={(e) => setSample(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Submit */}
            <button
                className="btn-primary"
                type="submit"
                disabled={loading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
                <Send size={16} />
                {loading ? "Evaluating…" : "Evaluate Answer"}
            </button>
        </form>
    );
}
