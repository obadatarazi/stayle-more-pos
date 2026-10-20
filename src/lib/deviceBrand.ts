// Best-effort phone brand, used only to show the right "allow home-screen shortcuts" steps.
// Chrome reduces the user-agent model to "K", so ask User-Agent Client Hints for the real model.

export type PhoneBrand = "xiaomi" | "samsung" | "oppo" | "realme" | "vivo" | "huawei" | "other";

type UAData = { getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }> };

function brandFromModel(model: string): PhoneBrand {
  const m = model.toLowerCase();
  if (/redmi|poco|xiaomi|^mi |^m\d{4}|^\d{5,}[a-z0-9]*$/.test(m)) return "xiaomi";
  if (/^sm-|samsung|galaxy/.test(m)) return "samsung";
  if (/^cph|oppo/.test(m)) return "oppo";
  if (/^rmx|realme/.test(m)) return "realme";
  if (/^v\d{4}|vivo|iqoo/.test(m)) return "vivo";
  if (/huawei|honor|^(ele|vog|ana|noh|lio|mar|jny|cdy|nam|bne|fne|rmo|crt)-/.test(m)) return "huawei";
  return "other";
}

export async function detectPhoneBrand(): Promise<PhoneBrand> {
  try {
    const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      const { model } = await uaData.getHighEntropyValues(["model"]);
      if (model) return brandFromModel(model);
    }
  } catch {
    // fall through to the user-agent string
  }
  const match = navigator.userAgent.match(/Android [^;]+; ([^)]+?)(?: Build|\))/);
  return match ? brandFromModel(match[1]) : "other";
}

export function isSamsungInternet() {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

/** Android intent link that opens this page in Samsung Internet (falls back to the same page). */
export function samsungInternetUrl() {
  const { host, pathname, search, href } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.sec.android.app.sbrowser;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
