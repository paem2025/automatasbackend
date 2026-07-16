import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const app = createApp();

app.listen(port, () => {
  // Keep startup log explicit so students can identify service state quickly.
  console.log(`Simulador de Automatas de Red backend escuchando en http://localhost:${port}`);
});
