import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlock from "@tiptap/extension-code-block";

const SuperEditor = ({ value, setValue, style, className }) => {
  //  UI STATE (ONLY FOR BUTTON ON/OFF COLOR)
  const [activeButtons, setActiveButtons] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlock,
    ],
    content: value || "<p></p>",
    onUpdate({ editor }) {
      setValue(editor.getHTML());
    },
  });

  // useEditor only seeds `content` once, at creation — it never re-syncs on
  // its own when `value` changes later (e.g. a draft's content arriving
  // async after the editor has already mounted empty). Push external value
  // changes in explicitly, but only when they didn't just come from the
  // editor's own onUpdate (emitUpdate: false), or every keystroke would loop.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const toggleButton = (key, action) => {
    editor.chain().focus()[action]().run();
    setActiveButtons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const insertVar = (text) => {
    editor.chain().focus().insertContent(text).run();
  };

  const addImage = () => {
    const url = prompt("Enter image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const btnClass = (isActive) =>
    `px-2 py-1 border rounded transition text-xs sm:text-sm ${
      isActive
        ? "bg-blue-500 text-white"
        : "bg-white hover:bg-gray-100"
    }`;

  return (
    <div style={style} className={`flex flex-col ${className || ""}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1.5 p-2 border-b bg-gray-50 rounded-t-md shrink-0">
        {/* Bold */}
        <button
          onClick={() => toggleButton("bold", "toggleBold")}
          className={btnClass(activeButtons.bold)}
        >
          <b>B</b>
        </button>

        {/* Italic */}
        <button
          onClick={() => toggleButton("italic", "toggleItalic")}
          className={btnClass(activeButtons.italic)}
        >
          <i>I</i>
        </button>

        {/* Underline */}
        <button
          onClick={() => toggleButton("underline", "toggleUnderline")}
          className={btnClass(activeButtons.underline)}
        >
          <u>U</u>
        </button>

        {/* Strike */}
        <button
          onClick={() => toggleButton("strike", "toggleStrike")}
          className={btnClass(activeButtons.strike)}
        >
          <s>S</s>
        </button>

        {/* H1 */}
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={btnClass(editor.isActive("heading", { level: 1 }))}
        >
          H1
        </button>

        {/* H2 */}
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btnClass(editor.isActive("heading", { level: 2 }))}
        >
          H2
        </button>

        {/* UL */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive("bulletList"))}
        >
          UL
        </button>

        {/*  OL (ADDED) */}
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive("orderedList"))}
        >
          OL
        </button>

        {/*  HR (ADDED) */}
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnClass(false)}
        >
          HR
        </button>

        {/*  Quote (ADDED) */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive("blockquote"))}
        >
          Quote
        </button>

        {/* Code Block */}
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={btnClass(editor.isActive("codeBlock"))}
        >
          Code
        </button>

        {/* Link */}
        <button
          onClick={() => {
            const url = prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btnClass(editor.isActive("link"))}
        >
          Link
        </button>

        {/* Image */}
        <button onClick={addImage} className={btnClass(false)}>
          Image
        </button>

        {/* Variables */}
        <button
          onClick={() => insertVar("{{App_Name}}")}
          className="px-2 py-1 border rounded bg-blue-500 text-white text-xs sm:text-sm"
        >
          App_Name
        </button>
        <button
          onClick={() => insertVar("{{App_Logo}}")}
          className="px-2 py-1 border rounded bg-blue-500 text-white text-xs sm:text-sm"
        >
          App_Logo
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-b-md">
        <EditorContent
          editor={editor}
          className="p-3 outline-none min-h-full flex flex-col [&_.ProseMirror]:flex-1 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[150px]"
        />
      </div>
    </div>
  );
};

export default SuperEditor;
