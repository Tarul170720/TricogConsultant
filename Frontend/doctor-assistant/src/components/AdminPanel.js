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
  const [expanded, setExpanded] = useState(null); // 0 to 3 for each card expanded

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
      alert("Rule deleted!");
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
      alert("Escalation Rule added!");
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
      alert("Escalation deleted!");
    } catch (err) {
      console.error("Failed to delete escalation", err);
    }
  };

  // Helper to toggle card open/close
  const toggleExpanded = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  return (
    <div className="container my-4" style={{ maxWidth: "900px" }}>
      {/* Card 0: Add New Symptom Rule */}
      <div className="card mb-4 shadow-sm hover-shadow-lg">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => toggleExpanded(0)}
        >
          <h5 className="mb-0">
            <span class="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b32d2d' }}>
              add
            </span>
            Add New Symptom Rule</h5>
          <span style={{ fontSize: "1.2em" }}>
            {expanded === 0 ?
              <span class="material-symbols-outlined">
                keyboard_arrow_down
              </span>
              :
              <span class="material-symbols-outlined">
                keyboard_arrow_up
              </span>}
          </span>
        </div>
        {expanded === 0 && (
          <div className="card-body">
            <input
              className="form-control mb-3"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              placeholder="Symptom name (e.g. headache)"
            />
            <textarea
              className="form-control mb-3"
              value={newQuestions}
              onChange={(e) => setNewQuestions(e.target.value)}
              placeholder="Enter follow-up questions (one per line)"
              rows={5}
            />
            <button className="btn btn-primary" onClick={handleAddRule} style={{ backgroundColor: '#173463' }}>
              Add Rule
            </button>
          </div>
        )}
      </div>

      {/* Card 1: Existing Rules */}
      <div className="card mb-4 shadow-sm hover-shadow-lg">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => toggleExpanded(1)}
        >
          <h5 className="mb-0">
            <span class="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b32d2d' }}>
              list
            </span>
            Existing Rules</h5>
          <span style={{ fontSize: "1.2em" }}>
            {expanded === 0 ?
              <span class="material-symbols-outlined">
                keyboard_arrow_down
              </span>
              :
              <span class="material-symbols-outlined">
                keyboard_arrow_up
              </span>}
          </span>
        </div>
        {expanded === 1 && (
          <div className="card-body">
            {rules.length === 0 && <p>No rules added yet.</p>}
            <div className="list-group">
              {rules.map((r, i) => (
                <div key={r.id} className="list-group-item mb-2 rounded">
                  <div
                    className="d-flex justify-content-between align-items-center"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setExpanded(
                        expanded === `rule-${i}` ? null : `rule-${i}`
                      )
                    }
                  >
                    <span className="badge-pill badge-info badge-dark fs-6">{r.symptom}</span>
                    <span style={{ fontSize: "1.2em" }}>
                      {expanded === `rule-${i}` ?
                        <span class="material-symbols-outlined">
                          keyboard_arrow_down
                        </span>
                        :
                        <span class="material-symbols-outlined">
                          keyboard_arrow_up
                        </span>}
                    </span>
                  </div>
                  {expanded === `rule-${i}` && (
                    <>
                      <ul className="mt-3 ps-3">
                        {r.questions.map((q, j) => (
                          <li key={j} className="mb-1">
                            {q}
                          </li>
                        ))}
                      </ul>
                      <button
                        className="btn btn-sm mt-2" style={{ backgroundColor: '#b32d2d', color: '#fff' }}
                        onClick={() => handleDeleteRule(r.id)}
                      >
                        Delete Rule
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Add Escalation Rule (button + modal) */}
      <div className="card mb-4 shadow-sm hover-shadow-lg">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => toggleExpanded(2)}
        >
          <h5 className="mb-0">
            <span class="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b32d2d' }}>
              pulse_alert
            </span>
            Escalation Rules</h5>
          <span style={{ fontSize: "1.2em" }}>
            {expanded === 2 ?
              <span class="material-symbols-outlined">
                keyboard_arrow_down
              </span> :
              <span class="material-symbols-outlined">
                keyboard_arrow_up
              </span>}
          </span>
        </div>
        {expanded === 2 && (
          <div className="card-body">
            <button
              className="btn btn-success"
              onClick={() => setShowEscalationForm(true)}
              style={{ backgroundColor: '#173463' }}
            >
              Add Escalation Rule
            </button>
          </div>
        )}
      </div>

      {/* Card 3: Existing Escalations */}
      <div className="card mb-4">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => toggleExpanded(3)}
        >
          <h5 className="mb-0">
            <span class="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b32d2d' }}>
              data_alert
            </span>
            Existing Escalations</h5>
          <span style={{ fontSize: "1.2em" }}>
            {expanded === 3 ?
              <span class="material-symbols-outlined">
                keyboard_arrow_down
              </span> :
              <span class="material-symbols-outlined">
                keyboard_arrow_up
              </span>}
          </span>
        </div>
        {expanded === 3 && (
          <div className="card-body">
            {escalations.length === 0 && <p>No escalations added yet.</p>}
            <div className="row g-3">
              {escalations.map((e) => (
                <div key={e.id} className="col-md-6">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <span className="badge-pill badge-info badge-dark mb-2">
                        {e.symptom_key}
                      </span>
                      <div className="mb-2 text-secondary">
                        <strong>If Q matches:</strong>{" "}
                        <code>{e.question_pattern}</code>
                      </div>
                      <div className="mb-2 text-secondary">
                        <strong>and Answer in:</strong>{" "}
                        [{e.trigger_values.join(", ")}]
                      </div>
                      <div className="mb-3">
                        <strong>Escalate to:</strong>{" "}
                        <UrgencyBadge urgency={e.new_urgency} />
                      </div>
                      <button
                        className="btn btn-sm" style={{ backgroundColor: '#b32d2d', color: '#fff' }}
                        onClick={() => handleDeleteEscalation(e.id)}
                      >
                        Delete Escalation
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Escalation Modal */}
      {showEscalationForm && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="modal-dialog"
            role="document"
            style={{ maxWidth: "400px" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"> Add Escalation Rule</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowEscalationForm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <select
                  className="form-select mb-3"
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
                  type="text"
                  className="form-control mb-3"
                  value={form.question_pattern}
                  onChange={(e) =>
                    setForm({ ...form, question_pattern: e.target.value })
                  }
                  placeholder="Question pattern (regex)"
                />
                <input
                  type="text"
                  className="form-control mb-3"
                  value={form.trigger_values}
                  onChange={(e) =>
                    setForm({ ...form, trigger_values: e.target.value })
                  }
                  placeholder="Trigger values (comma separated)"
                />
                <select
                  className="form-select mb-3"
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
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={handleAddEscalation}>
                  Save
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowEscalationForm(false)}
                >
                   Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
