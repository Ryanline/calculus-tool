const groups = [
  ["sin(", "cos(", "tan(", "log("],
  ["x", "^", "(", ")"],
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "pi", "+"],
];

export function Keyboard({ onInsert, onBackspace, onClear, onSubmit, onClose }) {
  return (
    <section className="keyboard">
      <div className="keyboard-header">
        <span>functions</span>
        <button type="button" className="close-button" onClick={onClose}>
          close
        </button>
      </div>

      {groups.map((group, index) => (
        <div className="keyboard-row" key={index}>
          {group.map((token) => (
            <button
              type="button"
              key={token}
              className="key-button"
              onClick={() => onInsert(token)}
            >
              {token}
            </button>
          ))}
        </div>
      ))}

      <div className="keyboard-row keyboard-actions">
        <button type="button" className="key-button" onClick={onBackspace}>
          back
        </button>
        <button type="button" className="key-button" onClick={onClear}>
          clear
        </button>
        <button type="button" className="key-button solve-key" onClick={onSubmit}>
          solve
        </button>
      </div>
    </section>
  );
}
