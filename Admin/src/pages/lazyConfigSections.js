import { lazy } from "react";

function named(importer, exportName) {
  return lazy(() => importer().then((mod) => ({ default: mod[exportName] })));
}

export const ConfigPreviewModal = named(
  () => import("../components/ConfigPreviewModal.jsx"),
  "ConfigPreviewModal",
);
export const ConfigPublishModal = named(
  () => import("../components/ConfigPublishModal.jsx"),
  "ConfigPublishModal",
);
export const ProgramSetupModal = named(
  () => import("../components/ProgramSetupModal.jsx"),
  "ProgramSetupModal",
);
export const MeasurementVideoSection = named(
  () => import("../components/MeasurementVideoSection.jsx"),
  "MeasurementVideoSection",
);
export const OnboardingVideoSection = named(
  () => import("../components/OnboardingVideoSection.jsx"),
  "OnboardingVideoSection",
);
export const HealthProgressTrackersPanel = named(
  () => import("../components/ConfigAppRemainingSections.jsx"),
  "HealthProgressTrackersPanel",
);
export const MedicalQuestionnairePanel = named(
  () => import("../components/MedicalQuestionnairePanel.jsx"),
  "MedicalQuestionnairePanel",
);
export const CommitmentLetterSection = named(
  () => import("../components/CommitmentLetterSection.jsx"),
  "CommitmentLetterSection",
);
export const DietPlansSection = named(
  () => import("../components/DietPlansSection.jsx"),
  "DietPlansSection",
);
export const TestCatalogSection = named(
  () => import("../components/TestCatalogSection.jsx"),
  "TestCatalogSection",
);
export const DrfBankSection = named(() => import("../components/DrfBankSection.jsx"), "DrfBankSection");
export const GallerySection = named(() => import("../components/GallerySection.jsx"), "GallerySection");
export const AiEnableSection = named(() => import("../components/AiEnableSection.jsx"), "AiEnableSection");
export const PaymentGatewaySection = named(
  () => import("../components/PaymentGatewaySection.jsx"),
  "PaymentGatewaySection",
);
export const LanguageDisableSection = named(
  () => import("../components/LanguageDisableSection.jsx"),
  "LanguageDisableSection",
);
export const GstSection = named(() => import("../components/GstSection.jsx"), "GstSection");
export const ConsultancyAmountSection = named(
  () => import("../components/ConsultancyAmountSection.jsx"),
  "ConsultancyAmountSection",
);
export const AppSubscriptionFySection = named(
  () => import("../components/AppSubscriptionFySection.jsx"),
  "AppSubscriptionFySection",
);
export const DpaSection = named(() => import("../components/DpaSection.jsx"), "DpaSection");
export const PrivacyPolicySection = named(
  () => import("../components/PrivacyPolicySection.jsx"),
  "PrivacyPolicySection",
);
export const TermsAndConditionsSection = named(
  () => import("../components/TermsAndConditionsSection.jsx"),
  "TermsAndConditionsSection",
);
export const CommunityGuidelinesSection = named(
  () => import("../components/CommunityGuidelinesSection.jsx"),
  "CommunityGuidelinesSection",
);
export const LegalSectionsEditor = named(
  () => import("../components/LegalSectionsEditor.jsx"),
  "LegalSectionsEditor",
);
export const LaunchSection = named(() => import("../components/LaunchSection.jsx"), "LaunchSection");
export const NutritionBankSection = named(
  () => import("../components/NutritionBankSection.jsx"),
  "NutritionBankSection",
);
export const ChallengesSection = named(
  () => import("../components/ChallengesSection.jsx"),
  "ChallengesSection",
);
export const CouponsSection = named(() => import("../components/CouponsSection.jsx"), "CouponsSection");
export const FeatureFlagsSection = named(
  () => import("../components/FeatureFlagsSection.jsx"),
  "FeatureFlagsSection",
);
export const DynamicProgramTestimonialsSection = named(
  () => import("../components/DynamicProgramTestimonialsSection.jsx"),
  "DynamicProgramTestimonialsSection",
);
export const FooterSettingSection = named(
  () => import("../components/FooterSettingSection.jsx"),
  "FooterSettingSection",
);
export const SocialLinksSection = named(
  () => import("../components/SocialLinksSection.jsx"),
  "SocialLinksSection",
);
export const LegalBlocksSection = named(
  () => import("../components/LegalBlocksSection.jsx"),
  "LegalBlocksSection",
);
export const ContactDetailsSection = named(
  () => import("../components/ContactDetailsSection.jsx"),
  "ContactDetailsSection",
);
export const AppContentSection = named(
  () => import("../components/AppContentSection.jsx"),
  "AppContentSection",
);
export const LogoSlotsSection = named(
  () => import("../components/LogoSlotsSection.jsx"),
  "LogoSlotsSection",
);
export const LocationsSection = named(
  () => import("../components/LocationsSection.jsx"),
  "LocationsSection",
);
export const BannerSection = named(() => import("../components/BannerSection.jsx"), "BannerSection");
export const DynamicChampionSection = named(
  () => import("../components/DynamicChampionSection.jsx"),
  "DynamicChampionSection",
);
export const DynamicBirthdaySection = named(
  () => import("../components/DynamicBirthdaySection.jsx"),
  "DynamicBirthdaySection",
);
export const DynamicTransformationSection = named(
  () => import("../components/DynamicTransformationSection.jsx"),
  "DynamicTransformationSection",
);
export const DynamicClientReviewSection = named(
  () => import("../components/DynamicClientReviewSection.jsx"),
  "DynamicClientReviewSection",
);
export const DynamicRealPeopleSection = named(
  () => import("../components/DynamicRealPeopleSection.jsx"),
  "DynamicRealPeopleSection",
);
export const DynamicVoiceOfHealingSection = named(
  () => import("../components/DynamicVoiceOfHealingSection.jsx"),
  "DynamicVoiceOfHealingSection",
);
export const DynamicCofounderSection = named(
  () => import("../components/DynamicCofounderSection.jsx"),
  "DynamicCofounderSection",
);
export const AboutSection = named(() => import("../components/AboutSection.jsx"), "AboutSection");
export const DynamicLeadershipSection = named(
  () => import("../components/DynamicLeadershipSection.jsx"),
  "DynamicLeadershipSection",
);
export const DynamicWellnessTeamSection = named(
  () => import("../components/DynamicWellnessTeamSection.jsx"),
  "DynamicWellnessTeamSection",
);
export const DynamicGoogleReviewSection = named(
  () => import("../components/DynamicGoogleReviewSection.jsx"),
  "DynamicGoogleReviewSection",
);
export const DropdownsSection = named(
  () => import("../components/DropdownsSection.jsx"),
  "DropdownsSection",
);
export const HealthDisordersSection = named(
  () => import("../components/HealthDisordersSection.jsx"),
  "HealthDisordersSection",
);
export const RecipesSection = named(() => import("../components/RecipesSection.jsx"), "RecipesSection");
export const YogaSection = named(() => import("../components/YogaSection.jsx"), "YogaSection");
export const WellnessLibrarySection = named(
  () => import("../components/WellnessLibrarySection.jsx"),
  "WellnessLibrarySection",
);
export const RxBankSection = named(() => import("../components/RxBankSection.jsx"), "RxBankSection");
export const FaqConfigPanel = named(() => import("../components/FaqConfigPanel.jsx"), "FaqConfigPanel");
export const PrakritiAssessmentSection = named(
  () => import("../components/PrakritiAssessmentSection.jsx"),
  "PrakritiAssessmentSection",
);
