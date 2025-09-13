import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AdminFollowUpRules() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    symptom_key: "",
    question_pattern: "",
    trigger_values: "",
    new_urgency: "urgent",
  });

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    const res = await axios.get("http://localhost:8000/followup-rules");
    setRules(res.data);
  }

  async function addRule(e) {
    e.preventDefault();
    const payload = {
      symptom_key: form.symptom_key,
      question_pattern: form.question_pattern,
      trigger_values: form.trigger_values.split(",").map((v) => v.trim()),
      new_urgency: form.new_urgency,
    };
    await axios.post("http://localhost:8000/followup-rules", payload);
    setForm({ symptom_key: "", question_pattern: "", trigger_values: "", new_urgency: "urgent" });
    fetchRules();
  }

  async function deleteRule(id) {
    await axios.delete(`http://localhost:8000/followup-rules/${id}`);
    fetchRules();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">⚙️ Escalation Rules Admin</h2>

      {/* Add Rule Form */}
      <form onSubmit={addRule} className="bg-gray-100 p-4 rounded mb-6 space-y-3">
        <input
          type="text"
          placeholder="Symptom Key (e.g., chest pain)"
          value={form.symptom_key}
          onChange={(e) => setForm({ ...form, symptom_key: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Question Pattern (regex)"
          value={form.question_pattern}
          onChange={(e) => setForm({ ...form, question_pattern: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Trigger Values (comma separated)"
          value={form.trigger_values}
          onChange={(e) => setForm({ ...form, trigger_values: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
        <select
          value={form.new_urgency}
          onChange={(e) => setForm({ ...form, new_urgency: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="normal">Normal</option>
          <option value="semi-urgent">Semi-Urgent</option>
          <option value="urgent">Urgent</option>
          <option value="very_urgent">Very Urgent</option>
        </select>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Rule
        </button>
      </form>

      {/* Rules Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Symptom</th>
            <th className="p-2 border">Pattern</th>
            <th className="p-2 border">Triggers</th>
            <th className="p-2 border">Urgency</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border">
              <td className="p-2 border">{r.symptom_key}</td>
              <td className="p-2 border">{r.question_pattern}</td>
              <td className="p-2 border">{r.trigger_values.join(", ")}</td>
              <td className="p-2 border font-bold">{r.new_urgency}</td>
              <td className="p-2 border">
                <button
                  onClick={() => deleteRule(r.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
