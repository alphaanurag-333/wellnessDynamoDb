import { lazy, Suspense } from "react";

const RichTextEditorInner = lazy(() => import("./RichTextEditorInner.jsx"));

export function RichTextEditor(props) {
  const compact = Boolean(props?.compact);
  const disabled = Boolean(props?.disabled);

  return (
    <Suspense
      fallback={
        <div className={`ua-cfg-ckeditor${compact ? " is-compact" : ""}${disabled ? " is-disabled" : ""}`} />
      }
    >
      <RichTextEditorInner {...props} />
    </Suspense>
  );
}
