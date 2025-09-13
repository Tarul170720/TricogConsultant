import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000", // FastAPI backend
});

// Patients
export const createPatient = (data) => API.post("/patients", data);

// Consults
export const createConsult = (data) => API.post("/consults", data);

// Symptoms
export const addSymptom = (consult_id, description) =>
  API.post(`/symptoms?consult_id=${consult_id}`, { description });
