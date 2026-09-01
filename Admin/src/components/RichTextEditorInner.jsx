import { memo, useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  GeneralHtmlSupport,
  Heading,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  Paragraph,
  Underline,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const EDITOR_CONFIG = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    List,
    Link,
    BlockQuote,
    Indent,
    IndentBlock,
    Autoformat,
    Undo,
    GeneralHtmlSupport,
  ],
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "|",
    "bulletedList",
    "numberedList",
    "outdent",
    "indent",
    "|",
    "link",
    "blockQuote",
  ],
  heading: {
    options: [
      { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
    ],
  },
  htmlSupport: {
    allow: [
      {
        name: /.*/,
        attributes: true,
        classes: true,
        styles: true,
      },
    ],
  },
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: "https://",
  },
};

function RichTextEditorInner({
  value = "",
  onChange,
  disabled = false,
  compact = false,
  placeholder = "Write the section copy…",
}) {
  const initialDataRef = useRef(String(value || ""));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <div className={`ua-cfg-ckeditor${compact ? " is-compact" : ""}${disabled ? " is-disabled" : ""}`}>
      <CKEditor
        editor={ClassicEditor}
        data={initialDataRef.current}
        disabled={disabled}
        config={{
          ...EDITOR_CONFIG,
          placeholder,
        }}
        onChange={(_event, editor) => {
          onChangeRef.current?.(editor.getData());
        }}
      />
    </div>
  );
}

export default memo(RichTextEditorInner, (prev, next) => (
  prev.disabled === next.disabled
  && prev.compact === next.compact
  && prev.placeholder === next.placeholder
));
