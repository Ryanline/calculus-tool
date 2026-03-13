import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { calculateWithMatlab } from "./services/matlabBridge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

function normalizeExpression(input) {
  let expression = input.replace(/\s+/g, "");

  expression = expression.replace(
    /(asin|acos|atan|sqrt|sin|cos|tan|log|exp|abs)x/g,
    "$1(x)",
  );

  expression = expression.replace(/(?<=\d)(?=[A-Za-z(])/g, "*");
  expression = expression.replace(/(?<=\))(?=[A-Za-z0-9(])/g, "*");
  expression = expression.replace(/(?<=pi)(?=[A-Za-z0-9(])/g, "*");
  expression = expression.replace(
    /(?<=x)(?=(?:asin|acos|atan|sqrt|sin|cos|tan|log|exp|abs)\()/g,
    "*",
  );
  expression = expression.replace(/(?<=x)(?=\()/g, "*");
  expression = expression.replace(/(?<=x)(?=\d)/g, "*");

  return expression;
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/calculate", async (req, res) => {
  const expression = normalizeExpression(`${req.body?.expression || ""}`.trim());

  if (!expression) {
    return res.status(400).json({ error: "Enter a function first." });
  }

  try {
    const result = await calculateWithMatlab({
      expression,
      projectRoot: __dirname,
    });

    return res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MATLAB calculation failed.";

    return res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Calculus backend running at http://localhost:${port}`);
});
