import { useState, useEffect } from "react";
import {
  fetchRules,
  addRule,
  fetchEscalations,
  addEscalation,
} from "../services/api";
import UrgencyBadge from "./UrgencyBadge";

export default function AdminPanel({ styles }) {
  const [rules, setRules] = useState([]);
  const [newSymptom, setNewSymptom] = useState("");
  const [newQuestions, setNewQuestions] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [escalations, setEscalations] = useState([]);
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
      alert("✅ Escalation Rule added!");
    } catch (err) {
      console.error("Failed to add escalation", err);
    }
  };

  return (
    <div style={styles.adminPanel}>
      <h3>⚙️ Add New Symptom Rule</h3>
      <input
        style={styles.input}
        value={newSymptom}
        onChange={(e) => setNewSymptom(e.target.value)}
        placeholder="Symptom name (e.g. headache)"
      />
      <textarea
        style={styles.textarea}
        value={newQuestions}
        onChange={(e) => setNewQuestions(e.target.value)}
        placeholder="Enter follow-up questions (one per line)"
        rows={5}
      />
      <button style={styles.button} onClick={handleAddRule}>
        ➕ Add Rule
      </button>

      <h3 style={{ marginTop: "20px" }}>📋 Existing Rules</h3>
      <div>
        {rules.map((r, i) => (
          <div key={i} style={styles.ruleCard}>
            <div
              style={styles.ruleHeader}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <strong>{r.symptom}</strong>
              <span>{expanded === i ? "▲" : "▼"}</span>
            </div>
            {expanded === i && (
              <ul style={styles.ruleList}>
                {r.questions.map((q, j) => (
                  <li key={j}>{q}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "30px" }}>⚠️ Escalation Rules</h3>
      <select
        style={styles.input}
        value={form.symptom_key}
        onChange={(e) => setForm({ ...form, symptom_key: e.target.value })}
      >
        <option value="">-- Select Symptom --</option>
        {rules.map((r, i) => (
          <option key={i} value={r.symptom}>
            {r.symptom}
          </option>
        ))}
      </select>
      <input
        style={styles.input}
        value={form.question_pattern}
        onChange={(e) =>
          setForm({ ...form, question_pattern: e.target.value })
        }
        placeholder="Question pattern (regex)"
      />
      <input
        style={styles.input}
        value={form.trigger_values}
        onChange={(e) =>
          setForm({ ...form, trigger_values: e.target.value })
        }
        placeholder="Trigger values (comma separated)"
      />
      <select
        style={styles.input}
        value={form.new_urgency}
        onChange={(e) => setForm({ ...form, new_urgency: e.target.value })}
      >
        <option value="normal">Normal</option>
        <option value="semi-urgent">Semi-Urgent</option>
        <option value="urgent">Urgent</option>
        <option value="very_urgent">Very Urgent</option>
      </select>
      <button style={styles.button} onClick={handleAddEscalation}>
        ➕ Add Escalation Rule
      </button>

      <h3 style={{ marginTop: "20px" }}>📋 Existing Escalations</h3>
      <ul>
        {escalations.map((e, i) => (
          <li key={i}>
            {e.symptom_key} → if Q matches "{e.question_pattern}" and answer in [
            {e.trigger_values.join(", ")}], escalate to{" "}
            <UrgencyBadge urgency={e.new_urgency} />
          </li>
        ))}
      </ul>
    </div>
  );
}
