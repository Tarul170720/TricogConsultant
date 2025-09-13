import axios from "axios";

const API_BASE = "http://localhost:8000";

export const fetchRules = () => axios.get(`${API_BASE}/symptoms`);
export const addRule = (data) => axios.post(`${API_BASE}/symptoms`, data);

export const fetchEscalations = async () => {
  const res = await axios.get(`${API_BASE}/escalations`);
  // normalize trigger_values to array
  return res.data.map((e) => ({
    ...e,
    trigger_values: Array.isArray(e.trigger_values)
      ? e.trigger_values
      : (e.trigger_values || "").split(",").map((v) => v.trim()),
  }));
};
export const addEscalation = (data) =>
  axios.post(`${API_BASE}/escalations`, data);
