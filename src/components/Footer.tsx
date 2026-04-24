export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 24px",
        textAlign: "center",
        fontSize: "12px",
        color: "rgba(255,255,255,0.4)",
      }}
    >
      <span>
        Powered by{" "}
        <a
          href="https://www.privapaid.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}
        >
          PrivaPaid
        </a>{" "}
        — open-source encrypted content delivery with Bitcoin Lightning payments.
      </span>
    </footer>
  );
}
