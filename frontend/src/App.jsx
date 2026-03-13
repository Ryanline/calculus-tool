import { useEffect, useMemo, useRef, useState } from "react";
import { GraphPanel } from "./components/GraphPanel";
import { Keyboard } from "./components/Keyboard";

const API_BASE = "http://localhost:4000";

const initialResult = {
  expression: "",
  derivative: "",
  integral: "",
  graphs: {
    integral: [],
    expression: [],
    derivative: [],
  },
};

function tokenizeExpression(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[()+\-*/^,]/.test(char)) {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let value = char;
      index += 1;
      while (index < input.length && /[\d.]/.test(input[index])) {
        value += input[index];
        index += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let value = char;
      index += 1;
      while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) {
        value += input[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value });
      continue;
    }

    return null;
  }

  return tokens;
}

function formatMathExpression(input) {
  if (!input) {
    return "";
  }

  const tokens = tokenizeExpression(input);
  if (!tokens) {
    return input;
  }

  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(type) {
    if (tokens[index]?.type === type) {
      return tokens[index++];
    }
    return null;
  }

  function parseExpression() {
    let node = parseTerm();
    if (!node) {
      return null;
    }

    while (peek()?.type === "+" || peek()?.type === "-") {
      const operator = tokens[index++].type;
      const right = parseTerm();
      if (!right) {
        return null;
      }
      node = { type: "binary", operator, left: node, right };
    }

    return node;
  }

  function parseTerm() {
    let node = parsePower();
    if (!node) {
      return null;
    }

    while (peek()?.type === "*" || peek()?.type === "/") {
      const operator = tokens[index++].type;
      const right = parsePower();
      if (!right) {
        return null;
      }
      node = { type: "binary", operator, left: node, right };
    }

    return node;
  }

  function parsePower() {
    let node = parseUnary();
    if (!node) {
      return null;
    }

    if (peek()?.type === "^") {
      index += 1;
      const right = parsePower();
      if (!right) {
        return null;
      }
      node = { type: "binary", operator: "^", left: node, right };
    }

    return node;
  }

  function parseUnary() {
    if (peek()?.type === "-") {
      index += 1;
      const value = parseUnary();
      if (!value) {
        return null;
      }
      return { type: "unary", operator: "-", value };
    }

    return parsePrimary();
  }

  function parsePrimary() {
    const next = peek();
    if (!next) {
      return null;
    }

    if (next.type === "number") {
      index += 1;
      return { type: "number", value: next.value };
    }

    if (next.type === "identifier") {
      index += 1;
      if (consume("(")) {
        const args = [];
        if (peek()?.type !== ")") {
          while (true) {
            const argument = parseExpression();
            if (!argument) {
              return null;
            }
            args.push(argument);
            if (!consume(",")) {
              break;
            }
          }
        }
        if (!consume(")")) {
          return null;
        }
        return { type: "call", name: next.value, args };
      }
      return { type: "identifier", value: next.value };
    }

    if (consume("(")) {
      const value = parseExpression();
      if (!value || !consume(")")) {
        return null;
      }
      return { type: "group", value };
    }

    return null;
  }

  const tree = parseExpression();
  if (!tree || index !== tokens.length) {
    return input;
  }

  function precedence(node) {
    if (!node) {
      return 99;
    }
    if (node.type === "binary") {
      if (node.operator === "+" || node.operator === "-") {
        return 1;
      }
      if (node.operator === "*" || node.operator === "/") {
        return 2;
      }
      if (node.operator === "^") {
        return 3;
      }
    }
    if (node.type === "unary") {
      return 4;
    }
    return 5;
  }

  function isAtomic(node) {
    return ["number", "identifier", "call"].includes(node.type);
  }

  function wrap(node, text, parentOperator, side) {
    if (node.type === "group") {
      return `(${render(node.value)})`;
    }

    if (parentOperator === "/") {
      return isAtomic(node) ? text : `(${text})`;
    }

    if (parentOperator === "^") {
      if (!isAtomic(node) || (side === "right" && node.type === "binary")) {
        return `(${text})`;
      }
      return text;
    }

    const childPrecedence = precedence(node);
    const parentPrecedence = parentOperator === "+" || parentOperator === "-" ? 1 : 2;

    if (childPrecedence < parentPrecedence) {
      return `(${text})`;
    }

    if (side === "right" && parentOperator === "-" && childPrecedence === parentPrecedence) {
      return `(${text})`;
    }

    return text;
  }

  function render(node) {
    if (node.type === "number" || node.type === "identifier") {
      return node.value;
    }

    if (node.type === "call") {
      return `${node.name}(${node.args.map(render).join(", ")})`;
    }

    if (node.type === "group") {
      return `(${render(node.value)})`;
    }

    if (node.type === "unary") {
      const value = render(node.value);
      return node.value.type === "binary" ? `-(${value})` : `-${value}`;
    }

    const left = wrap(node.left, render(node.left), node.operator, "left");
    const right = wrap(node.right, render(node.right), node.operator, "right");
    return `${left} ${node.operator} ${right}`;
  }

  return render(tree);
}

export default function App() {
  const inputRef = useRef(null);
  const keyboardRef = useRef(null);
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState(initialResult);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const input = inputRef.current;
      const keyboard = keyboardRef.current;

      if (
        input &&
        !input.contains(event.target) &&
        keyboard &&
        !keyboard.contains(event.target)
      ) {
        setIsKeyboardOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cards = useMemo(
    () => [
      {
        key: "derivative",
        label: "derivative",
        expression: formatMathExpression(result.derivative),
        color: "var(--blue)",
        points: result.graphs?.derivative || [],
      },
      {
        key: "expression",
        label: "function",
        expression: formatMathExpression(result.expression),
        color: "var(--ink)",
        points: result.graphs?.expression || [],
      },
      {
        key: "integral",
        label: "integral",
        expression: formatMathExpression(result.integral),
        color: "var(--coral)",
        points: result.graphs?.integral || [],
      },
    ],
    [result],
  );

  const runCalculation = async (nextExpression) => {
    const trimmed = nextExpression.trim();

    if (!trimmed) {
      setStatus("Enter a function first.");
      return;
    }

    setIsLoading(true);
    setStatus("Calculating...");

    try {
      const response = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expression: trimmed }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Calculation failed.");
      }

      setResult(payload);
      setStatus("");
      setIsKeyboardOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Calculation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const insertText = (token) => {
    const input = inputRef.current;

    if (!input) {
      setExpression((current) => current + token);
      return;
    }

    const start = input.selectionStart ?? expression.length;
    const end = input.selectionEnd ?? expression.length;
    const nextValue = expression.slice(0, start) + token + expression.slice(end);

    setExpression(nextValue);

    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + token.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  const handleBackspace = () => {
    const input = inputRef.current;

    if (!input) {
      setExpression((current) => current.slice(0, -1));
      return;
    }

    const start = input.selectionStart ?? expression.length;
    const end = input.selectionEnd ?? expression.length;

    if (start !== end) {
      const nextValue = expression.slice(0, start) + expression.slice(end);
      setExpression(nextValue);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start, start);
      });
      return;
    }

    if (start === 0) {
      return;
    }

    const nextValue = expression.slice(0, start - 1) + expression.slice(end);
    setExpression(nextValue);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start - 1, start - 1);
    });
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1>Calculus tool:</h1>

        <form
          className="input-row"
          onSubmit={(event) => {
            event.preventDefault();
            runCalculation(expression);
          }}
        >
          <input
            ref={inputRef}
            className="expression-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onFocus={() => setIsKeyboardOpen(true)}
            placeholder="enter a function here ..."
            spellCheck="false"
          />
        </form>

        {isKeyboardOpen ? (
          <div ref={keyboardRef} className="keyboard-popover" role="dialog" aria-label="Math keyboard">
            <Keyboard
              onInsert={insertText}
              onBackspace={handleBackspace}
              onClear={() => setExpression("")}
              onSubmit={() => runCalculation(expression)}
              onClose={() => setIsKeyboardOpen(false)}
            />
          </div>
        ) : null}

        <p className="status-line">{isLoading ? "Calculating..." : status}</p>

        <section className="graph-grid">
          {cards.map((card) => (
            <GraphPanel
              key={card.key}
              title={card.label}
              expression={card.expression}
              color={card.color}
              points={card.points}
            />
          ))}
        </section>

        <footer className="footer-note">Created by Ryan Brooks</footer>
      </section>
    </main>
  );
}
