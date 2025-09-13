import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:8000"); // FastAPI backend WebSocket

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null); // track which question is being asked

  useEffect(() => {
    socket.on("bot_message", (data) => {
      const text = typeof data === "object" ? data.msg : data;
      setMessages((prev) => [...prev, { sender: "bot", text }]);
    });

    socket.on("ask_question", (data) => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.question },
      ]);
      setCurrentQuestion(data); // save {symptom, question, questionIndex}
    });

    return () => {
      socket.off("bot_message");
      socket.off("ask_question");
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg = { sender: "patient", text: input };
    setMessages((prev) => [...prev, msg]);

    if (!currentQuestion) {
      // No active follow-up → assume this is starting consultation (name/email/symptoms)
      if (messages.length === 0) {
        // first message = name
        socket.emit("start_consult", { name: input, email: `${input}@test.com` });
      } else {
        // symptoms
        socket.emit("patient_symptoms", { symptoms_text: input });
      }
    } else {
      // Answering a follow-up question
      socket.emit("answer_question", {
        symptom: currentQuestion.symptom,
        questionIndex: currentQuestion.questionIndex,
        answerText: input,
      });
      setCurrentQuestion(null); // reset until next question arrives
    }

    setInput("");
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get("http://localhost:8000/patients");
      console.log("Patients:", res.data);
      alert("Patients fetched. Check console.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Doctor’s AI Assistant</h2>
      <div style={styles.chatBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "patient" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "patient" ? "#DCF8C6" : "#E5E5EA",
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div style={styles.inputContainer}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button style={styles.button} onClick={sendMessage}>
          Send
        </button>
      </div>

      <button style={styles.fetchButton} onClick={fetchPatients}>
        Fetch Patients (REST API)
      </button>
    </div>
  );
}

const styles = {
  container: {
    width: "400px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "white",
    fontFamily: "Arial, sans-serif",
  },
  chatBox: {
    height: "400px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "10px",
    marginBottom: "10px",
  },
  message: {
    maxWidth: "70%",
    padding: "10px",
    borderRadius: "10px",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#007BFF",
    color: "white",
    cursor: "pointer",
  },
  fetchButton: {
    marginTop: "15px",
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};

export default App;
