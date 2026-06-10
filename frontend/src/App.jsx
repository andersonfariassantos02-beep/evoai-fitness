export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#ffffff",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>
        🏋️ EvoAI Fitness
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: "30px" }}>
        Sistema inteligente de treino, nutrição e evolução física.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        <Card titulo="Peso Atual" valor="76 kg" />
        <Card titulo="Meta" valor="72 kg" />
        <Card titulo="Treino Hoje" valor="Push A" />
        <Card titulo="Calorias" valor="1850 kcal" />
        <Card titulo="Água" valor="2,5 L" />
        <Card titulo="IA Coach" valor="Beba mais 500 ml de água" />
      </div>
    </div>
  );
}

function Card({ titulo, valor }) {
  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      <h3 style={{ color: "#94a3b8", marginBottom: "10px" }}>
        {titulo}
      </h3>

      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        {valor}
      </div>
    </div>
  );
}
