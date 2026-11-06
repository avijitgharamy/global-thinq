import React, { useRef } from "react";
import { clean } from "./cms";
export default function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  const initial = useRef(clean(value));
  function command(cmd, arg) {
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    onChange(clean(ref.current.innerHTML));
  }
  return (
    <div className="rich-editor">
      <div className="rich-tools" role="toolbar" aria-label="Text formatting">
        {[
          ["bold", "Bold"],
          ["italic", "Italic"],
          ["insertUnorderedList", "List"],
          ["insertOrderedList", "Numbered list"],
          ["removeFormat", "Clear formatting"],
        ].map(([cmd, label]) => (
          <button
            type="button"
            key={cmd}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(cmd)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("formatBlock", "h2")}
        >
          Heading
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("formatBlock", "p")}
        >
          Paragraph
        </button>
      </div>
      <div
        className="rich-body"
        ref={ref}
        role="textbox"
        aria-label="Article content"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(clean(e.currentTarget.innerHTML))}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            "insertText",
            false,
            e.clipboardData.getData("text/plain"),
          );
        }}
        dangerouslySetInnerHTML={{ __html: initial.current }}
        onBlur={(e) => onChange(clean(e.currentTarget.innerHTML))}
      />
    </div>
  );
}
