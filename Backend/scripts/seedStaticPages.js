/**
 * Seed StaticPage entries for legal + about pages.
 * Creates missing pages and updates content for existing slugs.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedStaticPages.js
 *   npm run seed:static-pages
 */
require("dotenv").config();

const { createPage, getPageBySlug, updatePage, deletePage } = require("../models/staticPageModel");

const EFFECTIVE_DATE = "July 4, 2026";
const COMPANY_NAME = "Wellness";
const SUPPORT_EMAIL = "admin@wellness.com";
const SUPPORT_PHONE = "+91 9876543210";
const COMPANY_ADDRESS = "Vijay Nagar, Indore, Madhya Pradesh, India";

const STATIC_PAGES = [
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    status: "active",
    content: `
      <p><strong>Effective date:</strong> ${EFFECTIVE_DATE}</p>
      <p>${COMPANY_NAME} ("we", "our", or "us") operates a wellness coaching platform that helps users build healthier habits through personalized programs, coach support, and community engagement. This Privacy Policy describes how we collect, use, store, and protect your personal information when you visit our website, use our mobile application, or interact with our services.</p>
      <p>By using our platform, you agree to the practices described in this policy. If you do not agree, please discontinue use of our services.</p>

      <h2>1. Information We Collect</h2>
      <h3>Information you provide directly</h3>
      <ul>
        <li><strong>Account details:</strong> name, email address, phone number, date of birth, gender, and login credentials.</li>
        <li><strong>Health and wellness profile:</strong> health goals, lifestyle preferences, dietary habits, activity levels, prakruti assessment responses, and program selections.</li>
        <li><strong>Communication data:</strong> messages sent through contact forms, support tickets, coach chat, and feedback submissions.</li>
        <li><strong>Payment information:</strong> billing details required for consultations, subscriptions, or program enrollments. Payment card data is processed by secure third-party payment providers and is not stored on our servers.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>Device type, browser, operating system, IP address, and general location (city/region level).</li>
        <li>App usage data such as pages viewed, session duration, feature interactions, and crash logs.</li>
        <li>Cookies and similar technologies that help us remember preferences and improve performance.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use personal information for legitimate business purposes, including to:</p>
      <ul>
        <li>Create and manage your account and wellness profile.</li>
        <li>Deliver coaching services, diet plans, prescriptions, and personalized recommendations.</li>
        <li>Schedule consultations, send appointment reminders, and respond to inquiries.</li>
        <li>Process payments, invoices, and subscription renewals.</li>
        <li>Improve our platform, content quality, and user experience through analytics.</li>
        <li>Send service-related notifications, wellness tips, and promotional updates (you may opt out of marketing messages).</li>
        <li>Detect fraud, enforce our terms, and comply with applicable laws.</li>
      </ul>

      <h2>3. How We Share Information</h2>
      <p>We do not sell your personal data. We may share information only in these situations:</p>
      <ul>
        <li><strong>With coaches and care team members</strong> assigned to your program, strictly for service delivery.</li>
        <li><strong>With trusted service providers</strong> such as cloud hosting, email delivery, analytics, and payment processors under confidentiality obligations.</li>
        <li><strong>For legal reasons</strong> when required by law, court order, or to protect the rights, safety, and security of users and our organization.</li>
        <li><strong>With your consent</strong> when you explicitly authorize sharing.</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>We retain personal information for as long as your account is active or as needed to provide services, resolve disputes, enforce agreements, and meet legal obligations. When data is no longer required, we delete or anonymize it using reasonable security practices.</p>

      <h2>5. Data Security</h2>
      <p>We implement administrative, technical, and physical safeguards designed to protect your information, including encrypted connections (HTTPS), access controls, and secure cloud infrastructure. No online system is completely secure, so we encourage you to use a strong password and keep login credentials confidential.</p>

      <h2>6. Your Rights and Choices</h2>
      <p>Depending on applicable law, you may have the right to:</p>
      <ul>
        <li>Access, update, or correct your personal information in account settings.</li>
        <li>Request deletion of your account and associated data, subject to legal retention requirements.</li>
        <li>Withdraw consent for optional processing such as marketing communications.</li>
        <li>Request a copy of information we hold about you.</li>
      </ul>
      <p>To exercise these rights, contact us using the details below.</p>

      <h2>7. Children's Privacy</h2>
      <p>Our services are intended for users aged 18 and above. We do not knowingly collect personal information from children. If you believe a child has provided us data, please contact us and we will take appropriate action.</p>

      <h2>8. Third-Party Links</h2>
      <p>Our website or app may contain links to third-party websites or social platforms. We are not responsible for the privacy practices of those external sites. Please review their policies before sharing personal information.</p>

      <h2>9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be posted on this page with a revised effective date. Continued use of our services after updates means you accept the revised policy.</p>

      <h2>10. Contact Us</h2>
      <p>If you have questions about this Privacy Policy or how your data is handled, contact us:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
        <li><strong>Phone:</strong> <a href="tel:${SUPPORT_PHONE.replace(/\s/g, "")}">${SUPPORT_PHONE}</a></li>
        <li><strong>Address:</strong> ${COMPANY_ADDRESS}</li>
      </ul>
    `.trim(),
  },
  {
    title: "Terms and Conditions",
    slug: "terms-and-conditions",
    status: "active",
    content: `
      <p><strong>Effective date:</strong> ${EFFECTIVE_DATE}</p>
      <p>Welcome to ${COMPANY_NAME}. These Terms and Conditions ("Terms") govern your access to and use of our website, mobile application, coaching services, wellness programs, and related features (collectively, the "Services"). Please read these Terms carefully before using the platform.</p>
      <p>By creating an account, booking a consultation, or otherwise using our Services, you agree to these Terms and our Privacy Policy.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old and capable of entering a legally binding agreement to use our Services. By registering, you confirm that the information you provide is accurate and complete.</p>

      <h2>2. Nature of Services</h2>
      <p>${COMPANY_NAME} provides wellness coaching, lifestyle guidance, nutrition planning, habit tracking, and educational content. Our Services are designed to support general wellness and are <strong>not a substitute for medical diagnosis, treatment, or emergency care</strong>.</p>
      <p>Always consult a qualified physician or healthcare provider before making significant changes to your diet, exercise routine, or medication, especially if you have a medical condition, are pregnant, or are under professional care.</p>

      <h2>3. Account Registration and Security</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You must notify us immediately of any unauthorized access to your account.</li>
        <li>We may suspend or terminate accounts that provide false information or violate these Terms.</li>
      </ul>

      <h2>4. Consultations, Programs, and Payments</h2>
      <ul>
        <li>Fees for consultations, subscriptions, and programs are displayed at the time of purchase and may change with prior notice.</li>
        <li>Taxes, if applicable, will be calculated according to your billing details and local regulations.</li>
        <li>Refund and cancellation rules depend on the specific program or service purchased. Contact support for assistance with billing disputes.</li>
        <li>Missed appointments without prior notice may be subject to rescheduling policies communicated by your coach or support team.</li>
      </ul>

      <h2>5. User Responsibilities</h2>
      <p>When using our Services, you agree to:</p>
      <ul>
        <li>Provide truthful health and profile information to the best of your knowledge.</li>
        <li>Use the platform lawfully and respectfully toward coaches, staff, and other members.</li>
        <li>Not upload harmful, abusive, misleading, or infringing content.</li>
        <li>Not attempt to reverse engineer, disrupt, or gain unauthorized access to our systems.</li>
        <li>Follow your coach's guidance responsibly and report adverse reactions to a medical professional when needed.</li>
      </ul>

      <h2>6. Intellectual Property</h2>
      <p>All content on the platform—including text, graphics, logos, videos, diet plans, assessments, and software—is owned by ${COMPANY_NAME} or licensed to us. You may use content only for personal, non-commercial wellness purposes. Reproduction, distribution, or resale without written permission is prohibited.</p>

      <h2>7. Community and Communication</h2>
      <p>Participation in community features, testimonials, or group sessions is subject to our Community Guidelines. We may remove content or restrict access when guidelines or these Terms are violated.</p>

      <h2>8. Disclaimer of Warranties</h2>
      <p>Our Services are provided on an "as is" and "as available" basis. While we strive for high-quality coaching and accurate information, we do not guarantee specific health outcomes, uninterrupted access, or error-free operation.</p>

      <h2>9. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, ${COMPANY_NAME} and its directors, coaches, employees, and partners shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the Services, including loss of data, profits, or health-related decisions made without professional medical consultation.</p>

      <h2>10. Termination</h2>
      <p>You may stop using the Services at any time. We may suspend or terminate access if you breach these Terms, engage in harmful conduct, or if required by law. Provisions that should survive termination—such as intellectual property, disclaimers, and liability limits—will remain in effect.</p>

      <h2>11. Governing Law</h2>
      <p>These Terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of competent courts in Indore, Madhya Pradesh, unless otherwise required by applicable consumer protection laws.</p>

      <h2>12. Changes to Terms</h2>
      <p>We may revise these Terms periodically. Updated Terms will be posted on this page with a new effective date. Your continued use after changes constitutes acceptance.</p>

      <h2>13. Contact Information</h2>
      <p>For questions about these Terms, reach out to us:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
        <li><strong>Phone:</strong> <a href="tel:${SUPPORT_PHONE.replace(/\s/g, "")}">${SUPPORT_PHONE}</a></li>
        <li><strong>Address:</strong> ${COMPANY_ADDRESS}</li>
      </ul>
    `.trim(),
  },
  {
    title: "Community Guidelines",
    slug: "community-guideline",
    status: "active",
    content: `
      <p><strong>Last updated:</strong> ${EFFECTIVE_DATE}</p>
      <p>${COMPANY_NAME} is more than a wellness app—it is a community of people working toward healthier, happier lives. These Community Guidelines explain how we expect members, coaches, and guests to interact so everyone feels safe, supported, and respected.</p>
      <p>By participating in community spaces, group sessions, comments, testimonials, or coach-led discussions, you agree to follow these guidelines.</p>

      <h2>1. Be Kind and Respectful</h2>
      <ul>
        <li>Treat every member with dignity, regardless of background, body type, fitness level, or health journey stage.</li>
        <li>Use encouraging language. Celebrate progress without comparing or shaming others.</li>
        <li>Disagree thoughtfully. Personal attacks, insults, and intimidation are not allowed.</li>
      </ul>

      <h2>2. Zero Tolerance for Harmful Behavior</h2>
      <p>The following content and conduct are strictly prohibited:</p>
      <ul>
        <li>Hate speech, discrimination, or harassment based on race, religion, gender, disability, or any protected characteristic.</li>
        <li>Bullying, threats, stalking, or repeated unwanted contact.</li>
        <li>Sexually explicit, violent, or otherwise offensive material.</li>
        <li>Spam, scams, pyramid schemes, or unauthorized advertising.</li>
        <li>Sharing false medical claims intended to mislead or cause harm.</li>
      </ul>

      <h2>3. Share Wellness Information Responsibly</h2>
      <ul>
        <li>Personal experiences are welcome, but do not present them as guaranteed medical outcomes.</li>
        <li>Do not diagnose, prescribe, or tell others to stop medication without professional guidance.</li>
        <li>Recommendations should be supportive and general. Refer serious concerns to a qualified healthcare provider or ${COMPANY_NAME} support team.</li>
        <li>Before-and-after photos or transformation stories should be honest and not edited to misrepresent results.</li>
      </ul>

      <h2>4. Protect Privacy</h2>
      <ul>
        <li>Do not share another person's contact details, health records, photos, or private messages without consent.</li>
        <li>Keep coach conversations and member-only content confidential.</li>
        <li>Be mindful when posting screenshots or group chat excerpts—remove personal identifiers when possible.</li>
      </ul>

      <h2>5. Coach and Member Interactions</h2>
      <ul>
        <li>Coaches are here to guide and motivate. Maintain professional boundaries in all communications.</li>
        <li>Members should follow program instructions and communicate openly about challenges or limitations.</li>
        <li>Off-platform solicitation, unauthorized paid services, or inappropriate personal requests are not permitted.</li>
      </ul>

      <h2>6. Authentic Participation</h2>
      <ul>
        <li>Use your real identity where required and avoid impersonation or fake accounts.</li>
        <li>Do not manipulate ratings, testimonials, or community votes.</li>
        <li>Report technical issues or content concerns honestly so our team can help quickly.</li>
      </ul>

      <h2>7. Enforcement</h2>
      <p>Violations may result in:</p>
      <ul>
        <li>Content removal or editing</li>
        <li>Temporary feature restrictions</li>
        <li>Suspension or permanent removal from community spaces</li>
        <li>Account termination for severe or repeated violations</li>
      </ul>
      <p>Our moderation team reviews reports based on these guidelines and applicable laws. Decisions are made to protect community safety and may not always be publicly disclosed due to privacy obligations.</p>

      <h2>8. How to Report a Concern</h2>
      <p>If you see behavior that violates these guidelines, please report it immediately:</p>
      <ul>
        <li>Use in-app report tools where available</li>
        <li>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> with relevant details (screenshots, dates, usernames)</li>
        <li>Call <a href="tel:${SUPPORT_PHONE.replace(/\s/g, "")}">${SUPPORT_PHONE}</a> for urgent safety concerns</li>
      </ul>
      <p>We aim to review reports within 2–3 business days. For emergencies, contact local authorities first.</p>

      <h2>9. Updates to These Guidelines</h2>
      <p>We may update these Community Guidelines as our platform grows. Changes will be posted on this page. Continued participation after updates means you accept the revised guidelines.</p>

      <h2>10. Thank You</h2>
      <p>Thank you for helping us build a positive, inclusive wellness community. Your respect, honesty, and support make ${COMPANY_NAME} a place where real transformation happens—together.</p>
    `.trim(),
  },
  {
    title: "Data Processing Agreement",
    slug: "app-dpa",
    status: "active",
    content: `
      <p><strong>Effective date:</strong> ${EFFECTIVE_DATE}</p>
      <p>This Data Processing Agreement ("Agreement") describes how ${COMPANY_NAME} ("we", "our", or "us") processes personal data, including health-related information, when you use our mobile application, coaching services, and related features.</p>
      <p>By creating an account or continuing to use the app, you acknowledge this Agreement together with our Privacy Policy and Terms of Service.</p>

      <h2>1. Roles and purpose</h2>
      <p>We process personal data to deliver wellness coaching, programme tracking, lab reviews, consultations, and in-app support. Processing is limited to what is needed to provide those services and to meet legal obligations.</p>

      <h2>2. Data we process</h2>
      <ul>
        <li>Account details such as name, contact information, and login identifiers.</li>
        <li>Health and wellness inputs you provide, including goals, measurements, lifestyle answers, and coach notes.</li>
        <li>Lab reports, prescriptions, and programme files uploaded for your care team.</li>
        <li>Usage, device, and support records needed to operate and secure the app.</li>
      </ul>

      <h2>3. How we use and share data</h2>
      <ul>
        <li>Data is accessed by you, your assigned coach, and authorised ${COMPANY_NAME} staff for service delivery.</li>
        <li>Trusted processors such as hosting, messaging, labs, and payment providers receive only what is required to fulfil a service, under confidentiality obligations.</li>
        <li>We do not sell personal data.</li>
        <li>We may disclose information when required by law, to protect user safety, or with your explicit consent.</li>
      </ul>

      <h2>4. Security and retention</h2>
      <p>We use access controls, encrypted connections, and restricted staff permissions to protect personal data. Records are kept while your account is active and for as long as needed to provide services, resolve disputes, and meet legal retention rules. When data is no longer required, we delete or anonymise it using reasonable practices.</p>

      <h2>5. Your rights</h2>
      <p>Subject to applicable law, you may request access, correction, export, or deletion of your account data. Some records may be retained where law or legitimate programme records require it. To exercise these rights, contact support using the details below.</p>

      <h2>6. Contact</h2>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
        <li><strong>Phone:</strong> <a href="tel:${SUPPORT_PHONE.replace(/\s/g, "")}">${SUPPORT_PHONE}</a></li>
        <li><strong>Address:</strong> ${COMPANY_ADDRESS}</li>
      </ul>
    `.trim(),
  },
  {
    title: "Privacy Policy",
    slug: "app-privacy-policy",
    status: "active",
    content: `
      <p>This Privacy Policy explains how ${COMPANY_NAME} collects, uses, and protects personal information when you use our mobile application.</p>
      <h2>Key points</h2>
      <ul>
        <li>We collect account details, health profile inputs, and usage data needed to run your program.</li>
        <li>Information is used to deliver coaching, improve the app, and meet legal obligations.</li>
        <li>We do not sell your personal data. Trusted processors only receive what is required for a service.</li>
        <li>You may request access, correction, or deletion of your data through in-app support, subject to legal retention rules.</li>
      </ul>
      <p>Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    `.trim(),
  },
  {
    title: "Terms of Service",
    slug: "app-terms-of-service",
    status: "active",
    content: `
      <p>These Terms of Service describe how you may access and use the ${COMPANY_NAME} mobile application and the coaching services made available through it. By creating an account or continuing to use the app, you agree to these terms.</p>
      <h2>Key points</h2>
      <ul>
        <li>You receive a personal, non-transferable licence to use the app for your wellness program.</li>
        <li>Coaching, content, and tracking tools support general wellness and do not replace emergency or specialist medical care.</li>
        <li>Fees, renewals, and cancellations follow the plan shown at purchase and any in-app billing notices.</li>
        <li>We may update features or these terms; continued use after notice means you accept the revised terms.</li>
      </ul>
      <p>Contact: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    `.trim(),
  },
  {
    title: "Community Guidelines",
    slug: "app-community-guidelines",
    status: "active",
    content: `
      <p>Our community spaces are for respectful wellness support. These guidelines keep conversations safe, helpful, and inclusive for every member.</p>
      <h2>Key points</h2>
      <ul>
        <li>Be kind, honest, and supportive — no harassment, hate speech, or personal attacks.</li>
        <li>Do not share another person's private health details without clear consent.</li>
        <li>Avoid spam, solicitation, or medical claims that could mislead others.</li>
        <li>Report concerns through in-app tools or support so our team can review them promptly.</li>
      </ul>
      <p>Report issues: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    `.trim(),
  },
  {
    title: "Compliance",
    slug: "app-compliance",
    status: "active",
    content: `
      <p>This Compliance notice summarises how ${COMPANY_NAME} operates the mobile app in line with applicable laws, platform policies, and internal controls.</p>
      <h2>Key points</h2>
      <ul>
        <li>We follow applicable data protection, consumer, and health-information practices for the markets we serve.</li>
        <li>Payments, communications, and record retention are handled through approved vendors and audit-ready processes.</li>
        <li>Users can raise compliance concerns with support; serious issues are escalated to the compliance owner.</li>
        <li>We review policies periodically and update the app experience when regulations or platform rules change.</li>
      </ul>
      <p>Compliance contact: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    `.trim(),
  },
  {
    title: "Meet Your Wellness Partner",
    slug: "about-us",
    status: "active",
    content: `
      <p>We merge advanced clinical diagnostics with restorative holistic practices to create your personalized path to vitality.</p>
    `.trim(),
  },
  {
    title: "Our Mission",
    slug: "our-mission",
    status: "active",
    content: `
      <h2>Reinvigorating India’s Wellness Heritage.</h2>
      <p>We’re passionate about redefining India’s rich heritage of wellness practices in context to the modern era backed by science &amp; research. Drawing inspiration from Ayurveda, Yoga, Meditation, and other traditional systems of medicine, we seek to blend ancient wisdom with contemporary science to promote holistic well-being for individuals across India.</p>
    `.trim(),
  },
  {
    title: "Our Vision",
    slug: "our-vision",
    status: "active",
    content: `
      <h2>To Inspire &amp; Educate India to live a Healthy &amp; Happy Life.</h2>
      <p>Usually people are reactive and disease oriented when it comes to health. We should be inspired for the cause of being healthy inside-out to live a disease free life. Current health situation is getting deteriorated primarily because of change in lifestyle hence it is important to get educated rightly about the good health practices.</p>
    `.trim(),
  },
  {
    title: "Footer text",
    slug: "footer-text",
    status: "active",
    content: `
      <p>© ${new Date().getFullYear()} India Redefining Wellness Pvt. Ltd. All rights reserved.</p>
    `.trim(),
    blocks: [
      {
        id: "copyright",
        title: "Copyright line",
        shown: true,
        webVersion: 1,
        appVersion: 1,
        versions: [
          {
            n: 1,
            date: EFFECTIVE_DATE,
            author: "Admin",
            text: `© ${new Date().getFullYear()} India Redefining Wellness Pvt. Ltd. All rights reserved.`,
          },
        ],
      },
      {
        id: "secondary",
        title: "Secondary line",
        shown: true,
        webVersion: 1,
        appVersion: 1,
        versions: [
          {
            n: 1,
            date: EFFECTIVE_DATE,
            author: "Admin",
            text: "Made in India",
          },
        ],
      },
    ],
  },
  {
    title: "Our Goal",
    slug: "our-goal",
    status: "active",
    content: `
      <h2>Reach out One million families help them living a Healthy &amp; Medicine Free life.</h2>
      <p>Our goal is to reach out to One million families, empowering them to achieve a healthy and medicine-free life by addressing and reversing lifestyle disorders through holistic and sustainable fat-loss methods. By integrating comprehensive wellness strategies that encompass balanced nutrition, regular physical activity, stress management, and natural healing practices, we aim to transform lives and foster long-term health improvements.</p>
    `.trim(),
  },
];

const LEGAL_RESET_SLUGS = [
  "terms-and-conditions",
  "terms-of-service",
  "terms",
  "privacy-policy",
  "privacy",
  "community-guideline",
  "community-guidelines",
  "app-dpa",
  "dpa",
  "data-processing-agreement",
  "app-terms-of-service",
  "app-mobile-tos",
  "app-privacy-policy",
  "app-privacy",
  "app-community-guidelines",
  "app-community-guideline",
  "app-compliance",
];

function pageBySlug(slug) {
  return STATIC_PAGES.find((row) => row.slug === slug);
}

function applySharedLegalCopy() {
  const privacy = pageBySlug("privacy-policy")?.content;
  const terms = pageBySlug("terms-and-conditions")?.content;
  const guidelines = pageBySlug("community-guideline")?.content;
  for (const row of STATIC_PAGES) {
    if (row.slug === "app-privacy-policy" && privacy) row.content = privacy;
    if (row.slug === "app-terms-of-service" && terms) row.content = terms;
    if (row.slug === "app-community-guidelines" && guidelines) row.content = guidelines;
  }
}

async function resetLegalPages(onlySlugs) {
  const targets = onlySlugs
    ? LEGAL_RESET_SLUGS.filter((slug) => onlySlugs.has(slug))
    : LEGAL_RESET_SLUGS;
  console.log("Removing existing legal StaticPage records...\n");
  let deleted = 0;
  for (const slug of targets) {
    const page = await getPageBySlug(slug);
    if (!page) continue;
    await deletePage(page.id);
    console.log(`  ✓ deleted: ${page.title} (${slug})`);
    deleted += 1;
  }
  console.log(deleted ? `\nRemoved ${deleted} legal page(s).\n` : "No existing legal pages found.\n");
}

async function upsertPage(row) {
  const isLegal = LEGAL_RESET_SLUGS.includes(row.slug);
  const payload = { ...row };
  if (isLegal) delete payload.blocks;

  const existing = await getPageBySlug(payload.slug);

  if (existing) {
    const updated = await updatePage(existing.id, {
      title: payload.title,
      slug: payload.slug,
      content: payload.content,
      status: payload.status,
      ...(payload.blocks
        ? { blocks: payload.blocks }
        : isLegal
          ? { blocks: null }
          : {}),
    });
    return { action: "updated", item: updated };
  }

  const created = await createPage(payload);
  return { action: "created", item: created };
}

async function main() {
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const onlySlugs = onlyArg
    ? new Set(onlyArg.slice("--only=".length).split(",").map((slug) => slug.trim()).filter(Boolean))
    : null;
  const pages = onlySlugs
    ? STATIC_PAGES.filter((row) => onlySlugs.has(row.slug))
    : STATIC_PAGES;

  if (!pages.length) {
    throw new Error("No matching static pages to seed");
  }

  applySharedLegalCopy();

  console.log("Seeding StaticPage entries...\n");

  await resetLegalPages(onlySlugs);

  let created = 0;
  let updated = 0;

  for (const row of pages) {
    const { action, item } = await upsertPage(row);
    console.log(`  ✓ ${action}: ${row.title} → ${item.slug} (${item.id})`);
    if (action === "created") created += 1;
    if (action === "updated") updated += 1;
  }

  console.log(`\nDone: ${created} created, ${updated} updated.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Seed failed:", err.message || err);
    process.exitCode = 1;
  });
}
