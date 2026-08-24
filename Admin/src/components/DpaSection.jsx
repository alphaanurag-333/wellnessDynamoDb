import { APP_DPA_BLOCKS } from "../data/configDetailData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function DpaSection({ blocks, setBlocks, onToast, registerPublishHandler, onLocalChange }) {
  return (
    <LegalSectionsEditor
      slug="app-dpa"
      defaultTitle="Data Processing Agreement"
      sitePath="the IRW app"
      noun="DPA section"
      fallbackBlocks={APP_DPA_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
      registerPublishHandler={registerPublishHandler}
      onLocalChange={onLocalChange}
    />
  );
}
