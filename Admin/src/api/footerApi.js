import api, { normalizeApiError } from "../api.js";
import { getLegalPage, saveLegalPage } from "./legalPageApi.js";
import { liveVersionText } from "../data/privacyConfigData.js";

function appConfigBase() {
  return "/admin/app-config";
}

const FOOTER_TEXT_SLUG = "footer-text";

export function normalizeFooterText(value) {
  return String(value ?? "").trim().slice(0, 100);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyrightBlockHtml(text) {
  const plain = normalizeFooterText(text);
  if (!plain) return "";
  if (/<[a-z][\s\S]*>/i.test(plain)) return plain;
  return `<p>${escapeHtml(plain)}</p>`;
}

/** Keep Static Pages `footer-text` copyright block aligned with App Config. */
async function syncFooterTextStaticPage(copyright) {
  const nextCopyright = normalizeFooterText(copyright);
  if (!nextCopyright) return;

  try {
    const page = await getLegalPage(FOOTER_TEXT_SLUG, []);
    const blocks = Array.isArray(page?.blocks) ? page.blocks.map((row) => ({ ...row })) : [];
    const copyrightIdx = blocks.findIndex((row) => row.id === "copyright");
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (copyrightIdx >= 0) {
      const block = { ...blocks[copyrightIdx] };
      const versions = Array.isArray(block.versions)
        ? block.versions.map((version) => ({ ...version }))
        : [];
      const webN = Number(block.webVersion) || versions[0]?.n || 1;
      const appN = Number(block.appVersion) || versions[0]?.n || 1;
      const touch = new Set([webN, appN]);
      let touched = false;
      for (const version of versions) {
        if (touch.has(Number(version.n))) {
          version.text = nextCopyright;
          version.date = today;
          version.author = "Admin";
          touched = true;
        }
      }
      if (!touched) {
        const n = (versions[0]?.n || 0) + 1;
        versions.unshift({
          n,
          date: today,
          author: "Admin",
          text: nextCopyright,
        });
        block.webVersion = n;
        block.appVersion = n;
      }
      block.versions = versions;
      block.shown = true;
      blocks[copyrightIdx] = block;
    } else {
      blocks.unshift({
        id: "copyright",
        title: "Copyright line",
        shown: true,
        webVersion: 1,
        appVersion: 1,
        versions: [
          {
            n: 1,
            date: today,
            author: "Admin",
            text: nextCopyright,
          },
        ],
      });
    }

    await saveLegalPage(FOOTER_TEXT_SLUG, {
      title: page?.title || "Footer text",
      blocks,
      content: copyrightBlockHtml(nextCopyright),
      status: page?.status || "active",
    });
  } catch {
    // App Config is the source of truth for the website footer; static-page sync is best-effort.
  }
}

export async function getAppFooterText() {
  try {
    const { data } = await api.get(appConfigBase());
    return normalizeFooterText(data?.data?.app_footer_text);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppFooterText(text) {
  try {
    const normalized = normalizeFooterText(text);
    const { data } = await api.patch(appConfigBase(), {
      app_footer_text: normalized,
    });
    const saved = normalizeFooterText(data?.data?.app_footer_text);
    await syncFooterTextStaticPage(saved);
    return saved;
  } catch (error) {
    normalizeApiError(error);
  }
}

/** When FS · Footer text is published, mirror the copyright block into App Config. */
export async function syncAppFooterTextFromBlocks(blocks = []) {
  const copyrightBlock = (Array.isArray(blocks) ? blocks : []).find(
    (row) => row?.id === "copyright" && row.shown !== false,
  );
  if (!copyrightBlock) return "";
  const text = normalizeFooterText(liveVersionText(copyrightBlock));
  if (!text) return "";
  try {
    const { data } = await api.patch(appConfigBase(), {
      app_footer_text: text,
    });
    return normalizeFooterText(data?.data?.app_footer_text);
  } catch {
    return text;
  }
}
