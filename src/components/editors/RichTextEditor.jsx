import React, { useMemo } from "react";
import ReactQuill from "react-quill";

export default function RichTextEditor({ value, onChange, className = "", toolbarId }) {
  // Wenn toolbarId gesetzt ist, nutzt Quill dieses Toolbar-Element
  const modules = useMemo(() => {
    const defaultToolbar = [
      [{ font: [] }, { size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline"],
      [{ color: [] }],
      [{ align: [] }],
      ["clean"]
    ];
    return {
      toolbar: toolbarId ? { container: `#${toolbarId}` } : defaultToolbar
    };
  }, [toolbarId]);

  const formats = [
    "font", "size",
    "bold", "italic", "underline",
    "color", "background", "align",
    "list", "indent",
    "link", "image"
  ];

  return (
    <div className={className}>
      {/* Lade Schreibschrift-Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
      .ql-container.ql-snow{ border: 1px solid rgba(229,231,235,1); border-radius: 8px; }
      .ql-toolbar.ql-snow{ border: 1px solid rgba(229,231,235,1); border-radius: 10px; margin-bottom: 8px; }
      `}</style>

      {/* Mapping für Custom-Font und andere Fonts */}
      <style>{`
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Dancing"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Dancing"]::before {
          content: 'Schreibschrift';
          font-family: 'Dancing Script', cursive;
        }
        .ql-font-Dancing { font-family: 'Dancing Script', cursive; }
        .ql-font-serif { font-family: 'Times New Roman', 'Liberation Serif', serif; }
        .ql-font-sans-serif { font-family: 'Arial', 'Helvetica', sans-serif; }
        .ql-font-monospace { font-family: 'Courier New', monospace; }
      `}</style>

      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="bg-white text-black"
      />
    </div>
  );
}