import { useEffect, useMemo, useState } from "react";
import {
  COMMITMENT_LETTER_DEFAULT,
  normalizeCommitmentLetterText,
  parseCommitmentLetterBlocks,
} from "../data/commitmentLetterData.js";
import { formatRupee } from "../data/exchangeData.js";
import { paymentMethodsForGateway } from "../data/configDetailData.js";
import { programTestimonialLabel } from "../data/programTestimonialsConfigData.js";
import { liveVersionText } from "../data/privacyConfigData.js";
import { asCopyString, bannerPlacementById } from "../data/bannerConfigData.js";
import { formatPack } from "../data/nutritionBankData.js";
import { FeatureFlagsPreview } from "./FeatureFlagsSection.jsx";

function previewSurfaces(item) {
  const surfaces = [];
  if (item.id === "common-transformation" || item.id === "common-real-people") {
    if (item.app) surfaces.push({ id: "app", label: "App", ratio: "3:4" });
    if (item.web) surfaces.push({ id: "web", label: "Web", ratio: "3:4" });
    return surfaces;
  }
  if (item.id === "common-voice" || item.id === "common-cofounder" || item.id === "common-leadership" || item.id === "common-wellness-team" || item.id === "common-google-review" || item.id === "common-recipes" || item.id === "common-yoga" || item.id === "common-blogs") {
    if (item.app) surfaces.push({ id: "app", label: "App", ratio: "16:9" });
    if (item.web) surfaces.push({ id: "web", label: "Web", ratio: "16:9" });
    return surfaces;
  }
  const webRatio = item.id === "web-program-testimonials" || item.id === "common-client-review" ? "3:4" : "16:9";
  if (item.app) surfaces.push({ id: "app", label: "App", ratio: "9:16" });
  if (item.web) surfaces.push({ id: "web", label: "Web", ratio: webRatio });
  return surfaces;
}

function surfaceSubtitle(surfaces, activeId, item) {
  if (item?.id === "common-transformation" || item?.id === "common-real-people") {
    return "Common asset · renders on both surfaces · 3:4";
  }
  if (item?.id === "common-voice" || item?.id === "common-cofounder" || item?.id === "common-leadership" || item?.id === "common-wellness-team" || item?.id === "common-google-review" || item?.id === "common-recipes" || item?.id === "common-yoga" || item?.id === "common-blogs") {
    return "Common asset · renders on both surfaces · 16:9";
  }
  if (item?.id === "common-client-review") {
    return "Common asset · renders on both surfaces · 3:4";
  }
  if (!surfaces.length) return "No surfaces enabled · 16:9";
  const active = surfaces.find((entry) => entry.id === activeId) ?? surfaces[0];
  if (active.id === "app" && item?.app && !item?.web) return `App only · ${active.ratio}`;
  if (active.id === "web" && item?.web && !item?.app) return `Web only · ${active.ratio}`;
  return `${active.label} · ${active.ratio}`;
}

function PreviewStage({ surface, item, children }) {
  const surfaces = previewSurfaces(item);
  const active = surfaces.find((entry) => entry.id === surface) ?? surfaces[0];
  const ratio = active?.ratio || (surface === "app" ? "9:16" : "16:9");
  const stageSub =
    surface === "app" && item.app && !item.web
      ? `App only · ${ratio}`
      : surface === "web" && item.web && !item.app
        ? `Web only · ${ratio}`
        : `${surface === "app" ? "App" : "Web"} · ${ratio}`;

  return (
    <div className="ua-cfg-preview-stage">
      <div className="ua-cfg-preview-stage__bar">
        <div className="ua-cfg-preview-stage__copy">
          <strong>Live preview</strong>
          <span>{stageSub}</span>
        </div>
        <span className="ua-cfg-preview-stage__chip">{item.name}</span>
      </div>
      <div className="ua-cfg-preview-stage__label">{surface === "app" ? "App" : "Web"}</div>
      {children}
    </div>
  );
}

function AppContentPreviewPhone({ title, rows = [] }) {
  return (
    <div className="ua-cfg-preview-stage__device">
      <div className="ua-cfg-preview-phone">
        <div className="ua-cfg-preview-phone__shell ua-cfg-preview-phone__shell--content">
          <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
          <div className="ua-cfg-preview-content">
            <div className="ua-cfg-preview-content__head">
              <span className="ua-cfg-preview-content__icon" aria-hidden="true" />
              <strong>{title}</strong>
            </div>
            <div className="ua-cfg-preview-content__hero">IMAGE</div>
            {rows.length ? (
              <div className="ua-cfg-preview-content__list">
                {rows.slice(0, 4).map((row) => (
                  <div key={row.id} className="ua-cfg-preview-content__row">
                    <span>{row.name}</span>
                    <strong>{formatRupee(row.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ua-cfg-preview-content__skeleton" aria-hidden="true">
                <span />
                <span />
              </div>
            )}
            <div className="ua-cfg-preview-content__nav" aria-hidden="true">
              <span className="is-active">⌂</span>
              <span>▦</span>
              <span>☑</span>
              <span>👤</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPreviewWeb({ title, rows = [] }) {
  return (
    <div className="ua-cfg-preview-content-web">
      <div className="ua-cfg-preview-content-web__head">
        <strong>{title}</strong>
      </div>
      {rows.length ? (
        <div className="ua-cfg-preview-content-web__table">
          <div className="ua-cfg-preview-content-web__table-head">
            <span>Program</span>
            <span>Amount (Rs.)</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="ua-cfg-preview-content-web__table-row">
              <span>{row.name}</span>
              <strong>{formatRupee(row.amount)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-preview-content-web__empty">No pricing rows added yet.</div>
      )}
    </div>
  );
}

function FaqPreviewPhone() {
  return <AppContentPreviewPhone title="FAQ" />;
}

function FaqPreviewWeb({ items }) {
  const shown = items.filter((entry) => entry.shown);

  return (
    <div className="ua-cfg-preview-faq-web">
      <div className="ua-cfg-preview-faq-web__head">
        <strong>Frequently asked questions</strong>
      </div>
      {shown.length ? (
        <div className="ua-cfg-preview-faq-web__list">
          {shown.slice(0, 4).map((entry) => (
            <details key={entry.id} className="ua-cfg-preview-faq-web__item" open={entry.id === shown[0]?.id}>
              <summary>{entry.question}</summary>
              <p>{entry.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-preview-faq-web__empty">No questions are marked as shown yet.</div>
      )}
    </div>
  );
}

function ProgramPreview({ rows, surface, item }) {
  return (
    <PreviewStage surface={surface} item={item}>
      {surface === "web" ? (
        <ContentPreviewWeb title="Program pricing" rows={rows} />
      ) : (
        <AppContentPreviewPhone title="Program" rows={rows} />
      )}
    </PreviewStage>
  );
}

function SubscriptionPreview({ rows, surface, item }) {
  return (
    <PreviewStage surface={surface} item={item}>
      {surface === "web" ? (
        <ContentPreviewWeb title="Subscription pricing" rows={rows} />
      ) : (
        <AppContentPreviewPhone title="Subscriptions" rows={rows} />
      )}
    </PreviewStage>
  );
}

function FaqPreview({ items, surface, item }) {
  return (
    <PreviewStage surface={surface} item={item}>
      {surface === "web" ? <FaqPreviewWeb items={items} /> : <FaqPreviewPhone />}
    </PreviewStage>
  );
}

function LanguagePreview({ hindiOn, surface, item }) {
  const body =
    surface === "web" ? (
      <div className="ua-cfg-preview-lang ua-cfg-preview-lang--web">
        <div className="ua-cfg-preview-lang__web-bar">
          <span>Language</span>
        </div>
        <div className="ua-cfg-preview-lang__web-body">
          <div className="ua-cfg-preview-lang__option is-locked">
            <div>
              <strong>English</strong>
              <span>Default · always available</span>
            </div>
            <span className="ua-cfg-preview-lang__badge">On</span>
          </div>
          {hindiOn ? (
            <div className="ua-cfg-preview-lang__option">
              <div>
                <strong>Hindi</strong>
                <span>हिन्दी</span>
              </div>
              <span className="ua-cfg-preview-lang__badge is-on">On</span>
            </div>
          ) : (
            <div className="ua-cfg-preview-lang__option is-hidden">
              <div>
                <strong>Hindi</strong>
                <span>Hidden from language picker</span>
              </div>
              <span className="ua-cfg-preview-lang__badge">Off</span>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="ua-cfg-preview-phone">
        <div className="ua-cfg-preview-phone__shell">
          <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
          <div className="ua-cfg-preview-lang ua-cfg-preview-lang--app">
            <div className="ua-cfg-preview-lang__app-head">
              <span className="ua-cfg-preview-lang__back" aria-hidden="true">‹</span>
              <strong>Language</strong>
            </div>
            <div className="ua-cfg-preview-lang__app-list">
              <div className="ua-cfg-preview-lang__row is-locked">
                <div>
                  <strong>English</strong>
                  <span>Always on</span>
                </div>
                <span className="ua-cfg-preview-lang__check" aria-hidden="true">✓</span>
              </div>
              {hindiOn ? (
                <div className="ua-cfg-preview-lang__row is-active">
                  <div>
                    <strong>Hindi</strong>
                    <span>हिन्दी</span>
                  </div>
                  <span className="ua-cfg-preview-lang__radio is-on" aria-hidden="true" />
                </div>
              ) : (
                <div className="ua-cfg-preview-lang__row is-disabled">
                  <div>
                    <strong>Hindi</strong>
                    <span>Disabled by admin</span>
                  </div>
                </div>
              )}
            </div>
            {!hindiOn ? (
              <p className="ua-cfg-preview-lang__note">Clients see English only until Hindi is turned back on.</p>
            ) : null}
          </div>
        </div>
      </div>
    );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function GstPreview({ gstOn, gstPercent, surface, item }) {
  const amount = 24999;
  const rate = Number(gstPercent);
  const pct = Number.isFinite(rate) && rate > 0 ? rate : 18;
  const gst = Math.round(amount * (pct / 100));
  const total = gstOn ? amount + gst : amount;

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-gst ua-cfg-preview-gst--app">
          <div className="ua-cfg-preview-gst__head">
            <span className="ua-cfg-preview-gst__back" aria-hidden="true">‹</span>
            <strong>Checkout</strong>
          </div>
          <div className="ua-cfg-preview-gst__card">
            <div className="ua-cfg-preview-gst__program">
              <span>Fat Loss program</span>
              <strong>{formatRupee(amount)}</strong>
            </div>
            {gstOn ? (
              <>
                <div className="ua-cfg-preview-gst__line">
                  <span>Subtotal</span>
                  <span>{formatRupee(amount)}</span>
                </div>
                <div className="ua-cfg-preview-gst__line ua-cfg-preview-gst__line--gst">
                  <span>GST ({pct}%)</span>
                  <span>{formatRupee(gst)}</span>
                </div>
              </>
            ) : (
              <p className="ua-cfg-preview-gst__absorbed">
                GST absorbed by IRW · price shown is final
              </p>
            )}
            <div className="ua-cfg-preview-gst__total">
              <span>Total payable</span>
              <strong>{formatRupee(total)}</strong>
            </div>
          </div>
          <div className="ua-cfg-preview-gst__pay">Pay now</div>
          <p className="ua-cfg-preview-gst__mode">
            {gstOn ? "Client pays GST at checkout" : "IRW absorbs GST on this order"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function PaymentGatewayPreview({ activeGateway, surface, item }) {
  const amount = 22499;
  const methods = activeGateway ? paymentMethodsForGateway(activeGateway.id) : [];

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-pgw ua-cfg-preview-pgw--app">
          <div className="ua-cfg-preview-pgw__head">
            <span className="ua-cfg-preview-pgw__back" aria-hidden="true">‹</span>
            <strong>Pay now</strong>
          </div>

          {activeGateway ? (
            <>
              <div className="ua-cfg-preview-pgw__amount">
                <span>Amount due</span>
                <strong>{formatRupee(amount)}</strong>
              </div>
              <div className="ua-cfg-preview-pgw__gateway">
                <span className="ua-cfg-preview-pgw__gateway-label">Gateway</span>
                <strong>{activeGateway.name}</strong>
              </div>
              <div className="ua-cfg-preview-pgw__methods">
                <span className="ua-cfg-preview-pgw__methods-label">Payment methods</span>
                <div className="ua-cfg-preview-pgw__method-list">
                  {methods.map((method, index) => (
                    <span
                      key={method}
                      className={`ua-cfg-preview-pgw__method${index === 0 ? " is-active" : ""}`}
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ua-cfg-preview-pgw__pay">Continue to {activeGateway.name}</div>
            </>
          ) : (
            <div className="ua-cfg-preview-pgw__empty">
              <span className="ua-cfg-preview-pgw__empty-icon" aria-hidden="true">💳</span>
              <strong>Payment unavailable</strong>
              <p>Turn on a gateway and add credentials to enable checkout in the app.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function MeasurementVideoPreview({ guide, parameters, surface, item }) {
  const shown = (parameters ?? []).filter((entry) => entry.shown);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-mv ua-cfg-preview-mv--app">
          <div className="ua-cfg-preview-mv__head">
            <span className="ua-cfg-preview-mv__back" aria-hidden="true">‹</span>
            <strong>How to measure</strong>
          </div>
          <div className="ua-cfg-preview-mv__video">
            <span className="ua-cfg-preview-mv__play" aria-hidden="true">▶</span>
            {guide?.duration ? <span className="ua-cfg-preview-mv__duration">{guide.duration}</span> : null}
          </div>
          <div className="ua-cfg-preview-mv__copy">
            <strong>{guide?.title}</strong>
            <p>{guide?.description}</p>
          </div>
          <div className="ua-cfg-preview-mv__params">
            <span className="ua-cfg-preview-mv__params-label">Reference images</span>
            <div className="ua-cfg-preview-mv__param-list">
              {shown.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-mv__param">
                  {entry.url ? (
                    <img className="ua-cfg-preview-mv__param-thumb has-image" src={entry.url} alt="" />
                  ) : (
                    <span className={`ua-cfg-preview-mv__param-thumb${entry.hasImage ? " has-image" : ""}`} />
                  )}
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function OnboardingVideoPreview({ coaches, selectedCoachId, surface, item }) {
  const coach = (coaches ?? []).find((entry) => entry.id === selectedCoachId) ?? coaches?.[0];
  const title = coach?.title || "IRW default welcome";
  const description = coach?.description || "Your coach is preparing a personal welcome video. Until then, here is how to get started in the app.";
  const duration = coach?.duration || "4:00";

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-onb ua-cfg-preview-onb--app">
          <div className="ua-cfg-preview-onb__head">
            <span className="ua-cfg-preview-onb__back" aria-hidden="true">‹</span>
            <strong>Welcome</strong>
          </div>
          <div className="ua-cfg-preview-onb__badge">{coach?.tag ?? "ONB-DEFAULT"}</div>
          <div className="ua-cfg-preview-onb__video">
            <span className="ua-cfg-preview-onb__play" aria-hidden="true">▶</span>
            {duration ? <span className="ua-cfg-preview-onb__duration">{duration}</span> : null}
          </div>
          <div className="ua-cfg-preview-onb__copy">
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
          {coach?.name ? (
            <div className="ua-cfg-preview-onb__coach">From {coach.name} · day 1 of your journey</div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function MedicalQuestionnairePreview({ items, surface, item }) {
  const shown = (items ?? []).filter((entry) => entry.shown);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-mq ua-cfg-preview-mq--app">
          <div className="ua-cfg-preview-mq__head">
            <span className="ua-cfg-preview-mq__back" aria-hidden="true">‹</span>
            <strong>Medical conditions</strong>
          </div>
          <p className="ua-cfg-preview-mq__intro">
            Answer a few questions so your coach can personalise your plan.
          </p>
          {shown.length ? (
            <div className="ua-cfg-preview-mq__list">
              {shown.map((entry, index) => (
                <div key={entry.id} className="ua-cfg-preview-mq__item">
                  <label>{index + 1}. {entry.question}</label>
                  <div className="ua-cfg-preview-mq__field">
                    {entry.answerType === "yes_no"
                      ? "Yes / No"
                      : entry.answerType === "yes_no_text"
                        ? "Yes / No + details"
                        : entry.answerType === "date"
                          ? "Date"
                          : "Your answer"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-mq__empty">No questions are live in the app yet.</div>
          )}
          <div className="ua-cfg-preview-mq__continue">Continue</div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function HealthProgressPreview({ trackers, surface, item }) {
  const available = (trackers ?? []).filter((entry) => entry.enabled);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-hp ua-cfg-preview-hp--app">
          <div className="ua-cfg-preview-hp__head">
            <span className="ua-cfg-preview-hp__back" aria-hidden="true">‹</span>
            <strong>Add tracker</strong>
          </div>
          <p className="ua-cfg-preview-hp__intro">Pick a progress tracker to attach to this client.</p>
          {available.length ? (
            <div className="ua-cfg-preview-hp__list">
              {available.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-hp__item">
                  <span className="ua-cfg-preview-hp__dot" style={{ background: entry.color }} aria-hidden="true" />
                  <div>
                    <strong>{entry.category}</strong>
                    <span>{entry.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-hp__empty">No trackers are available in the picker yet.</div>
          )}
          <div className="ua-cfg-preview-hp__attach">Attach selected</div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function DietPlansPreview({ plans, surface, item }) {
  const live = (plans ?? []).filter((entry) => entry.live);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-dp ua-cfg-preview-dp--app">
          <div className="ua-cfg-preview-dp__head">
            <span className="ua-cfg-preview-dp__back" aria-hidden="true">‹</span>
            <strong>Diet plans</strong>
          </div>
          <p className="ua-cfg-preview-dp__intro">Pick a plan from the master book to apply to this client.</p>
          {live.length ? (
            <div className="ua-cfg-preview-dp__list">
              {live.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-dp__item">
                  <strong>{entry.title}</strong>
                  <p>{entry.content.slice(0, 120)}{entry.content.length > 120 ? "…" : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-dp__empty">No live plans in the book yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function AiEnablePreview({ coaches, assistants, surface, item }) {
  const enabledCoaches = (coaches ?? []).filter((entry) => entry.enabled).length;
  const enabledAssistants = (assistants ?? []).filter((entry) => entry.enabled).length;

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-ai ua-cfg-preview-ai--app">
          <div className="ua-cfg-preview-ai__head">
            <span className="ua-cfg-preview-ai__back" aria-hidden="true">‹</span>
            <strong>Lab report</strong>
          </div>
          <p className="ua-cfg-preview-ai__intro">AI interpretation appears here when enabled for this coach.</p>
          <div className="ua-cfg-preview-ai__card">
            <span className="ua-cfg-preview-ai__spark" aria-hidden="true">✦</span>
            <strong>AI summary</strong>
            <p>
              HbA1c is slightly elevated. Recommend reviewing carb timing with your coach and repeating the panel in 8 weeks.
            </p>
          </div>
          <p className="ua-cfg-preview-ai__meta">
            Enabled for {enabledCoaches} coaches and {enabledAssistants} assistants in this preview.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function LaunchPreview({ domains, surface, item }) {
  const liveDomains = (domains ?? [])
    .filter((domain) => domain.live)
    .slice(0, 3);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-launch ua-cfg-preview-launch--app">
          <div className="ua-cfg-preview-launch__head">
            <span className="ua-cfg-preview-launch__back" aria-hidden="true">‹</span>
            <strong>LAUNCH assessment</strong>
          </div>
          <p className="ua-cfg-preview-launch__intro">Onboarding lifestyle questionnaire for new clients.</p>
          {liveDomains.length ? (
            <div className="ua-cfg-preview-launch__domains">
              {liveDomains.map((domain) => (
                <div key={domain.id} className="ua-cfg-preview-launch__domain">
                  <div className="ua-cfg-preview-launch__domain-head">
                    <strong>{domain.name}</strong>
                    {domain.weight ? <span>{domain.weight}%</span> : null}
                  </div>
                  <ul>
                    {domain.questions.filter((entry) => entry.enabled).slice(0, 2).map((question) => (
                      <li key={question.id}>{question.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-launch__empty">No live domains yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function GalleryPreview({ media, surface, item }) {
  const live = (media ?? []).filter((entry) => entry.live).slice(0, 6);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-gl ua-cfg-preview-gl--app">
          <div className="ua-cfg-preview-gl__head">
            <span className="ua-cfg-preview-gl__back" aria-hidden="true">‹</span>
            <strong>Gallery</strong>
          </div>
          <p className="ua-cfg-preview-gl__intro">Live assets coaches and clients can reuse in the app.</p>
          {live.length ? (
            <div className="ua-cfg-preview-gl__grid">
              {live.map((entry) => (
                <div key={entry.id} className={`ua-cfg-preview-gl__item is-${entry.type}`}>
                  <span className="ua-cfg-preview-gl__type">{entry.category}</span>
                  <strong>{entry.title}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-gl__empty">No live gallery assets yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function CommitmentLetterPreview({ text, surface, item }) {
  const blocks = parseCommitmentLetterBlocks(normalizeCommitmentLetterText(text));
  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-cl ua-cfg-preview-cl--app">
          <div className="ua-cfg-preview-cl__head">
            <span className="ua-cfg-preview-cl__back" aria-hidden="true">‹</span>
            <strong>Commitment letter</strong>
          </div>
          <p className="ua-cfg-preview-cl__intro">Signed by your coach at onboarding.</p>
          <div className="ua-cfg-preview-cl__body">
            {blocks.map((block, index) =>
              block.type === "list" ? (
                <ul key={`list-${index}`} className="ua-cfg-cl-doc__list">
                  {block.items.map((itemText) => (
                    <li key={itemText}>{itemText}</li>
                  ))}
                </ul>
              ) : (
                <p key={`para-${index}`}>{block.text}</p>
              ),
            )}
          </div>
          <div className="ua-cfg-preview-cl__signature">
            <span>Coach signature</span>
            <div className="ua-cfg-preview-cl__sign-box">Signature</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function RxBankPreview({ protocols, surface, item }) {
  const live = (protocols ?? []).filter((entry) => entry.live);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-rx ua-cfg-preview-rx--app">
          <div className="ua-cfg-preview-rx__head">
            <span className="ua-cfg-preview-rx__back" aria-hidden="true">‹</span>
            <strong>Wellness prescription</strong>
          </div>
          <p className="ua-cfg-preview-rx__intro">Pick a protocol from the master book for this client.</p>
          {live.length ? (
            <div className="ua-cfg-preview-rx__list">
              {live.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-rx__item">
                  <strong>{entry.title}</strong>
                  <ul>
                    {entry.pointers.slice(0, 3).map((pointer) => (
                      <li key={pointer}>{pointer}</li>
                    ))}
                    {entry.pointers.length > 3 ? (
                      <li className="ua-cfg-preview-rx__more">
                        +{entry.pointers.length - 3} more pointer{entry.pointers.length - 3 === 1 ? "" : "s"}
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-rx__empty">No live protocols in the book yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function DrfBankPreview({ sections, surface, item }) {
  const liveSections = (sections ?? [])
    .filter((section) => section.live)
    .map((section) => ({
      ...section,
      questions: section.questions.filter((entry) => entry.enabled),
    }))
    .filter((section) => section.questions.length > 0);

  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-drf ua-cfg-preview-drf--app">
          <div className="ua-cfg-preview-drf__head">
            <span className="ua-cfg-preview-drf__back" aria-hidden="true">‹</span>
            <strong>Daily reflection</strong>
          </div>
          <p className="ua-cfg-preview-drf__intro">Check off today&apos;s activities by section.</p>
          {liveSections.length ? (
            <div className="ua-cfg-preview-drf__sections">
              {liveSections.map((section) => (
                <div key={section.id} className="ua-cfg-preview-drf__section">
                  <div className="ua-cfg-preview-drf__section-head">
                    <strong>{section.name}</strong>
                    <span>{section.weight}%</span>
                  </div>
                  <div className="ua-cfg-preview-drf__questions">
                    {section.questions.map((question) => (
                      <label key={question.id} className="ua-cfg-preview-drf__question">
                        <span className="ua-cfg-preview-drf__check" aria-hidden="true" />
                        <span>{question.name}</span>
                        <span className="ua-cfg-preview-drf__pts">{question.points} pts</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-drf__empty">No live sections or questions yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function NutritionBankPreview({ items, surface, item }) {
  const liveItems = (items || []).filter((entry) => entry.live !== false);
  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-nb ua-cfg-preview-nb--app">
          <div className="ua-cfg-preview-nb__head">
            <span className="ua-cfg-preview-nb__back" aria-hidden="true">‹</span>
            <strong>Nutrition bank</strong>
          </div>
          <p className="ua-cfg-preview-nb__intro">Pick supplements from the bank for this client.</p>
          {liveItems.length ? (
            <div className="ua-cfg-preview-nb__list">
              {liveItems.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-nb__item">
                  <div className="ua-cfg-preview-nb__item-main">
                    {entry.image ? <img src={entry.image} alt="" /> : null}
                    <div>
                      <strong>{entry.name}</strong>
                      <span>{entry.pack || formatPack(entry.packSize, entry.unit)}</span>
                    </div>
                  </div>
                  <span>Rs. {Number(entry.price || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ua-cfg-preview-nb__empty">The bank is empty.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function LegalTextPreview({ title, blocks = [], surface, item }) {
  const shown = (Array.isArray(blocks) ? blocks : []).filter((entry) => entry.shown);
  const body = (
    <div className="ua-cfg-preview-phone">
      <div className="ua-cfg-preview-phone__shell">
        <div className="ua-cfg-preview-phone__status" aria-hidden="true" />
        <div className="ua-cfg-preview-legal ua-cfg-preview-legal--app">
          <div className="ua-cfg-preview-legal__head">
            <span className="ua-cfg-preview-legal__back" aria-hidden="true">‹</span>
            <strong>{title}</strong>
          </div>
          <div className="ua-cfg-preview-legal__body">
            {shown.length ? (
              shown.map((block) => (
                <div key={block.id}>
                  {block.id === "intro" ? null : <strong>{block.title}</strong>}
                  <LegalPreviewCopy text={liveVersionText(block, "app")} />
                </div>
              ))
            ) : (
              <p>No copy yet.</p>
            )}
          </div>
          <div className="ua-cfg-preview-legal__accept">I agree</div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function GenericPreview({ item, surface }) {
  return (
    <div className={`ua-cfg-preview-generic${surface === "web" ? " ua-cfg-preview-generic--wide" : ""}`}>
      <span className="ua-cfg-preview-generic__icon" aria-hidden="true">👁</span>
      <strong>{item.name}</strong>
      <p>{item.note}</p>
    </div>
  );
}

function ChampionPreview({ editor = {}, surface, item }) {
  const design = editor.design || "gold";
  const icons = { gold: "🏆", navy: "🏆", confetti: "🏆", program: "🏆", balloons: "🎈", botanical: "🌿", typo: "✨", coach: "💌" };
  const body = (
    <div className="ua-cfg-ch-preview">
      <div className={`ua-cfg-ch-preview__card ua-cfg-ch-design--${design}`}>
        <span aria-hidden="true">{icons[design] || "🎂"}</span>
        <strong>{typeof editor.headline === "string" ? editor.headline : "Card"}</strong>
        <span>{typeof editor.subline === "string" ? editor.subline : ""}</span>
        <p>{typeof editor.description === "string" ? editor.description : ""}</p>
        <span>{typeof editor.footer === "string" ? editor.footer : ""}</span>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function TransformationPreview({ editor = {}, points = [], title = "Transformation" }) {
  const uploaded = Boolean(editor.uploaded || editor.beforeUploaded || editor.afterUploaded);
  const namePoint = points.find((entry) => ["name", "client_name"].includes(String(entry.field || "")));
  const name = namePoint?.value || editor.clientName || "Client story";
  const story =
    typeof editor.story === "string" && editor.story.trim()
      ? editor.story
      : "Story / caption shown with the photo…";
  const extras = points.filter((entry) => !["name", "client_name"].includes(String(entry.field || "")));
  const webOn = editor.webOn !== false;
  const appOn = editor.appOn !== false;

  function imageBox(className = "") {
    return (
      <div className={`ua-cfg-tf-live__image${uploaded ? " is-on" : ""}${className ? ` ${className}` : ""}`}>
        IMAGE
      </div>
    );
  }

  return (
    <div className="ua-cfg-tf-live">
      {webOn ? (
        <div className="ua-cfg-tf-live__pane">
          <span className="ua-cfg-bn-preview__label is-web">Website</span>
          <div className="ua-cfg-pt-live-preview">
            <div className="ua-cfg-pt-live-preview__bar">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>{title}</strong>
              <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
            </div>
            <div className="ua-cfg-pt-live-preview__layout">
              {imageBox()}
              <div className="ua-cfg-pt-live-preview__copy">
                <strong>{name}</strong>
                <p>{story}</p>
                {extras.map((entry) => (
                  <span key={entry.id}>{entry.label}: {entry.value}</span>
                ))}
                <em className="ua-cfg-tf-cta">Read story</em>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {appOn ? (
        <div className="ua-cfg-tf-live__pane ua-cfg-tf-live__pane--app">
          <span className="ua-cfg-bn-preview__label is-app">App</span>
          <div className="ua-cfg-bn-preview__phone ua-cfg-tf-live__phone">
            <div className="ua-cfg-bn-preview__phone-bar">
              <span>9:41</span>
              <strong>{title}</strong>
              <span aria-hidden="true">🔔</span>
            </div>
            <div className="ua-cfg-tf-live__app-body">
              <div className="ua-cfg-tf-live__app-head">
                <span className="ua-cfg-pt-live-preview__brand">IR</span>
                <strong>{title}</strong>
              </div>
              {imageBox("ua-cfg-tf-live__image--app")}
              <p>{story}</p>
              <div className="ua-cfg-preview-content__nav" aria-hidden="true">
                <span className="is-active">⌂</span>
                <span>▦</span>
                <span>☑</span>
                <span>👤</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!webOn && !appOn ? (
        <div className="ua-cfg-preview-modal__empty">
          <p>Turn on App or Web to preview this asset.</p>
        </div>
      ) : null}
    </div>
  );
}

function ClientReviewPreview({ editor = {}, published = [] }) {
  const live = published.filter((entry) => entry.live).slice(0, 3);
  const webOn = editor.webOn !== false;
  const appOn = editor.appOn !== false;

  function quoteList(compact = false) {
    if (!live.length) {
      return <p className="ua-cfg-panel__sub">No live reviews yet.</p>;
    }
    return live.map((entry) => (
      <article key={entry.id} className={`ua-cfg-cr-preview-card${compact ? " is-compact" : ""}`}>
        <strong>{entry.name}</strong>
        <span className="ua-cfg-cr-stars">★★★★★</span>
        <p>{entry.quote}</p>
      </article>
    ));
  }

  return (
    <div className="ua-cfg-tf-live">
      {webOn ? (
        <div className="ua-cfg-tf-live__pane">
          <span className="ua-cfg-bn-preview__label is-web">Website</span>
          <div className="ua-cfg-pt-live-preview">
            <div className="ua-cfg-pt-live-preview__bar">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>Client reviews</strong>
              <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
            </div>
            <div className="ua-cfg-cr-preview-list">{quoteList()}</div>
          </div>
        </div>
      ) : null}
      {appOn ? (
        <div className="ua-cfg-tf-live__pane ua-cfg-tf-live__pane--app">
          <span className="ua-cfg-bn-preview__label is-app">App</span>
          <div className="ua-cfg-bn-preview__phone ua-cfg-tf-live__phone">
            <div className="ua-cfg-bn-preview__phone-bar">
              <span>9:41</span>
              <strong>Reviews</strong>
              <span aria-hidden="true">🔔</span>
            </div>
            <div className="ua-cfg-tf-live__app-body">
              <div className="ua-cfg-tf-live__app-head">
                <span className="ua-cfg-pt-live-preview__brand">IR</span>
                <strong>Client reviews</strong>
              </div>
              <div className="ua-cfg-cr-preview-list ua-cfg-cr-preview-list--app">{quoteList(true)}</div>
              <div className="ua-cfg-preview-content__nav" aria-hidden="true">
                <span className="is-active">⌂</span>
                <span>▦</span>
                <span>☑</span>
                <span>👤</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!webOn && !appOn ? (
        <div className="ua-cfg-preview-modal__empty">
          <p>Turn on App or Web to preview this asset.</p>
        </div>
      ) : null}
    </div>
  );
}

function VoicePreview({ editor = {}, items = [], heading = "Voice of Healing" }) {
  const live = items.filter((entry) => entry.live);
  const featured = live[0];
  const uploaded = Boolean(editor.videoUploaded || editor.coverUploaded || (typeof editor.videoLink === "string" && editor.videoLink.trim()));
  const title = featured?.title || (typeof editor.clientName === "string" && editor.clientName.trim() ? `${editor.clientName}'s story` : heading);
  const webOn = editor.webOn !== false;
  const appOn = editor.appOn !== false;

  return (
    <div className="ua-cfg-tf-live">
      {webOn ? (
        <div className="ua-cfg-tf-live__pane">
          <span className="ua-cfg-bn-preview__label is-web">Website</span>
          <div className="ua-cfg-pt-live-preview">
            <div className="ua-cfg-pt-live-preview__bar">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>{heading}</strong>
              <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
            </div>
            <div className={`ua-cfg-vh-preview-video${uploaded ? " is-on" : ""}`}>▶ VIDEO</div>
            <p className="ua-cfg-ft-preview__copy">{title}</p>
          </div>
        </div>
      ) : null}
      {appOn ? (
        <div className="ua-cfg-tf-live__pane ua-cfg-tf-live__pane--app">
          <span className="ua-cfg-bn-preview__label is-app">App</span>
          <div className="ua-cfg-bn-preview__phone ua-cfg-tf-live__phone">
            <div className="ua-cfg-bn-preview__phone-bar">
              <span>9:41</span>
              <strong>Voice</strong>
              <span aria-hidden="true">🔔</span>
            </div>
            <div className="ua-cfg-tf-live__app-body">
              <div className="ua-cfg-tf-live__app-head">
                <span className="ua-cfg-pt-live-preview__brand">IR</span>
                <strong>{heading}</strong>
              </div>
              <div className={`ua-cfg-vh-preview-video ua-cfg-vh-preview-video--app${uploaded ? " is-on" : ""}`}>▶</div>
              <p>{title}</p>
              <div className="ua-cfg-preview-content__nav" aria-hidden="true">
                <span className="is-active">⌂</span>
                <span>▦</span>
                <span>☑</span>
                <span>👤</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!webOn && !appOn ? (
        <div className="ua-cfg-preview-modal__empty">
          <p>Turn on App or Web to preview this asset.</p>
        </div>
      ) : null}
    </div>
  );
}

function BannerPreview({ editor = {}, surface, item }) {
  const placement = bannerPlacementById(editor.placement);
  const image = surface === "app"
    ? (editor.mobilePreview || editor.mobileImage || editor.imagePreview || editor.image)
    : (editor.imagePreview || editor.image);
  const headline = typeof editor.headline === "string" ? editor.headline : "Banner";
  const body = asCopyString(editor.body);

  const bodyNode = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>{headline}</strong>
        <span className="ua-cfg-pt-live-preview__url">{placement.label}</span>
      </div>
      <div className={`ua-cfg-bn-preview__banner${image ? " is-on" : ""}`}>
        {image ? <img className="ua-cfg-bn-preview__img" src={image} alt="" /> : "BANNER"}
      </div>
      {body ? <p className="ua-cfg-ft-preview__copy">{body}</p> : null}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {bodyNode}
    </PreviewStage>
  );
}

function LocationsPreview({ locations = [], surface, item }) {
  const live = locations.filter((entry) => entry.live);

  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>Locations</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in/contact</span>
      </div>
      {live.length ? (
        <div className="ua-cfg-loc-preview">
          {live.map((entry) => (
            <div key={entry.id} className="ua-cfg-loc-preview__row">
              <span aria-hidden="true">📍</span>
              <div>
                <strong>{entry.name}</strong>
                <p>{entry.address}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">No live locations yet.</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function LogoSlotsPreview({ slots = [], surface, item }) {
  const header = slots.find((entry) => entry.id === "user_logo") ?? slots.find((entry) => entry.uploaded);

  const body = (
    <div className="ua-cfg-pt-live-preview">
      <div className="ua-cfg-pt-live-preview__bar">
        {header?.url ? (
          <img className="ua-cfg-lg-preview__brand-img" src={header.url} alt="" />
        ) : (
          <span className={`ua-cfg-pt-live-preview__brand${header?.uploaded ? "" : " is-empty"}`}>IR</span>
        )}
        <strong>Logo edit</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
      </div>
      <div className="ua-cfg-lg-preview">
        <div className="ua-cfg-lg-preview__slots">
          {slots.map((slot) => (
            <span key={slot.id} className={`ua-cfg-lg-preview__chip${slot.uploaded ? " is-on" : ""}`}>
              {slot.title}
              {slot.uploaded ? " · on" : " · empty"}
            </span>
          ))}
        </div>
        <div className="ua-cfg-pt-live-preview__layout">
          <div className={`ua-cfg-pt-live-preview__image${header?.uploaded ? " has-image" : ""}`}>
            {header?.url ? <img src={header.url} alt="" /> : "IMAGE"}
          </div>
          <div className="ua-cfg-pt-live-preview__copy">
            <span>Website</span>
            <strong>{header?.uploaded ? "Logo attached" : "Upload a website logo"}</strong>
            <p>{header?.size ?? "240 × 64"}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function ProgramTestimonialsPreview({ stories = [], surface, item }) {
  const live = stories.filter((entry) => entry.live);
  const story = live[0] ?? stories[0] ?? null;

  const body = (
    <div className="ua-cfg-pt-live-preview">
      <div className="ua-cfg-pt-live-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>Program Testimonials</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
      </div>
      {story ? (
        <div className="ua-cfg-pt-live-preview__layout">
          <div className={`ua-cfg-pt-live-preview__image${story.hasPhoto ? " has-image" : ""}`}>
            IMAGE
          </div>
          <div className="ua-cfg-pt-live-preview__copy">
            <span>{programTestimonialLabel(story.program)}</span>
            <strong>{asCopyString(story.headline) || asCopyString(story.name)}</strong>
            <p>{asCopyString(story.description) || "Program-specific story…"}</p>
            <em>{asCopyString(story.name)}</em>
          </div>
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">No live stories yet.</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function FooterSettingPreview({ bottomLine, surface, item }) {
  const copy = asCopyString(bottomLine);

  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>Footer</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
      </div>
      {copy ? (
        <p className="ua-cfg-ft-preview__copy">{copy}</p>
      ) : (
        <div className="ua-cfg-pt-preview__empty">No footer text yet.</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function SocialLinksPreview({ links = [], surface, item }) {
  const isWebsite = item?.id === "web-fs-links";
  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>{isWebsite ? "Website links" : "Footer"}</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
      </div>
      {links.length ? (
        <div className="ua-cfg-sm-preview">
          {links.map((entry) => (
            <span key={entry.id} className="ua-cfg-sm-preview__chip">
              {asCopyString(entry.label)}
            </span>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">{isWebsite ? "No website links yet." : "No social links yet."}</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function ContactDetailsPreview({ details = [], surface, item }) {
  const live = details.filter((entry) => entry.live);

  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>Contact us</strong>
        <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
      </div>
      {live.length ? (
        <div className="ua-cfg-ct-preview">
          {live.map((entry) => (
            <div key={entry.id} className="ua-cfg-ct-preview__row">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">No live contact details yet.</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function LeadershipPreview({ items = [] }) {
  const live = items.filter((entry) => entry.live);
  const featured = live[0];

  if (!featured) {
    return (
      <div className="ua-cfg-preview-modal__empty">
        <p>No live leadership notes to preview.</p>
      </div>
    );
  }

  const photo = featured.profileImage;
  const title = featured.title || featured.designation || "Leadership";

  return (
    <div className="ua-cfg-tf-live">
      <div className="ua-cfg-tf-live__pane">
        <span className="ua-cfg-bn-preview__label is-web">Website</span>
        <div className="ua-cfg-pt-live-preview">
          <div className="ua-cfg-pt-live-preview__bar">
            <span className="ua-cfg-pt-live-preview__brand">IR</span>
            <strong>Leadership Profile</strong>
            <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
          </div>
          {photo ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
              <img src={photo} alt="" />
            </div>
          ) : (
            <div className="ua-cfg-vh-preview-video">👤</div>
          )}
          <p className="ua-cfg-ft-preview__copy">{featured.badge || "A NOTE FROM LEADERSHIP"}</p>
          <p className="ua-cfg-ft-preview__copy"><strong>{featured.name}</strong> · {title}</p>
          {featured.message ? <p className="ua-cfg-ft-preview__copy">{featured.message}</p> : null}
        </div>
      </div>
      <div className="ua-cfg-tf-live__pane ua-cfg-tf-live__pane--app">
        <span className="ua-cfg-bn-preview__label is-app">App</span>
        <div className="ua-cfg-bn-preview__phone ua-cfg-tf-live__phone">
          <div className="ua-cfg-bn-preview__phone-bar">
            <span>9:41</span>
            <strong>About</strong>
            <span aria-hidden="true">🔔</span>
          </div>
          <div className="ua-cfg-tf-live__app-body">
            <div className="ua-cfg-tf-live__app-head">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>Leadership</strong>
            </div>
            {photo ? <img src={photo} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 8 }} /> : null}
            <p><strong>{featured.name}</strong></p>
            <p>{title}</p>
            {featured.message ? <p>{featured.message.slice(0, 120)}{featured.message.length > 120 ? "…" : ""}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleReviewPreview({ stats = [] }) {
  const rows = stats.filter((entry) => String(entry.value || "").trim());

  function statRow(surfaceLabel) {
    if (!rows.length) return <div className="ua-cfg-pt-preview__empty">No stats set yet.</div>;
    return (
      <div className="ua-cfg-gr-preview">
        {rows.map((entry) => (
          <div key={entry.id} className={`ua-cfg-gr-preview__stat ua-cfg-gr-preview__stat--${entry.tone}`}>
            <span>{asCopyString(entry.label)}</span>
            <strong>{asCopyString(entry.value)}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ua-cfg-tf-live">
      <div className="ua-cfg-tf-live__pane">
        <span className="ua-cfg-bn-preview__label is-web">Website</span>
        <div className="ua-cfg-pt-live-preview">
          <div className="ua-cfg-pt-live-preview__bar">
            <span className="ua-cfg-pt-live-preview__brand">IR</span>
            <strong>Google Review & Followers</strong>
            <span className="ua-cfg-pt-live-preview__url">irwellness.in</span>
          </div>
          {statRow("web")}
        </div>
      </div>
      <div className="ua-cfg-tf-live__pane ua-cfg-tf-live__pane--app">
        <span className="ua-cfg-bn-preview__label is-app">App</span>
        <div className="ua-cfg-bn-preview__phone ua-cfg-tf-live__phone">
          <div className="ua-cfg-bn-preview__phone-bar">
            <span>9:41</span>
            <strong>About</strong>
            <span aria-hidden="true">🔔</span>
          </div>
          <div className="ua-cfg-tf-live__app-body">
            <div className="ua-cfg-tf-live__app-head">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>Stats</strong>
            </div>
            {statRow("app")}
          </div>
        </div>
      </div>
    </div>
  );
}

function DropdownsPreview({ lists = [], surface, item }) {
  const shown = lists
    .map((list) => ({
      ...list,
      options: list.options.filter((entry) => entry.on),
    }))
    .filter((list) => list.options.length);

  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>Dropdown options</strong>
        <span className="ua-cfg-pt-live-preview__url">panel lists</span>
      </div>
      {shown.length ? (
        <div className="ua-cfg-dd-preview">
          {shown.map((list) => (
            <div key={list.id}>
              <strong>{asCopyString(list.title)}</strong>
              <p>{list.options.map((entry) => asCopyString(entry.label)).join(" · ")}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">No dropdown options are on yet.</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function LegalPreviewCopy({ text }) {
  const value = String(text || "").trim();
  if (!value) return null;
  if (looksLikeHtml(value)) {
    return <div className="ua-cfg-privacy__html" dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <p>{value}</p>;
}

function LegalBlocksPreview({
  blocks = [],
  surface,
  item,
  title = "Privacy policy",
  url = "irwellness.in/privacy-policy",
  empty = "No sections are shown yet.",
}) {
  const shown = blocks.filter((entry) => entry.shown);

  const body = (
    <div className="ua-cfg-ft-preview">
      <div className="ua-cfg-ft-preview__bar">
        <span className="ua-cfg-pt-live-preview__brand">IR</span>
        <strong>{title}</strong>
        <span className="ua-cfg-pt-live-preview__url">{url}</span>
      </div>
      {shown.length ? (
        <div className="ua-cfg-lb-preview">
          {shown.map((block) => (
            <div key={block.id}>
              {block.id === "intro" ? null : <strong>{block.title}</strong>}
              <LegalPreviewCopy text={liveVersionText(block, surface === "app" ? "app" : "web")} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cfg-pt-preview__empty">{empty}</div>
      )}
    </div>
  );

  return (
    <PreviewStage surface={surface} item={item}>
      {body}
    </PreviewStage>
  );
}

function renderPreviewBody(item, surface, previewState) {
  switch (item.id) {
    case "app-language-disable":
      return <LanguagePreview hindiOn={previewState.hindiOn} surface={surface} item={item} />;
    case "app-faq":
      return <FaqPreview items={previewState.faqItems ?? []} surface={surface} item={item} />;
    case "app-program":
      return <ProgramPreview rows={previewState.programRows ?? []} surface={surface} item={item} />;
    case "app-subscriptions":
      return <SubscriptionPreview rows={previewState.subscriptionRows ?? []} surface={surface} item={item} />;
    case "app-gst":
      return (
        <GstPreview
          gstOn={previewState.gstOn ?? true}
          gstPercent={previewState.gstPercent}
          surface={surface}
          item={item}
        />
      );
    case "app-payment-gateway":
      return (
        <PaymentGatewayPreview
          activeGateway={previewState.activeGateway ?? null}
          surface={surface}
          item={item}
        />
      );
    case "app-tos":
      return (
        <LegalTextPreview
          title="Terms of service"
          blocks={previewState.appTosBlocks ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-dpa":
      return (
        <LegalTextPreview
          title="Data processing agreement"
          blocks={previewState.dpaBlocks ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-measurement-video":
      return (
        <MeasurementVideoPreview
          guide={previewState.measurementGuide}
          parameters={previewState.measurementParams}
          surface={surface}
          item={item}
        />
      );
    case "app-onboarding-video":
      return (
        <OnboardingVideoPreview
          coaches={previewState.onboardingCoaches}
          selectedCoachId={previewState.onboardingSelectedCoachId}
          surface={surface}
          item={item}
        />
      );
    case "app-medical-questionnaire":
      return (
        <MedicalQuestionnairePreview
          items={previewState.medicalQuestions ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-health-progress":
      return (
        <HealthProgressPreview
          trackers={previewState.healthTrackers ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-diet-plans":
      return (
        <DietPlansPreview
          plans={previewState.dietPlans ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-nutrition-bank":
      return (
        <NutritionBankPreview
          items={previewState.nutritionBank ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-drf-bank":
      return (
        <DrfBankPreview
          sections={previewState.drfFormSections ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-rx-bank":
      return (
        <RxBankPreview
          protocols={previewState.rxProtocols ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-commitment-letter":
      return (
        <CommitmentLetterPreview
          text={normalizeCommitmentLetterText(previewState.commitmentText ?? COMMITMENT_LETTER_DEFAULT)}
          surface={surface}
          item={item}
        />
      );
    case "app-gallery":
      return (
        <GalleryPreview
          media={previewState.galleryMedia ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-launch":
      return (
        <LaunchPreview
          domains={previewState.launchDomains ?? []}
          surface={surface}
          item={item}
        />
      );
    case "app-ai-enable":
      return (
        <AiEnablePreview
          coaches={previewState.aiCoaches ?? []}
          assistants={previewState.aiAssistants ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-program-testimonials":
      return (
        <ProgramTestimonialsPreview
          stories={previewState.programStories ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-footer":
      return (
        <FooterSettingPreview
          bottomLine={previewState.footerBottomLine ?? ""}
          surface={surface}
          item={item}
        />
      );
    case "web-fs-social":
      return (
        <SocialLinksPreview
          links={previewState.socialLinks ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-fs-links":
      return (
        <SocialLinksPreview
          links={previewState.websiteLinks ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-fs-privacy":
      return (
        <LegalBlocksPreview
          blocks={previewState.privacyBlocks ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-fs-tos":
      return (
        <LegalBlocksPreview
          blocks={previewState.tosBlocks ?? []}
          surface={surface}
          item={item}
          title="Terms and Conditions"
          url="irwellness.in/terms-and-conditions"
          empty="No terms sections are shown yet."
        />
      );
    case "web-fs-guidelines":
      return (
        <LegalBlocksPreview
          blocks={previewState.guidelineBlocks ?? []}
          surface={surface}
          item={item}
          title="Community Guidelines"
          url="irwellness.in/community-guideline"
          empty="No guidelines are shown yet."
        />
      );
    case "web-fs-contact":
      return (
        <>
          <LegalBlocksPreview
            blocks={previewState.contactPageBlocks ?? []}
            surface={surface}
            item={item}
            title="Contact us"
            url="irwellness.in/contact-us"
            empty="No contact sections are shown yet."
          />
          <ContactDetailsPreview
            details={previewState.contactDetails ?? []}
            surface={surface}
            item={item}
          />
        </>
      );
    case "web-fs-text":
      return (
        <LegalBlocksPreview
          blocks={previewState.footerTextBlocks ?? []}
          surface={surface}
          item={item}
          title="Footer text"
          url="irwellness.in"
          empty="No footer lines are shown yet."
        />
      );
    case "web-logo":
      return (
        <LogoSlotsPreview
          slots={previewState.logoSlots ?? []}
          surface={surface}
          item={item}
        />
      );
    case "web-location":
      return (
        <LocationsPreview
          locations={previewState.locations ?? []}
          surface={surface}
          item={item}
        />
      );
    case "common-banner":
      return (
        <BannerPreview
          editor={previewState.bannerEditor}
          surface={surface}
          item={item}
        />
      );
    case "common-champion":
      return (
        <ChampionPreview
          editor={previewState.championEditor}
          surface={surface}
          item={item}
        />
      );
    case "common-birthday":
      return (
        <ChampionPreview
          editor={previewState.birthdayEditor}
          surface={surface}
          item={item}
        />
      );
    case "common-transformation":
      return (
        <TransformationPreview
          editor={{
            ...previewState.tfEditor,
            story: previewState.tfItems?.find((row) => row.live)?.description || previewState.tfEditor?.story,
            clientName: previewState.tfItems?.find((row) => row.live)?.name || "",
            beforeUploaded: Boolean(previewState.tfItems?.some((row) => row.oldImage)),
            afterUploaded: Boolean(previewState.tfItems?.some((row) => row.newImage)),
          }}
          points={previewState.tfItems?.find((row) => row.live)?.dataPoints || []}
        />
      );
    case "common-client-review":
      return (
        <ClientReviewPreview
          editor={previewState.crEditor}
          published={previewState.crPublished ?? []}
        />
      );
    case "common-real-people":
      return (
        <TransformationPreview
          editor={{
            ...previewState.rpEditor,
            story: previewState.rpItems?.find((row) => row.live)?.review || previewState.rpEditor?.story,
            clientName: previewState.rpItems?.find((row) => row.live)?.name || "",
            uploaded: Boolean(previewState.rpItems?.some((row) => row.profileImage)),
          }}
          points={previewState.rpItems?.find((row) => row.live)?.dataPoints || []}
          title="Real People Real Healing"
        />
      );
    case "common-voice":
      return (
        <VoicePreview
          editor={previewState.voiceEditor}
          items={previewState.voiceItems ?? []}
        />
      );
    case "common-cofounder":
      return (
        <VoicePreview
          editor={{
            ...previewState.cfEditor,
            videoUploaded: previewState.cfEditor?.videoUploaded
              || previewState.cfEditor?.type === "video"
              || Boolean(previewState.cfEditor?.videoLink),
            clientName: asCopyString(previewState.cfEditor?.name),
          }}
          items={previewState.cfRecord?.live ? [{
            id: previewState.cfRecord.id,
            title: asCopyString(previewState.cfRecord.name),
            live: true,
          }] : []}
          heading="Co-Founder Message"
        />
      );
    case "common-leadership":
      return (
        <LeadershipPreview items={previewState.ldItems ?? []} />
      );
    case "common-wellness-team":
      return (
        <VoicePreview
          editor={{
            ...previewState.wtEditor,
            videoUploaded: previewState.wtEditor?.videoUploaded || previewState.wtEditor?.appVideo || previewState.wtEditor?.webVideo,
            clientName: asCopyString(previewState.wtEditor?.name),
          }}
          items={(previewState.wtMessages ?? []).map((entry) => ({
            ...entry,
            title: asCopyString(entry.title),
          }))}
          heading="Wellness Team Profile"
        />
      );
    case "common-about":
      return (
        <LegalBlocksPreview
          blocks={previewState.aboutBlocks ?? []}
          surface={surface}
          item={item}
          title="About"
          url="irwellness.in/about-us"
          empty="No about blocks are shown yet."
        />
      );
    case "common-google-review":
      return (
        <GoogleReviewPreview stats={previewState.grStats ?? []} />
      );
    case "common-dropdowns":
      return (
        <DropdownsPreview
          lists={previewState.dropdownLists ?? []}
          surface={surface}
          item={item}
        />
      );
    case "common-recipes":
      return (
        <VoicePreview
          editor={{
            ...previewState.rcEditor,
            videoUploaded: (previewState.rcItems ?? []).some((entry) => entry.type === "VIDEO" || entry.type === "YT" || entry.cover || entry.thumbnail),
            clientName: asCopyString(previewState.rcItems?.find((entry) => entry.live)?.title),
          }}
          items={(previewState.rcItems ?? []).map((entry) => ({
            ...entry,
            title: asCopyString(entry.title),
          }))}
          heading="Healthy recipes"
        />
      );
    case "common-yoga":
      return (
        <VoicePreview
          editor={{
            ...previewState.ygEditor,
            videoUploaded: (previewState.ygItems ?? []).some((entry) => entry.type === "VIDEO" || entry.type === "YT" || entry.cover || entry.thumbnail),
            clientName: asCopyString(previewState.ygItems?.find((entry) => entry.live)?.title),
          }}
          items={(previewState.ygItems ?? []).map((entry) => ({
            ...entry,
            title: asCopyString(entry.title),
          }))}
          heading="Yoga & Pranayam"
        />
      );
    case "common-blogs":
      return (
        <VoicePreview
          editor={{
            ...previewState.blEditor,
            videoUploaded: (previewState.blPosts ?? []).some((entry) => entry.cover),
            clientName: asCopyString(previewState.blPosts?.find((entry) => entry.live)?.title),
          }}
          items={(previewState.blPosts ?? []).map((entry) => ({
            ...entry,
            title: asCopyString(entry.title),
          }))}
          heading="Blogs"
        />
      );
    case "feature-flags":
      return (
        <PreviewStage surface={surface} item={item}>
          <FeatureFlagsPreview flags={previewState.featureFlags ?? []} />
        </PreviewStage>
      );
    default:
      return <GenericPreview item={item} surface={surface} />;
  }
}

export function ConfigPreviewModal({ open, onClose, item, previewState = {} }) {
  const surfaces = useMemo(() => previewSurfaces(item), [item]);
  const [activeSurface, setActiveSurface] = useState(surfaces[0]?.id ?? "app");

  useEffect(() => {
    if (open) setActiveSurface(surfaces[0]?.id ?? "app");
  }, [open, surfaces]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  const subtitle = surfaceSubtitle(surfaces, activeSurface, item);

  return (
    <div className="ua-cfg-preview-modal" role="presentation" onClick={onClose}>
      <div
        className="ua-cfg-preview-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ua-cfg-preview-modal__head">
          <div className="ua-cfg-preview-modal__intro">
            <span className="ua-cfg-preview-modal__icon" aria-hidden="true">👁</span>
            <div>
              <h2 id="cfg-preview-title" className="ua-cfg-preview-modal__title">
                Live preview · {item.name}
              </h2>
              <p className="ua-cfg-preview-modal__sub">{subtitle}</p>
            </div>
          </div>
          <button type="button" className="ua-cfg-preview-modal__close" aria-label="Close preview" onClick={onClose}>
            ×
          </button>
        </div>

        {surfaces.length > 1 && item.id !== "common-transformation" && item.id !== "common-client-review" && item.id !== "common-real-people" && item.id !== "common-voice" && item.id !== "common-cofounder" && item.id !== "common-leadership" && item.id !== "common-wellness-team" && item.id !== "common-google-review" && item.id !== "common-recipes" && item.id !== "common-yoga" && item.id !== "common-blogs" ? (
          <div className="ua-cfg-preview-modal__tabs" role="tablist">
            {surfaces.map((surface) => (
              <button
                key={surface.id}
                type="button"
                role="tab"
                aria-selected={activeSurface === surface.id}
                className={`ua-cfg-preview-modal__tab${activeSurface === surface.id ? " is-active" : ""}`}
                onClick={() => setActiveSurface(surface.id)}
              >
                {surface.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className={`ua-cfg-preview-modal__frame ua-cfg-preview-modal__frame--${item.id === "common-transformation" || item.id === "common-client-review" || item.id === "common-real-people" || item.id === "common-voice" || item.id === "common-cofounder" || item.id === "common-leadership" || item.id === "common-wellness-team" || item.id === "common-google-review" || item.id === "common-recipes" || item.id === "common-yoga" || item.id === "common-blogs" ? "dual" : activeSurface}`}>
          {surfaces.length ? (
            renderPreviewBody(item, activeSurface, previewState)
          ) : (
            <div className="ua-cfg-preview-modal__empty">
              <p>Enable App or Web on the config list to preview this item.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function previewHintForItem(item) {
  if (item.id === "app-language-disable") {
    return "Toggle Hindi, then open Preview";
  }
  if (item.id === "app-faq" || item.id === "app-medical-questionnaire") {
    return "Edit questions, then open Preview";
  }
  if (item.id === "app-program" || item.id === "app-subscriptions") {
    return "Set pricing, then open Preview";
  }
  if (item.id === "app-gst") {
    return "Set GST percentage and collection, then open Preview";
  }
  if (item.id === "app-payment-gateway") {
    return "Pick a gateway, then open Preview";
  }
  if (item.id === "app-measurement-video") {
    return "Set the guide, then open Preview";
  }
  if (item.id === "app-health-progress") {
    return "Add or toggle trackers, then open Preview";
  }
  if (item.id === "feature-flags") {
    return "Toggle flags, then open Preview";
  }
  if (item.id === "web-program-testimonials" || item.id === "web-logo" || item.id === "common-banner" || item.id === "common-champion" || item.id === "common-birthday" || item.id === "common-transformation" || item.id === "common-client-review" || item.id === "common-real-people" || item.id === "common-voice" || item.id === "common-cofounder" || item.id === "common-leadership" || item.id === "common-wellness-team" || item.id === "common-about" || item.id === "common-google-review" || item.id === "common-dropdowns" || item.id === "common-recipes" || item.id === "common-yoga" || item.id === "common-blogs") {
    return "Upload something, then open Preview";
  }
  if (item.id === "web-footer") {
    return "Edit the footer text, then open Preview";
  }
  if (item.id === "web-fs-social") {
    return "Edit the links, then open Preview";
  }
  if (item.id === "web-fs-links") {
    return "Edit the links, then open Preview";
  }
  if (item.id === "web-fs-privacy" || item.id === "web-fs-tos" || item.id === "web-fs-guidelines" || item.id === "web-fs-text") {
    return "Edit the copy, then open Preview";
  }
  if (item.id === "web-fs-contact") {
    return "Edit the details, then open Preview";
  }
  if (item.id === "web-location") {
    return "Edit the locations, then open Preview";
  }
  if (item.id === "app-tos" || item.id === "app-dpa" || item.tags?.includes("Text")) {
    return "Edit the copy, then open Preview";
  }
  if (item.upload || item.tags?.includes("Upload")) {
    return "Upload something, then open Preview";
  }
  return "Open Preview before you publish";
}
