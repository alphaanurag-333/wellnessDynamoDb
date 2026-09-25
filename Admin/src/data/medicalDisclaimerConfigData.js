/** Fallback preview blocks when Medical Disclaimer has not been published yet. */

function block(id, title, text) {
  return {
    id,
    title,
    shown: true,
    webVersion: 1,
    appVersion: 1,
    versions: [
      {
        n: 1,
        date: "23 Sep 2026",
        author: "Admin",
        text,
      },
    ],
  };
}

export const MEDICAL_DISCLAIMER_BLOCKS = [
  block(
    "intro",
    "Overview",
    `<p><strong>India Redefining Wellness (IRW)</strong> | Last updated: 23 September 2026</p>
<p>At India Redefining Wellness (IRW), we are committed to empowering individuals to make informed decisions about their health through personalised wellness coaching, functional nutrition and sustainable lifestyle changes.</p>
<p>Please read this Medical Disclaimer carefully before using our website, mobile application, wellness programs, coaching services or educational resources.</p>`,
  ),
  block(
    "general-info",
    "1. General Health and Wellness Information",
    `<p>All information provided by IRW through its website, mobile application, wellness programs, blogs, videos, recipes, health calculators, social media platforms and other communication channels is intended for general health education, wellness awareness and lifestyle guidance.</p>
<p>This information is not intended to replace professional medical advice, diagnosis, treatment or consultation with a registered medical practitioner.</p>
<p>Always consult an appropriately qualified healthcare professional regarding any medical condition, symptoms, diagnostic results or treatment decisions.</p>`,
  ),
  block(
    "scope",
    "2. Scope of IRW's Wellness Services",
    `<p>IRW provides personalised wellness and lifestyle support through services that may include functional nutrition guidance, health and lifestyle assessments, physical activity recommendations, stress management, sleep improvement, wellness coaching and progress tracking.</p>
<p>Our Wellness Coaches and Functional Nutrition professionals support individuals in developing healthier habits and making sustainable lifestyle changes.</p>
<p>Unless a service is expressly provided by an appropriately registered medical practitioner, IRW's wellness consultations and coaching services do not constitute medical diagnosis, medical treatment or prescription services.</p>
<p>Reviewing health reports or discussing medical conditions as part of a wellness assessment does not constitute a medical diagnosis.</p>`,
  ),
  block(
    "suitability",
    "3. Individual Health Conditions and Program Suitability",
    `<p>IRW offers wellness support for individuals managing concerns such as obesity, Type 2 diabetes, PCOS/PCOD, thyroid-related conditions, digestive health concerns and metabolic imbalances.</p>
<p>Every individual has different health needs, medical histories and responses to lifestyle interventions.</p>
<p>Participation in an IRW program does not guarantee improvement, remission, reversal or recovery from any medical condition.</p>
<p>Individuals with diagnosed medical conditions, pregnancy-related health concerns or other circumstances requiring specialised care should consult their treating healthcare professional before beginning a new nutrition, exercise or lifestyle program.</p>
<p>IRW may recommend obtaining medical clearance or seeking additional professional care where appropriate.</p>`,
  ),
  block(
    "medication",
    "4. Medication and Medical Treatment",
    `<p><strong>Important:</strong> Never discontinue, reduce or modify prescribed medication without consulting your treating medical practitioner.</p>
<p>IRW believes that appropriate nutrition and lifestyle changes can complement conventional medical care and, in some circumstances, may contribute to improved health outcomes.</p>
<p>Any reduction or discontinuation of medication must be individually assessed and authorised by the treating medical practitioner.</p>
<p>IRW does not guarantee a medicine-free life. Where medically appropriate, improvements in health may allow medication adjustments under professional medical supervision.</p>
<p>Individuals taking medication for diabetes, blood pressure or other chronic conditions should remain under appropriate medical supervision, particularly when making significant dietary or physical activity changes.</p>`,
  ),
  block(
    "outcomes",
    "5. Diabetes Reversal and Other Health Outcomes",
    `<p>References to diabetes reversal, metabolic improvement or similar outcomes in IRW's programs and promotional materials describe potential improvements in health and lifestyle-related indicators. They should not be interpreted as promises of a permanent cure.</p>
<p>Type 2 diabetes remission has specific clinical criteria and requires appropriate medical assessment. Even after remission, continued monitoring remains important.</p>
<p>IRW does not guarantee remission or reversal of diabetes or any other medical condition. Results depend on individual health circumstances and other relevant factors.</p>`,
  ),
  block(
    "calculators",
    "6. Health Calculators and Digital Tracking",
    `<p>IRW's website and mobile application may offer tools such as BMI, BMR, body fat and visceral fat estimators, along with meal tracking, activity monitoring, body measurements and other wellness features.</p>
<p>Calculator results and digital tracking information are estimates or user-reported measurements intended to support general wellness awareness.</p>
<p>Such results may have limitations and may not be appropriate for every individual. They should not be used independently to diagnose a medical condition, determine treatment or make medication decisions.</p>
<p>Users should consult a qualified healthcare professional for clinical interpretation of their health measurements, laboratory reports and medical information.</p>`,
  ),
  block(
    "testimonials",
    "7. Client Testimonials and Transformation Results",
    `<p>Client stories, testimonials, before-and-after photographs, health measurements and transformation results published by IRW describe individual experiences.</p>
<p>These experiences are not guarantees of similar results for other individuals.</p>
<p>Outcomes may vary depending on health history, medical conditions, lifestyle, adherence, medication, professional medical care and other individual circumstances.</p>
<p>Testimonials and transformation stories should not be interpreted as evidence that any particular medical condition can be cured or that medical treatment is unnecessary.</p>`,
  ),
  block(
    "digital-info",
    "8. Website and Mobile Application Information",
    `<p>IRW makes reasonable efforts to provide useful, accurate and current wellness information. However, medical knowledge and scientific recommendations continue to evolve.</p>
<p>We do not guarantee that all information will be complete, error-free or suitable for every individual's circumstances.</p>
<p>Information recorded or displayed through the IRW mobile application, including progress reports, activity tracking and wellness reminders, is intended to support general wellness management and should not be relied upon for continuous medical monitoring or emergency alerts.</p>
<p>Links to external websites and third-party resources are provided for additional information. IRW does not necessarily endorse every statement or recommendation contained in those resources.</p>`,
  ),
  block(
    "emergencies",
    "9. Medical Emergencies",
    `<p>IRW's website, mobile application, Wellness Coaches and digital communication channels are not emergency medical services.</p>
<p>If you experience a medical emergency or potentially serious symptoms, seek immediate medical assistance from a qualified healthcare professional or your nearest emergency medical facility.</p>
<p>Do not rely on emails, WhatsApp messages, coaching appointments, application notifications or other IRW communication channels for emergency medical assistance.</p>`,
  ),
  block(
    "personal-info",
    "10. Personal Health Information",
    `<p>IRW may collect personal and health-related information where necessary to provide its wellness services.</p>
<p>The collection, use, sharing, storage and protection of personal information are addressed in our Privacy Policy and applicable program-specific consent arrangements.</p>
<p>Please review our Privacy Policy to understand how your personal information is handled and how to contact IRW regarding privacy-related concerns.</p>`,
  ),
  block(
    "liability",
    "11. Responsibility and Limitation of Liability",
    `<p>Users are encouraged to make informed health decisions and seek appropriate professional medical advice before implementing significant changes to their nutrition, physical activity, medication or medical treatment.</p>
<p>To the extent permitted by applicable law, IRW is not responsible for adverse outcomes arising solely from the misuse of general educational content or from users independently disregarding professional medical advice.</p>
<p>Nothing in this Medical Disclaimer excludes or restricts any rights or remedies that cannot lawfully be excluded under applicable Indian law.</p>
<p>This disclaimer should be read alongside IRW's Terms of Use, Privacy Policy and any applicable program-specific terms and consent documents.</p>`,
  ),
  block(
    "contact",
    "12. Contact Us",
    `<p>If you have questions about this Medical Disclaimer or require clarification regarding the scope of IRW's wellness services, please contact us.</p>
<p><strong>India Redefining Wellness (IRW)</strong></p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:info@irwellness.in">info@irwellness.in</a></li>
  <li><strong>Website:</strong> <a href="https://www.irwellness.in" target="_blank" rel="noopener noreferrer">www.irwellness.in</a></li>
</ul>`,
  ),
];
