import axios from "axios";

const API_BASE = "http://localhost:8000"; // adjust if your backend runs elsewhere

// ---------------- Symptom Rules ----------------
export const fetchRules = () => axios.get(`${API_BASE}/symptoms`);
export const addRule = (rule) => axios.post(`${API_BASE}/symptoms`, rule);
export const deleteRule = (id) => axios.delete(`${API_BASE}/followup-rules/${id}`);

// ---------------- Escalation Rules ----------------
export const fetchEscalations = () =>
  axios.get(`${API_BASE}/escalations`).then((res) => res.data);
export const addEscalation = (rule) => axios.post(`${API_BASE}/escalations`, rule);
export const deleteEscalation = (id) =>
  axios.delete(`${API_BASE}/escalations/${id}`);