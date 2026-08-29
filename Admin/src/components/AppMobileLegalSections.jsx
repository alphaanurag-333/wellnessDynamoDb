import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";
import {
  APP_COMMUNITY_GUIDELINES_BLOCKS,
  APP_PRIVACY_POLICY_BLOCKS,
  APP_TERMS_CONDITIONS_BLOCKS,
} from "../data/configDetailData.js";

function AppLegalPageSection({
  slug,
  defaultTitle,
  noun,
  fallbackBlocks,
  blocks,
  setBlocks,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  return (
    <LegalSectionsEditor
      slug={slug}
      defaultTitle={defaultTitle}
      sitePath="the IRW app"
      noun={noun}
      fallbackBlocks={fallbackBlocks}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
      registerPublishHandler={registerPublishHandler}
      onLocalChange={onLocalChange}
    />
  );
}

export function AppPrivacyPolicySection(props) {
  return (
    <AppLegalPageSection
      slug="app-privacy-policy"
      defaultTitle="Privacy Policy"
      noun="privacy section"
      fallbackBlocks={APP_PRIVACY_POLICY_BLOCKS}
      {...props}
    />
  );
}

export function AppTermsConditionsSection(props) {
  return (
    <AppLegalPageSection
      slug="app-terms-conditions"
      defaultTitle="Terms & Conditions"
      noun="terms section"
      fallbackBlocks={APP_TERMS_CONDITIONS_BLOCKS}
      {...props}
    />
  );
}

export function AppCommunityGuidelinesMobileSection(props) {
  return (
    <AppLegalPageSection
      slug="app-community-guidelines"
      defaultTitle="Community Guidelines"
      noun="guidelines section"
      fallbackBlocks={APP_COMMUNITY_GUIDELINES_BLOCKS}
      {...props}
    />
  );
}
