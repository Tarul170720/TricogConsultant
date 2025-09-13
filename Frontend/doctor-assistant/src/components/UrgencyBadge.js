export default function UrgencyBadge({ urgency }) {
  const colors = {
    normal: { bg: "#6bde6eff", text: "white" },
    "semi-urgent": { bg: "#e3a445ff", text: "white" },
    urgent: { bg: "#f34c40ff", text: "white" },
    very_urgent: { bg: "#b32d2d", text: "white" },
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
