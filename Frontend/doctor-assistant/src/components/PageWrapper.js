import { useState, useEffect } from "react";
import { socket } from "../services/socket";
import Chat from "./Chat";
import AdminPanel from "./AdminPanel";
import styles from "../styles";

function PageWrapper() {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [stage, setStage] = useState("name");
  const [view, setView] = useState("chat");

  useEffect(() => {
    socket.on("bot_message", (data) => {
      setMessages((prev) => [...prev, { sender: "bot", text: data.msg }]);
      const msg = data.msg.toLowerCase();
      if (msg.includes("name")) setStage("name");
      else if (msg.includes("email")) setStage("email");
      else if (msg.includes("symptom")) setStage("symptoms");
    });

    socket.on("ask_question", (data) => {
      const { symptoms, question, text, qIndex } = data;
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: question, symptoms, questionText: text, qIndex },
      ]);
      setCurrentQuestion({ symptoms, qIndex, questionText: text });
      setStage("followups");
    });

    socket.on("stage_update", (data) => {
      setStage(data.stage);
    });

    return () => {
      socket.off("bot_message");
      socket.off("ask_question");
      socket.off("stage_update");
    };
  }, []);

  return (
    <div style={styles.container}>
      <h2>👩‍⚕️ Cardio Consult</h2>
      <div style={styles.tabBar}>
        <button
          style={view === "chat" ? styles.activeTab : styles.tab}
          onClick={() => setView("chat")}
        >
          💬 Chat
        </button>
        <button
          style={view === "admin" ? styles.activeTab : styles.tab}
          onClick={() => setView("admin")}
        >
          ⚙️ Admin
        </button>
      </div>

      {view === "chat" ? (
        <Chat
          messages={messages}
          setMessages={setMessages}
          stage={stage}
          setStage={setStage}
          currentQuestion={currentQuestion}
          setCurrentQuestion={setCurrentQuestion}
          styles={styles}
        />
      ) : (
        <AdminPanel styles={styles} />
      )}
    </div>
  );
}

export default PageWrapper;
