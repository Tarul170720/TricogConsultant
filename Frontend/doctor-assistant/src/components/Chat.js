import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../services/socket";
import MessageList from "./MessageList";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

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
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  const timerRef = useRef(null);

  // 🗣️ Speak bot messages out loud
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop ongoing speech before new one
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1; // normal speed
    window.speechSynthesis.speak(utterance);
  };

  // ✅ Wrap sendMessage in useCallback so it's stable
  const sendMessage = useCallback(
    (text = input) => {
      if (!text.trim()) return;

      setMessages((prev) => [...prev, { sender: "patient", text }]);

      if (currentQuestion) {
        socket.emit("answer_question", {
          symptoms: currentQuestion.symptoms,
          questionIndex: currentQuestion.qIndex,
          questionText: currentQuestion.questionText,
          answerText: text,
        });
        setCurrentQuestion(null);
      } else {
        if (stage === "name") {
          socket.emit("start_consult", { name: text });
        } else if (stage === "email") {
          socket.emit("start_consult", { email: text });
        } else if (stage === "symptoms") {
          socket.emit("patient_symptoms", { symptoms_text: text });
        }
      }

      setInput("");
      resetTranscript();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [input, setMessages, currentQuestion, stage, setCurrentQuestion, resetTranscript]
  );

  // Whenever transcript changes → update input + reset timer
  useEffect(() => {
    if (transcript) {
      setInput(transcript);

      if (timerRef.current) clearTimeout(timerRef.current);

      // ⏱️ Auto-send after 5s of silence
      timerRef.current = setTimeout(() => {
        if (transcript.trim()) {
          sendMessage(transcript.trim());
        }
      }, 5000);
    }
  }, [transcript, sendMessage]); // ✅ now includes sendMessage

  // 🔊 Speak the latest bot message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === "bot") {
      speak(lastMessage.text);
    }
  }, [messages]);

  if (!browserSupportsSpeechRecognition) {
    return <span>⚠️ Browser does not support speech recognition.</span>;
  }

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
          placeholder="Type or speak your response..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        <span class="material-symbols-outlined">
          <button style={{ ...styles.chatButton, backgroundColor: "#8db48bff", color: "#173463" }} onClick={() => sendMessage()}>
            send
          </button>
        </span>
        <span class="material-symbols-outlined">
          <button
            style={{
              ...styles.chatButton,
              backgroundColor: listening ? "#e85656ff" : "#173463",
            }}
            onClick={() => {
              if (listening) {
                SpeechRecognition.stopListening();
              } else {
                SpeechRecognition.startListening({
                  continuous: true,
                  language: "en-US",
                });
              }
            }}
          >
            {listening ?
              "mic"
              :
              "mic_off"
            }
          </button>
        </span>
        <span class="material-symbols-outlined">
          <button
            style={{ ...styles.chatButton, backgroundColor: "#b32d2d" }}
            onClick={() => window.speechSynthesis.cancel()}
            tooltip="Stop any ongoing speech"
          >
            stop_circle
          </button>
        </span>
      </div >
    </>
  );
}
