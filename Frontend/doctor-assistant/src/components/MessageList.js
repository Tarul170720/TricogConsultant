import UrgencyBadge from "./UrgencyBadge";

export default function MessageList({ messages, styles }) {
  return (
    <>
      {messages.map((msg, i) => {
        if (msg.sender === "bot" && msg.text.startsWith("🩺 Doctor Summary")) {
          return (
            <div key={i} style={styles.summaryCard}>
              {msg.text.split("\n").map((line, j) => {
                if (line.startsWith("---")) {
                  const urgencyMatch = line.match(/\[(.*?)\]$/);
                  const urgency = urgencyMatch ? urgencyMatch[1] : null;
                  return (
                    <div key={j} style={styles.symptomHeader}>
                      {line.replace(/\[.*?\]$/, "").trim()}
                      {urgency && <UrgencyBadge urgency={urgency} />}
                    </div>
                  );
                }
                if (line.startsWith("🧾 Doctor Note:")) {
                  return (
                    <div key={j} style={styles.doctorNote}>
                      {line.replace("🧾 Doctor Note:", "").trim()}
                    </div>
                  );
                }
                return <div key={j}>{line}</div>;
              })}
            </div>
          );
        }

        return (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "patient" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "patient" ? "#DCF8C6" : "#E5E5EA",
            }}
          >
            {msg.symptoms && msg.symptoms.length > 0 ? (
              <strong>[{msg.symptoms.join(", ")}] </strong>
            ) : null}
            {msg.text}
          </div>
        );
      })}
    </>
  );
}
