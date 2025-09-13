import { useState, useEffect } from "react";
import { socket } from "../services/socket";
import Chat from "./Chat";
import styles from "../styles";

function PageWrapper() {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [stage, setStage] = useState("name");

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
      <h2 style={{ textAlign: "center", }}>
        <span class="material-symbols-outlined" style={{ color: '#b32d2d', fontSize: '2.5rem', verticalAlign: 'middle', marginRight: '10px' }}>
          cardiology
        </span>
        Cardio Consult
        </h2>
      <Chat
        messages={messages}
        setMessages={setMessages}
        stage={stage}
        setStage={setStage}
        currentQuestion={currentQuestion}
        setCurrentQuestion={setCurrentQuestion}
        styles={styles}
      />
    </div>
  );
}

export default PageWrapper;
