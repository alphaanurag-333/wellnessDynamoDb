import { useEffect, useMemo, useState } from "react";
import { formatRupee } from "../data/exchangeData.js";
import { paymentMethodsForGateway } from "../data/configDetailData.js";

function previewSurfaces(item) {
  const surfaces = [];
  if (item.app) surfaces.push({ id: "app", label: "App", ratio: "9:16" });
  if (item.web) surfaces.push({ id: "web", label: "Web", ratio: "16:9" });
  return surfaces;
}

function surfaceSubtitle(surfaces, activeId, item) {
  if (!surfaces.length) return "No surfaces enabled · 16:9";
  const active = surfaces.find((entry) => entry.id === activeId) ?? surfaces[0];
  if (active.id === "app" && item?.app && !item?.web) return "App only · 16:9";
  if (active.id === "web" && item?.web && !item?.app) return "Web only · 16:9";
  return `${active.label} · ${active.ratio}`;
}

function PreviewStage({ surface, item, children }) {
  const stageSub =
    surface === "app" && item.app && !item.web
      ? "App only · 16:9"
      : surface === "web" && item.web && !item.app
        ? "Web only · 16:9"
        : `${surface === "app" ? "App" : "Web"} · ${surface === "app" ? "9:16" : "16:9"}`;

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

function GstPreview({ gstOn, surface, item }) {
  const amount = 24999;
  const gst = Math.round(amount * 0.18);
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
                  <span>GST (18%)</span>
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
                  <span className={`ua-cfg-preview-mv__param-thumb${entry.hasImage ? " has-image" : ""}`} />
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
                  <div className="ua-cfg-preview-mq__field">Your answer</div>
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
          {items?.length ? (
            <div className="ua-cfg-preview-nb__list">
              {items.map((entry) => (
                <div key={entry.id} className="ua-cfg-preview-nb__item">
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{entry.pack}</span>
                  </div>
                  <span>Rs. {entry.price.toLocaleString("en-IN")}</span>
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

function LegalTextPreview({ title, copy, surface, item }) {
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
            <p>{copy?.intro}</p>
            {copy?.bullets?.length ? (
              <ul>
                {copy.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
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
      return <GstPreview gstOn={previewState.gstOn ?? true} surface={surface} item={item} />;
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
          copy={previewState.tosCopy}
          surface={surface}
          item={item}
        />
      );
    case "app-dpa":
      return (
        <LegalTextPreview
          title="Data processing agreement"
          copy={previewState.dpaCopy}
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

        {surfaces.length > 1 ? (
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

        <div className={`ua-cfg-preview-modal__frame ua-cfg-preview-modal__frame--${activeSurface}`}>
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
    return "Toggle GST collection, then open Preview";
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
  if (item.id === "app-tos" || item.id === "app-dpa" || item.tags?.includes("Text")) {
    return "Edit the copy, then open Preview";
  }
  if (item.upload || item.tags?.includes("Upload")) {
    return "Upload something, then open Preview";
  }
  return "Open Preview before you publish";
}
