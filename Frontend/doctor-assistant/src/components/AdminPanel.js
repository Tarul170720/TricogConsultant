import { useState, useEffect } from "react";
import {
  fetchRules,
  addRule,
  deleteRule,
  fetchEscalations,
  addEscalation,
  deleteEscalation,
} from "../services/api";
import UrgencyBadge from "./UrgencyBadge";

export default function AdminPanel({ styles }) {
  const [rules, setRules] = useState([]);
  const [newSymptom, setNewSymptom] = useState("");
  const [newQuestions, setNewQuestions] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [escalations, setEscalations] = useState([]);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [form, setForm] = useState({
    symptom_key: "",
    question_pattern: "",
    trigger_values: "",
    new_urgency: "normal",
  });

  useEffect(() => {
    loadRules();
    loadEscalations();
  }, []);

  const loadRules = async () => {
    try {
      const res = await fetchRules();
      setRules(res.data);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    }
  };

  const loadEscalations = async () => {
    try {
      const data = await fetchEscalations();
      setEscalations(data);
    } catch (err) {
      console.error("Failed to fetch escalations", err);
    }
  };

  const handleAddRule = async () => {
    if (!newSymptom.trim() || !newQuestions.trim()) return;
    try {
      const res = await addRule({
        symptom_key: newSymptom.trim(),
        follow_up_questions: newQuestions
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean),
      });
      setRules((prev) => [...prev, res.data]);
      setNewSymptom("");
      setNewQuestions("");
      alert("✅ Rule added!");
    } catch (err) {
      console.error("Failed to add rule", err);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      alert("🗑️ Rule deleted!");
    } catch (err) {
      console.error("Failed to delete rule", err);
    }
  };

  const handleAddEscalation = async () => {
    if (!form.symptom_key || !form.question_pattern || !form.trigger_values)
      return;
    try {
      const res = await addEscalation({
        ...form,
        trigger_values: form.trigger_values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      setEscalations((prev) => [...prev, res.data]);
      setForm({
        symptom_key: "",
        question_pattern: "",
        trigger_values: "",
        new_urgency: "normal",
      });
      setShowEscalationForm(false); // close modal
      alert("✅ Escalation Rule added!");
    } catch (err) {
      console.error("Failed to add escalation", err);
    }
  };

  const handleDeleteEscalation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this escalation?"))
      return;
    try {
      await deleteEscalation(id);
      setEscalations((prev) => prev.filter((e) => e.id !== id));
      alert("🗑️ Escalation deleted!");
    } catch (err) {
      console.error("Failed to delete escalation", err);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Add Rule Section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "40px",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ marginBottom: "15px" }}>⚙️ Add New Symptom Rule</h3>
        <input
          style={{ ...styles.input, marginBottom: "10px" }}
          value={newSymptom}
          onChange={(e) => setNewSymptom(e.target.value)}
          placeholder="Symptom name (e.g. headache)"
        />
        <textarea
          style={{ ...styles.textarea, marginBottom: "10px" }}
          value={newQuestions}
          onChange={(e) => setNewQuestions(e.target.value)}
          placeholder="Enter follow-up questions (one per line)"
          rows={5}
        />
        <button style={styles.button} onClick={handleAddRule}>
          ➕ Add Rule
        </button>
      </div>

      {/* Existing Rules Section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "40px",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ marginBottom: "15px" }}>📋 Existing Rules</h3>
        <div style={{ display: "grid", gap: "16px" }}>
          {rules.map((r, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #eee",
                borderRadius: "8px",
                padding: "14px",
                background: "#f9f9f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span
                  style={{
                    background: "#007bff",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.9em",
                    fontWeight: "bold",
                  }}
                >
                  {r.symptom}
                </span>
                <span style={{ fontSize: "1.2em" }}>
                  {expanded === i ? "▲" : "▼"}
                </span>
              </div>
              {expanded === i && (
                <>
                  <ul style={{ marginTop: "12px", paddingLeft: "20px" }}>
                    {r.questions.map((q, j) => (
                      <li
                        key={j}
                        style={{
                          marginBottom: "6px",
                          color: "#333",
                          listStyleType: "disc",
                        }}
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                  <button
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      marginTop: "10px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleDeleteRule(r.id)}
                  >
                    🗑️ Delete Rule
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "40px",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ marginBottom: "15px" }}>⚠️ Escalation Rules</h3>
        <button
          style={{
            ...styles.button,
            background: "#10b981",
            marginBottom: "20px",
          }}
          onClick={() => setShowEscalationForm(true)}
        >
          ➕ Add Escalation Rule
        </button>

        {/* Existing Escalations */}
        <h3 style={{ marginTop: "20px", marginBottom: "15px" }}>
          📋 Existing Escalations
        </h3>
        <div
          style={{
            display: "grid",
            gap: "20px",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            marginTop: "10px",
          }}
        >
          {escalations.map((e, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "18px",
                background: "linear-gradient(135deg, #ffffff, #f9fafb)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: "#007bff",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  marginBottom: "12px",
                }}
              >
                {e.symptom_key}
              </div>
              <div style={{ marginBottom: "10px", color: "#374151" }}>
                <strong>If Q matches:</strong>{" "}
                <code
                  style={{
                    background: "#f3f4f6",
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {e.question_pattern}
                </code>
              </div>
              <div style={{ marginBottom: "10px", color: "#374151" }}>
                <strong>and Answer in:</strong> [{e.trigger_values.join(", ")}]
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>Escalate to:</strong>{" "}
                <UrgencyBadge urgency={e.new_urgency} />
              </div>
              <button
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  marginTop: "8px",
                  cursor: "pointer",
                }}
                onClick={() => handleDeleteEscalation(e.id)}
              >
                🗑️ Delete Escalation
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalationForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>➕ Add Escalation Rule</h3>
            <select
              style={{ ...styles.input, marginBottom: "10px" }}
              value={form.symptom_key}
              onChange={(e) =>
                setForm({ ...form, symptom_key: e.target.value })
              }
            >
              <option value="">-- Select Symptom --</option>
              {rules.map((r, i) => (
                <option key={i} value={r.symptom}>
                  {r.symptom}
                </option>
              ))}
            </select>
            <input
              style={{ ...styles.input, marginBottom: "10px" }}
              value={form.question_pattern}
              onChange={(e) =>
                setForm({ ...form, question_pattern: e.target.value })
              }
              placeholder="Question pattern (regex)"
            />
            <input
              style={{ ...styles.input, marginBottom: "10px" }}
              value={form.trigger_values}
              onChange={(e) =>
                setForm({ ...form, trigger_values: e.target.value })
              }
              placeholder="Trigger values (comma separated)"
            />
            <select
              style={{ ...styles.input, marginBottom: "15px" }}
              value={form.new_urgency}
              onChange={(e) =>
                setForm({ ...form, new_urgency: e.target.value })
              }
            >
              <option value="normal">Normal</option>
              <option value="semi-urgent">Semi-Urgent</option>
              <option value="urgent">Urgent</option>
              <option value="very_urgent">Very Urgent</option>
              <option value="high">High</option>
            </select>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={styles.button} onClick={handleAddEscalation}>
                ✅ Save
              </button>
              <button
                style={{
                  ...styles.button,
                  background: "#ef4444",
                }}
                onClick={() => setShowEscalationForm(false)}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
