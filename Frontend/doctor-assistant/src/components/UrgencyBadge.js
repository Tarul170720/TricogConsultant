export default function UrgencyBadge({ urgency }) {
  const colors = {
    normal: { bg: "#4caf50", text: "white" },
    "semi-urgent": { bg: "#ff9800", text: "white" },
    urgent: { bg: "#f44336", text: "white" },
    very_urgent: { bg: "#b71c1c", text: "white" },
  };
  const style = colors[urgency] || colors.normal;

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: "2px 8px",
        borderRadius: "8px",
        marginLeft: "8px",
        fontSize: "0.8em",
      }}
    >
      {urgency}
    </span>
  );
}
