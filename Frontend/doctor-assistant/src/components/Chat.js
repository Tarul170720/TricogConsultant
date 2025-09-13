import { useState } from "react";
import { socket } from "../services/socket";
import MessageList from "./MessageList";

export default function Chat({
  messages,
  setMessages,
  stage,
  setStage,
  currentQuestion,
  setCurrentQuestion,
  styles,
}) {
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: "patient", text: input }]);

    if (currentQuestion) {
      socket.emit("answer_question", {
        symptoms: currentQuestion.symptoms,
        questionIndex: currentQuestion.qIndex,
        questionText: currentQuestion.questionText,
        answerText: input,
      });
      setCurrentQuestion(null);
    } else {
      if (stage === "name") {
        socket.emit("start_consult", { name: input });
      } else if (stage === "email") {
        socket.emit("start_consult", { email: input });
      } else if (stage === "symptoms") {
        socket.emit("patient_symptoms", { symptoms_text: input });
      }
    }

    setInput("");
  };

  return (
    <>
      <div style={styles.chatBox}>
        <MessageList messages={messages} styles={styles} />
      </div>
      <div style={styles.inputContainer}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response..."
        />
        <button style={styles.button} onClick={sendMessage}>
          Send
        </button>
      </div>
    </>
  );
}
