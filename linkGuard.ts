export type LinkSafetyVerdict = "safe" | "caution" | "danger" | "unavailable";

export interface LinkSafetyReport {
  originalUrl: string;
  resolvedUrl: string;
  hostname: string;
  verdict: LinkSafetyVerdict;
  allowOpen: boolean;
  isDownloadRisk: boolean;
  safeBrowsingConfigured: boolean;
  checkedProviders: string[];
  reasons: {
    ar: string[];
    en: string[];
  };
  checkedAt: number;
}

export function isSafeBrowsingConfigured(): boolean {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY?.trim();
  if (!key) return false;
  if (
    key === "YOUR_OPTIONAL_GOOGLE_SAFE_BROWSING_API_KEY" ||
    key.startsWith("MY_") ||
    key.startsWith("YOUR_")
  ) {
    return false;
  }
  return true;
}

const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".msi",
  ".apk",
  ".bat",
  ".cmd",
  ".scr",
  ".ps1",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".jar",
  ".dll",
  ".com",
  ".pif",
  ".hta",
  ".cpl",
  ".dmg",
  ".pkg",
  ".iso",
  ".img",
  ".sh",
  ".deb",
  ".rpm",
];

const ARCHIVE_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".cab", ".xz"];

const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rb.gy",
  "cutt.ly",
  "shorturl.at",
  "rebrand.ly",
  "tiny.cc",
  "bit.do",
  "adf.ly",
  "bl.ink",
]);

const HIGH_ABUSE_TLDS = new Set([
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "zip",
  "mov",
  "click",
  "top",
  "work",
  "country",
  "stream",
  "download",
]);

const PROTECTED_BRANDS: Array<{ keyword: string; legitimateHosts: string[] }> = [
  { keyword: "google", legitimateHosts: ["google.com", "google.co", "googleapis.com", "gstatic.com", "googleusercontent.com", "youtube.com"] },
  { keyword: "paypal", legitimateHosts: ["paypal.com", "paypal.me"] },
  { keyword: "apple", legitimateHosts: ["apple.com", "icloud.com"] },
  { keyword: "microsoft", legitimateHosts: ["microsoft.com", "live.com", "office.com", "azure.com", "github.com"] },
  { keyword: "amazon", legitimateHosts: ["amazon.com", "amazon.ae", "amazon.sa", "amazon.eg", "aws.amazon.com"] },
  { keyword: "facebook", legitimateHosts: ["facebook.com", "fb.com", "meta.com"] },
  { keyword: "whatsapp", legitimateHosts: ["whatsapp.com", "wa.me"] },
  { keyword: "netflix", legitimateHosts: ["netflix.com"] },
  { keyword: "binance", legitimateHosts: ["binance.com", "binance.us"] },
];

const LURE_TOKENS = [
  "login",
  "signin",
  "verify",
  "verification",
  "secure",
  "security",
  "account",
  "update",
  "confirm",
  "wallet",
  "reset",
  "billing",
  "support-center",
];

// In-memory OpenPhish cache refreshed every 15 minutes
let openPhishUrls = new Set<string>();
let openPhishHosts = new Set<string>();
let openPhishLastFetched = 0;
let openPhishInFlight: Promise<boolean> | null = null;
const OPENPHISH_TTL_MS = 15 * 60 * 1000;

// Short-lived per-URL scan cache (5 minutes)
const scanCache = new Map<string, { report: LinkSafetyReport; expiresAt: number }>();
const SCAN_CACHE_TTL_MS = 5 * 60 * 1000;

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    lower === "localhost" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower === "::" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 private / loopback / link-local ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  // IPv6 private/link-local
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
    return true;
  }

  return false;
}

function isRawIpAddress(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "");
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(clean) ||
    clean.includes(":")
  );
}

function isGoogleGroundingRedirect(urlObj: URL): boolean {
  const host = urlObj.hostname.toLowerCase();
  return (
    host === "vertexaisearch.cloud.google.com" &&
    urlObj.pathname.includes("grounding-api-redirect")
  );
}

async function safelyUnwrapGroundingUrl(rawUrl: string): Promise<string> {
  let current = rawUrl;
  for (let hop = 0; hop < 3; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return current;
    }

    if (!isGoogleGroundingRedirect(parsed)) {
      return current;
    }

    try {
      const res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
        headers: {
          "User-Agent": "NOVA-AI-LinkGuard/1.0",
        },
      });
      const location = res.headers.get("location");
      if (!location) {
        return current;
      }
      const nextUrl = new URL(location, current);
      if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
        return nextUrl.toString();
      }
      if (isPrivateOrLocalHost(nextUrl.hostname)) {
        return nextUrl.toString();
      }
      current = nextUrl.toString();
    } catch {
      return current;
    }
  }
  return current;
}

async function ensureOpenPhishLoaded(): Promise<boolean> {
  const now = Date.now();
  if (openPhishUrls.size > 0 && now - openPhishLastFetched < OPENPHISH_TTL_MS) {
    return true;
  }
  if (openPhishInFlight) {
    return openPhishInFlight;
  }

  openPhishInFlight = (async () => {
    try {
      const res = await fetch("https://openphish.com/feed.txt", {
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return openPhishUrls.size > 0;
      const text = await res.text();
      const nextUrls = new Set<string>();
      const nextHosts = new Set<string>();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("http")) continue;
        nextUrls.add(trimmed.toLowerCase());
        try {
          nextHosts.add(new URL(trimmed).hostname.toLowerCase());
        } catch {
          // ignore malformed line
        }
      }
      if (nextUrls.size > 0) {
        openPhishUrls = nextUrls;
        openPhishHosts = nextHosts;
        openPhishLastFetched = Date.now();
      }
      return openPhishUrls.size > 0;
    } catch {
      return openPhishUrls.size > 0;
    } finally {
      openPhishInFlight = null;
    }
  })();

  return openPhishInFlight;
}

async function checkCloudflareSecurityDns(hostname: string): Promise<{
  checked: boolean;
  blocked: boolean;
  detail?: string;
}> {
  if (!hostname || isRawIpAddress(hostname) || isPrivateOrLocalHost(hostname)) {
    return { checked: false, blocked: false };
  }

  try {
    const res = await fetch(
      `https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(2500),
      }
    );
    if (!res.ok) {
      return { checked: false, blocked: false };
    }
    const data = (await res.json()) as {
      Answer?: Array<{ data?: string }>;
      Comment?: string[];
    };

    const answers = Array.isArray(data.Answer) ? data.Answer : [];
    const comments = Array.isArray(data.Comment) ? data.Comment : [];
    const blockedByZeroIp = answers.some(
      (a) => a.data === "0.0.0.0" || a.data === "::"
    );
    const blockedByComment = comments.some(
      (c) =>
        c.includes("EDE(16)") ||
        c.toLowerCase().includes("censored") ||
        c.toLowerCase().includes("filtered") ||
        c.toLowerCase().includes("blocked")
    );

    return {
      checked: true,
      blocked: blockedByZeroIp || blockedByComment,
      detail: comments.join("; "),
    };
  } catch {
    return { checked: false, blocked: false };
  }
}

async function checkGoogleSafeBrowsing(url: string): Promise<{
  checked: boolean;
  threatType?: string;
}> {
  if (!isSafeBrowsingConfigured()) {
    return { checked: false };
  }
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY!.trim();

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3000),
        body: JSON.stringify({
          client: { clientId: "nova-ai-link-guard", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      }
    );
    if (!res.ok) {
      return { checked: false };
    }
    const data = (await res.json()) as {
      matches?: Array<{ threatType?: string }>;
    };
    const match = data.matches?.[0];
    return {
      checked: true,
      threatType: match?.threatType,
    };
  } catch {
    return { checked: false };
  }
}

function elevate(
  current: LinkSafetyVerdict,
  next: LinkSafetyVerdict
): LinkSafetyVerdict {
  const rank: Record<LinkSafetyVerdict, number> = {
    safe: 0,
    unavailable: 1,
    caution: 2,
    danger: 3,
  };
  return rank[next] > rank[current] ? next : current;
}

export async function inspectUrlSafety(
  rawInput: string
): Promise<LinkSafetyReport> {
  const originalUrl = rawInput.trim();
  const safeBrowsingConfigured = isSafeBrowsingConfigured();
  const cacheKey = `${safeBrowsingConfigured ? "gsb1" : "gsb0"}::${originalUrl}`;
  const cached = scanCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.report;
  }

  const reasonsAr: string[] = [];
  const reasonsEn: string[] = [];
  const checkedProviders: string[] = ["Protocol & Heuristic Guard"];
  let verdict: LinkSafetyVerdict = safeBrowsingConfigured
    ? "safe"
    : "unavailable";
  let allowOpen = true;
  let isDownloadRisk = false;

  // Step 1: Parse initial URL & reject executable / dangerous schemes
  let initialParsed: URL;
  try {
    initialParsed = new URL(originalUrl);
  } catch {
    return {
      originalUrl,
      resolvedUrl: originalUrl,
      hostname: "",
      verdict: "danger",
      allowOpen: false,
      isDownloadRisk: false,
      safeBrowsingConfigured,
      checkedProviders,
      reasons: {
        ar: ["صيغة الرابط غير صالحة أو مشوّهة."],
        en: ["The URL syntax is invalid or malformed."],
      },
      checkedAt: Date.now(),
    };
  }

  const proto = initialParsed.protocol.toLowerCase();
  if (proto !== "https:" && proto !== "http:") {
    return {
      originalUrl,
      resolvedUrl: originalUrl,
      hostname: initialParsed.hostname || proto,
      verdict: "danger",
      allowOpen: false,
      isDownloadRisk: false,
      safeBrowsingConfigured,
      checkedProviders,
      reasons: {
        ar: [
          `تم حظر البروتوكول الخطير (${proto}) لمنع تنفيذ الأكواد أو الوصول إلى الملفات المحلية.`,
        ],
        en: [
          `Blocked dangerous protocol (${proto}) to prevent script execution or local file access.`,
        ],
      },
      checkedAt: Date.now(),
    };
  }

  // Step 2: Safely unwrap Google Search grounding proxy URLs to scan the REAL target domain
  const resolvedUrl = await safelyUnwrapGroundingUrl(originalUrl);
  let parsed: URL;
  try {
    parsed = new URL(resolvedUrl);
  } catch {
    parsed = initialParsed;
  }

  const finalProto = parsed.protocol.toLowerCase();
  if (finalProto !== "https:" && finalProto !== "http:") {
    return {
      originalUrl,
      resolvedUrl,
      hostname: parsed.hostname || finalProto,
      verdict: "danger",
      allowOpen: false,
      isDownloadRisk: false,
      safeBrowsingConfigured,
      checkedProviders,
      reasons: {
        ar: [`يعيد الرابط التوجيه إلى بروتوكول خطير محظور (${finalProto}).`],
        en: [`Link redirects to a blocked dangerous protocol (${finalProto}).`],
      },
      checkedAt: Date.now(),
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathnameLower = parsed.pathname.toLowerCase();
  const fullLower = resolvedUrl.toLowerCase();

  // Step 3: SSRF / Private network / Credentials / Raw IP checks
  if (isPrivateOrLocalHost(hostname)) {
    verdict = "danger";
    allowOpen = false;
    reasonsAr.push("يشير الرابط إلى عنوان شبكة محلية أو داخلية (محظور للحماية).");
    reasonsEn.push("URL targets a local or private internal network address (blocked).");
  } else if (isRawIpAddress(hostname)) {
    verdict = elevate(verdict, "danger");
    reasonsAr.push("يستخدم الرابط عنوان IP مباشر بدل اسم نطاق موثوق (مؤشر شائع للتصيد أو البرمجيات الخبيثة).");
    reasonsEn.push("Uses a raw IP address instead of a domain name (common phishing/malware indicator).");
  }

  if (parsed.username || parsed.password) {
    verdict = elevate(verdict, "danger");
    reasonsAr.push("يحتوي الرابط على بيانات اعتماد مضمّنة (@) تُستخدم لإخفاء الوجهة الحقيقية.");
    reasonsEn.push("Contains embedded credentials (@) often used to disguise phishing destinations.");
  }

  // Step 4: Unencrypted HTTP check
  if (finalProto === "http:") {
    verdict = elevate(verdict, "caution");
    reasonsAr.push("الاتصال غير مشفّر (HTTP بدل HTTPS) وقد يكون عرضة للاعتراض.");
    reasonsEn.push("Connection is unencrypted (HTTP instead of HTTPS).");
  }

  // Step 5: Auto-download & Executable File Guard
  const matchedExecExt = DANGEROUS_EXTENSIONS.find((ext) =>
    pathnameLower.endsWith(ext)
  );
  const matchedArchiveExt = ARCHIVE_EXTENSIONS.find((ext) =>
    pathnameLower.endsWith(ext)
  );
  const hasForcedDownloadParam =
    /(?:^|[?&])(download|attachment|dl)=(1|true|yes)/i.test(parsed.search) ||
    parsed.search.toLowerCase().includes("content-disposition=attachment");

  if (matchedExecExt) {
    verdict = elevate(verdict, "danger");
    isDownloadRisk = true;
    reasonsAr.push(
      `تحذير تنزيل تنفيذي: يشير الرابط مباشرة إلى ملف قابل للتشغيل (${matchedExecExt}). تم منع التنزيل التلقائي.`
    );
    reasonsEn.push(
      `Executable download risk: link points directly to an executable file (${matchedExecExt}). Automatic download blocked.`
    );
  } else if (matchedArchiveExt || hasForcedDownloadParam) {
    verdict = elevate(verdict, "caution");
    isDownloadRisk = true;
    reasonsAr.push(
      "يشير الرابط إلى ملف مضغوط أو تنزيل مباشر. تأكد من موثوقية المصدر قبل الفتح."
    );
    reasonsEn.push(
      "Link points to an archive or direct file download. Verify the source before proceeding."
    );
  }

  // Step 6: Homograph / Punycode / Shortener / Brand Impersonation Heuristics
  if (hostname.includes("xn--")) {
    verdict = elevate(verdict, "caution");
    reasonsAr.push("يستخدم النطاق ترميز Punycode (xn--) الذي قد يُستغل لتقليد أسماء مواقع معروفة.");
    reasonsEn.push("Domain uses Punycode (xn--), which can be abused for homograph lookalike attacks.");
  }

  if (URL_SHORTENERS.has(hostname)) {
    verdict = elevate(verdict, "caution");
    reasonsAr.push("هذا رابط مختصر يُخفي الوجهة النهائية الفعلية للموقع.");
    reasonsEn.push("This is a shortened URL that conceals its final destination.");
  }

  const hostLabels = hostname.split(".").filter(Boolean);
  const tld = hostLabels[hostLabels.length - 1] ?? "";
  if (HIGH_ABUSE_TLDS.has(tld)) {
    verdict = elevate(verdict, "caution");
    reasonsAr.push(`يستخدم الموقع نطاقًا علويًا مرتفع المخاطر (.${tld}).`);
    reasonsEn.push(`Domain uses a higher-abuse top-level domain (.${tld}).`);
  }

  if (hostLabels.length >= 5) {
    verdict = elevate(verdict, "caution");
    reasonsAr.push("يحتوي الرابط على عدد غير معتاد من النطاقات الفرعية.");
    reasonsEn.push("URL contains an unusually deep chain of subdomains.");
  }

  // Brand impersonation + phishing lure check
  for (const brand of PROTECTED_BRANDS) {
    if (hostname.includes(brand.keyword)) {
      const isLegit = brand.legitimateHosts.some(
        (legit) => hostname === legit || hostname.endsWith(`.${legit}`)
      );
      if (!isLegit) {
        const hasLure = LURE_TOKENS.some((tok) => fullLower.includes(tok));
        if (hasLure) {
          verdict = elevate(verdict, "danger");
          reasonsAr.push(
            `اشتباه قوي بالتصيد: يحاول النطاق تقليد علامة معروفة (${brand.keyword}) مع كلمات تسجيل دخول أو تحقق.`
          );
          reasonsEn.push(
            `High phishing suspicion: domain imitates a known brand (${brand.keyword}) alongside login/verification lures.`
          );
        } else {
          verdict = elevate(verdict, "caution");
          reasonsAr.push(
            `يذكر النطاق اسم علامة معروفة (${brand.keyword}) خارج موقعها الرسمي.`
          );
          reasonsEn.push(
            `Domain references a known brand (${brand.keyword}) outside its official host.`
          );
        }
        break;
      }
    }
  }

  // Step 7: Live External Threat Intelligence Checks
  // When GOOGLE_SAFE_BROWSING_API_KEY is not configured, link scanning via Safe Browsing
  // is skipped cleanly without blocking NOVA AI, and a clear temporary-unavailability notice is returned.
  if (allowOpen && safeBrowsingConfigured) {
    const [cfResult, openPhishReady, gsbResult] = await Promise.all([
      checkCloudflareSecurityDns(hostname),
      ensureOpenPhishLoaded(),
      checkGoogleSafeBrowsing(resolvedUrl),
    ]);

    if (cfResult.checked) {
      checkedProviders.push("Cloudflare Security DNS");
      if (cfResult.blocked) {
        verdict = elevate(verdict, "danger");
        reasonsAr.push(
          "مصنّف كموقع خبيث أو تصيّد عبر خدمة فحص التهديدات Cloudflare Security DNS."
        );
        reasonsEn.push(
          "Flagged as malware or phishing by Cloudflare Security DNS threat intelligence."
        );
      }
    }

    if (openPhishReady) {
      checkedProviders.push("OpenPhish Threat Feed");
      if (openPhishUrls.has(fullLower) || openPhishHosts.has(hostname)) {
        verdict = elevate(verdict, "danger");
        reasonsAr.push(
          "مُدرج ضمن قائمة مواقع التصيد النشطة في قاعدة بيانات OpenPhish."
        );
        reasonsEn.push(
          "Listed in the active OpenPhish phishing intelligence feed."
        );
      }
    }

    if (gsbResult.checked) {
      checkedProviders.push("Google Safe Browsing");
      if (gsbResult.threatType) {
        verdict = elevate(verdict, "danger");
        reasonsAr.push(
          `تم رصد تهديد (${gsbResult.threatType}) عبر خدمة Google Safe Browsing.`
        );
        reasonsEn.push(
          `Threat detected (${gsbResult.threatType}) by Google Safe Browsing.`
        );
      }
    }
  } else if (allowOpen && !safeBrowsingConfigured) {
    reasonsAr.unshift(
      "فحص الروابط المتقدم غير متاح مؤقتاً لعدم توفر مفتاح Google Safe Browsing؛ تم تطبيق فحص البروتوكول والروابط المحلية فقط."
    );
    reasonsEn.unshift(
      "External link scanning is temporarily unavailable because Google Safe Browsing is not configured; local protocol and download checks remain active."
    );
  }

  if (reasonsAr.length === 0) {
    reasonsAr.push(
      "الرابط يستخدم اتصال HTTPS آمنًا ولم تُرصد عليه تهديدات تصيد أو برمجيات خبيثة."
    );
    reasonsEn.push(
      "Uses HTTPS and passed live threat intelligence, phishing, and download checks."
    );
  }

  const report: LinkSafetyReport = {
    originalUrl,
    resolvedUrl,
    hostname,
    verdict,
    allowOpen,
    isDownloadRisk,
    safeBrowsingConfigured,
    checkedProviders,
    reasons: {
      ar: reasonsAr,
      en: reasonsEn,
    },
    checkedAt: Date.now(),
  };

  scanCache.set(cacheKey, {
    report,
    expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
  });

  // Prevent unbounded cache growth
  if (scanCache.size > 500) {
    const firstKey = scanCache.keys().next().value;
    if (firstKey) scanCache.delete(firstKey);
  }

  return report;
}

export function redactServerSecrets(text: string): string {
  let output = text;
  const secrets = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_SAFE_BROWSING_API_KEY,
  ].filter((s): s is string => typeof s === "string" && s.length >= 12);

  for (const secret of secrets) {
    if (output.includes(secret)) {
      output = output.split(secret).join("[REDACTED]");
    }
  }
  return output;
}
