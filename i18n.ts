import type { Language } from "../types/chat.ts";

export const COPY: Record<
  Language,
  {
    brand: string;
    newChat: string;
    searchPlaceholder: string;
    noThreads: string;
    noSearchMatches: string;
    conversations: string;
    today: string;
    earlier: string;
    settingsButton: string;
    closePanel: string;
    tabPersona: string;
    tabMemory: string;
    tabSecurity: string;
    activeRole: string;
    responseStyleLabel: string;
    systemInstructionLabel: string;
    systemInstructionHint: string;
    resetInstruction: string;
    saveInstruction: string;
    savedNotice: string;
    autoSpeakLabel: string;
    autoSpeakHint: string;
    memoryTitle: string;
    memoryConsentLabel: string;
    memoryConsentHint: string;
    memoryAddPlaceholder: string;
    memoryAddButton: string;
    memoryEmpty: string;
    memoryClearAll: string;
    memoryActiveTag: string;
    memoryAutoTag: string;
    memoryManualTag: string;
    securityTitle: string;
    securitySubtitle: string;
    securityRulesList: string[];
    securityTesterLabel: string;
    securityTesterPlaceholder: string;
    securityTesterButton: string;
    securityChecking: string;
    verdictSafe: string;
    verdictCaution: string;
    verdictDanger: string;
    safeModalTitleCaution: string;
    safeModalTitleDanger: string;
    safeModalTitleBlocked: string;
    safeModalTitleSafe: string;
    safeModalDestination: string;
    safeModalProviders: string;
    safeModalReasons: string;
    safeModalDownloadWarning: string;
    safeModalCancel: string;
    safeModalOpenSafe: string;
    safeModalProceedRisk: string;
    safeModalBlockedNotice: string;
    inspectLinkReport: string;
    composerPlaceholder: string;
    send: string;
    stop: string;
    attachFiles: string;
    removeAttachment: string;
    webSearchAuto: string;
    webSearchOn: string;
    webSearchOff: string;
    webSearchAutoHint: string;
    webSearchOnHint: string;
    webSearchOffHint: string;
    webSearchUsedBadge: string;
    webSearchAutoUsedBadge: string;
    voiceRecordStart: string;
    voiceRecordStop: string;
    voiceCancel: string;
    voiceTranscribing: string;
    voicePermissionError: string;
    voiceUnsupportedError: string;
    listen: string;
    loadingAudio: string;
    stopAudio: string;
    audioError: string;
    sourcesHeading: string;
    copy: string;
    copied: string;
    regenerate: string;
    replyWithoutSearch: string;
    retryWithFastModel: string;
    exportMarkdown: string;
    deleteThread: string;
    untitledThread: string;
    youLabel: string;
    assistantLabel: string;
    thinkingMessage: string;
    searchingMessage: string;
    verifyingLinksMessage: string;
    emptyHeading: string;
    emptySubheading: string;
    rolePickerHeading: string;
    themeLight: string;
    themeDark: string;
    langToggle: string;
    scrollToBottom: string;
    messagesCount: (n: number) => string;
    attachmentLimitError: string;
    attachmentUnsupportedError: string;
    networkError: string;
    keyboardHint: string;
    customRoleIndicator: string;
    pdfBadge: string;
    textFileBadge: string;
  }
> = {
  ar: {
    brand: "NOVA AI",
    newChat: "محادثة جديدة",
    searchPlaceholder: "ابحث في المحادثات…",
    noThreads: "لا توجد محادثات محفوظة بعد.",
    noSearchMatches: "لم يتم العثور على محادثات مطابقة.",
    conversations: "السجل",
    today: "اليوم",
    earlier: "سابقًا",
    settingsButton: "الإعدادات والحماية",
    closePanel: "إغلاق اللوحة",
    tabPersona: "الشخصية",
    tabMemory: "الذاكرة",
    tabSecurity: "الحماية",
    activeRole: "اختر التخصّص",
    responseStyleLabel: "أسلوب الرد",
    systemInstructionLabel: "تعليمات النظام لهذه المحادثة",
    systemInstructionHint:
      "توجّه هذه التعليمات شخصية NOVA AI وأسلوب ردوده طوال المحادثة الحالية.",
    resetInstruction: "استعادة الافتراضي",
    saveInstruction: "تطبيق التعديل",
    savedNotice: "تم التحديث",
    autoSpeakLabel: "قراءة الردود صوتيًا تلقائيًا",
    autoSpeakHint: "تشغيل الصوت تلقائيًا عند اكتمال كل رد جديد من NOVA AI.",
    memoryTitle: "ذاكرة المحادثات السابقة",
    memoryConsentLabel: "تفعيل الذاكرة بموافقتي",
    memoryConsentHint:
      "عند التفعيل، يحفظ NOVA AI الحقائق والتفضيلات التي تشاركها صراحةً ليستخدمها في محادثاتك القادمة. يمكنك مراجعتها أو حذفها في أي وقت.",
    memoryAddPlaceholder: "أضف معلومة أو تفضيلًا ليتذكّره NOVA AI…",
    memoryAddButton: "إضافة",
    memoryEmpty: "لا توجد عناصر محفوظة في الذاكرة بعد.",
    memoryClearAll: "مسح الذاكرة",
    memoryActiveTag: "الذاكرة مفعّلة",
    memoryAutoTag: "تلقائي",
    memoryManualTag: "يدوي",
    securityTitle: "درع حماية الويب والروابط",
    securitySubtitle:
      "يفحص NOVA AI جميع روابط المصادر والروابط الخارجية عبر الخادم قبل فتحها لحمايتك من التصيّد والبرمجيات الخبيثة والتنزيلات التلقائية.",
    securityRulesList: [
      "فحص مباشر عبر Cloudflare Security DNS وقاعدة OpenPhish للتصيد (وGoogle Safe Browsing عند تفعيله).",
      "كشف الوجهة الحقيقية للروابط وحظر البروتوكولات الخطيرة (javascript / data / file) وعناوين الشبكات الداخلية.",
      "منع التنزيلات والتشغيل التلقائي للملفات التنفيذية وطلب موافقة صريحة قبل فتح الروابط المشبوهة.",
      "عزل محتوى صفحات الويب كبيانات غير موثوقة ومنع تنفيذ أي أوامر واردة فيها أو كشف مفاتيح API.",
    ],
    securityTesterLabel: "افحص أي رابط الآن",
    securityTesterPlaceholder: "https://example.com أو رابط للفحص…",
    securityTesterButton: "فحص",
    securityChecking: "جارٍ فحص أمان الرابط…",
    verdictSafe: "آمن",
    verdictCaution: "مشبوه",
    verdictDanger: "خطير",
    safeModalTitleCaution: "تنبيه قبل فتح رابط مشبوه",
    safeModalTitleDanger: "تحذير أمني: رابط خطير محتمل",
    safeModalTitleBlocked: "تم حظر الرابط لأسباب أمنية",
    safeModalTitleSafe: "تقرير فحص أمان الرابط",
    safeModalDestination: "الوجهة الفعلية التي تم فحصها",
    safeModalProviders: "طبقات الفحص النشطة",
    safeModalReasons: "نتائج الفحص الأمني",
    safeModalDownloadWarning:
      "تم تعطيل التنزيل والتشغيل التلقائي. لا تفتح أو تحمّل ملفات من مصادر غير موثوقة.",
    safeModalCancel: "إلغاء والبقاء بأمان",
    safeModalOpenSafe: "فتح الرابط",
    safeModalProceedRisk: "أفهم المخاطر، فتح الرابط",
    safeModalBlockedNotice:
      "تم تعطيل فتح هذا الرابط نهائيًا لحماية جهازك وبياناتك من التنفيذ غير الآمن.",
    inspectLinkReport: "عرض تقرير أمان الرابط",
    composerPlaceholder:
      "اسأل NOVA AI، أرفق صورة أو PDF أو ملفًا نصيًا، أو تحدّث بالصوت…",
    send: "إرسال",
    stop: "إيقاف",
    attachFiles: "إرفاق صورة أو PDF أو ملف نصي",
    removeAttachment: "إزالة المرفق",
    webSearchAuto: "بحث تلقائي",
    webSearchOn: "بحث مباشر",
    webSearchOff: "بدون بحث",
    webSearchAutoHint: "بحث تلقائي: يبحث في الويب تلقائيًا عند الحاجة لمعلومات حديثة",
    webSearchOnHint: "بحث مباشر مفعّل مع فحص أمني لجميع الروابط والمصادر",
    webSearchOffHint: "البحث في الإنترنت متوقف لهذه المحادثة",
    webSearchUsedBadge: "بحث مباشر في الويب",
    webSearchAutoUsedBadge: "بحث تلقائي في الويب",
    voiceRecordStart: "تحدّث بالصوت",
    voiceRecordStop: "إنهاء وتحويل لنص",
    voiceCancel: "إلغاء التسجيل",
    voiceTranscribing: "جارٍ تحويل الصوت إلى نص…",
    voicePermissionError:
      "لم يُسمح بالوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح.",
    voiceUnsupportedError: "التسجيل الصوتي غير مدعوم في هذا المتصفح.",
    listen: "استماع",
    loadingAudio: "جارٍ تجهيز الصوت…",
    stopAudio: "إيقاف الصوت",
    audioError: "تعذّر تشغيل الصوت حاليًا.",
    sourcesHeading: "المصادر والروابط المفحوصة",
    copy: "نسخ",
    copied: "تم النسخ",
    regenerate: "إعادة التوليد",
    replyWithoutSearch: "الرد بدون بحث الويب",
    retryWithFastModel: "المحاولة بالنموذج السريع",
    exportMarkdown: "تصدير Markdown",
    deleteThread: "حذف المحادثة",
    untitledThread: "محادثة جديدة",
    youLabel: "أنت",
    assistantLabel: "NOVA AI",
    thinkingMessage: "NOVA AI يفكّر…",
    searchingMessage: "جارٍ البحث المباشر في الويب وتجميع المصادر…",
    verifyingLinksMessage: "جارٍ فحص أمان الروابط والمصادر…",
    emptyHeading: "مرحبًا بك في NOVA AI",
    emptySubheading:
      "مساعد ذكاء اصطناعي شامل للبحث الذكي المحمي، البرمجة، التعليم، تحليل الصور والملفات، والصوت.",
    rolePickerHeading: "التخصصات المتاحة",
    themeLight: "الوضع النهاري",
    themeDark: "الوضع الليلي",
    langToggle: "EN",
    scrollToBottom: "الانتقال إلى أحدث رسالة",
    messagesCount: (n: number) =>
      n === 0
        ? "فارغة"
        : n === 1
          ? "رسالة واحدة"
          : n === 2
            ? "رسالتان"
            : `${n} رسائل`,
    attachmentLimitError: "يرجى اختيار ملف بحجم أقل من 10 ميجابايت.",
    attachmentUnsupportedError:
      "الأنواع المدعومة: الصور (PNG/JPG/WEBP)، وملفات PDF، والملفات النصية والكود.",
    networkError: "تعذّر الاتصال بالخادم. يرجى المحاولة مجددًا.",
    keyboardHint: "Enter للإرسال · Shift + Enter لسطر جديد",
    customRoleIndicator: "مخصّص",
    pdfBadge: "PDF",
    textFileBadge: "نص",
  },
  en: {
    brand: "NOVA AI",
    newChat: "New Chat",
    searchPlaceholder: "Search conversations…",
    noThreads: "No saved conversations yet.",
    noSearchMatches: "No matching conversations found.",
    conversations: "History",
    today: "Today",
    earlier: "Earlier",
    settingsButton: "Settings & Safety",
    closePanel: "Close panel",
    tabPersona: "Persona",
    tabMemory: "Memory",
    tabSecurity: "Security",
    activeRole: "Select Specialization",
    responseStyleLabel: "Response Style",
    systemInstructionLabel: "System instruction for this thread",
    systemInstructionHint:
      "Guides NOVA AI's persona, tone, and reasoning approach across this conversation.",
    resetInstruction: "Reset default",
    saveInstruction: "Apply changes",
    savedNotice: "Updated",
    autoSpeakLabel: "Auto-read replies aloud",
    autoSpeakHint:
      "Automatically play voice audio after each completed NOVA AI response.",
    memoryTitle: "Cross-conversation Memory",
    memoryConsentLabel: "Enable memory with my consent",
    memoryConsentHint:
      "When enabled, NOVA AI remembers explicit preferences and facts you share to personalize future chats. You can inspect or delete entries anytime.",
    memoryAddPlaceholder: "Add a preference or fact for NOVA AI to remember…",
    memoryAddButton: "Add",
    memoryEmpty: "No saved memory entries yet.",
    memoryClearAll: "Clear memory",
    memoryActiveTag: "Memory on",
    memoryAutoTag: "Auto",
    memoryManualTag: "Manual",
    securityTitle: "Web & Link Safety Shield",
    securitySubtitle:
      "NOVA AI scans every grounding source and external URL server-side before opening to defend against phishing, malware, and auto-downloads.",
    securityRulesList: [
      "Live server-side checks against Cloudflare Security DNS and OpenPhish (plus Google Safe Browsing when configured).",
      "Unwraps proxy redirects to inspect real destination hosts and blocks dangerous protocols (javascript / data / file) and private SSRF targets.",
      "Disables automatic downloads/execution and requires explicit approval before opening suspicious links.",
      "Treats all web page content as untrusted data to block prompt injection and prevent API key or secret exposure.",
    ],
    securityTesterLabel: "Scan any URL right now",
    securityTesterPlaceholder: "https://example.com or link to check…",
    securityTesterButton: "Scan",
    securityChecking: "Inspecting link safety…",
    verdictSafe: "Safe",
    verdictCaution: "Suspicious",
    verdictDanger: "Dangerous",
    safeModalTitleCaution: "Confirm before opening suspicious link",
    safeModalTitleDanger: "Security Warning: Potentially Dangerous Link",
    safeModalTitleBlocked: "Link Blocked for Security",
    safeModalTitleSafe: "Link Safety Inspection Report",
    safeModalDestination: "Inspected destination URL",
    safeModalProviders: "Active verification layers",
    safeModalReasons: "Security findings",
    safeModalDownloadWarning:
      "Automatic download and execution are disabled. Never download files from untrusted sources.",
    safeModalCancel: "Cancel & stay safe",
    safeModalOpenSafe: "Open link",
    safeModalProceedRisk: "I understand the risks, open link",
    safeModalBlockedNotice:
      "Opening this link is disabled to protect your device from unsafe execution.",
    inspectLinkReport: "View link safety report",
    composerPlaceholder:
      "Ask NOVA AI, attach images, PDFs, or text files, or speak with voice…",
    send: "Send",
    stop: "Stop",
    attachFiles: "Attach image, PDF, or text file",
    removeAttachment: "Remove attachment",
    webSearchAuto: "Auto Search",
    webSearchOn: "Web Search",
    webSearchOff: "Search Off",
    webSearchAutoHint: "Auto Search: triggers live web search automatically for fresh facts",
    webSearchOnHint: "Live web search active with real-time link safety checks",
    webSearchOffHint: "Web search disabled for this thread",
    webSearchUsedBadge: "Live web search",
    webSearchAutoUsedBadge: "Auto web search",
    voiceRecordStart: "Speak with voice",
    voiceRecordStop: "Stop & transcribe",
    voiceCancel: "Cancel recording",
    voiceTranscribing: "Transcribing audio…",
    voicePermissionError:
      "Microphone permission was denied. Please enable microphone access in your browser.",
    voiceUnsupportedError: "Audio recording is not supported in this browser.",
    listen: "Listen",
    loadingAudio: "Preparing audio…",
    stopAudio: "Stop audio",
    audioError: "Could not synthesize audio right now.",
    sourcesHeading: "Verified Sources & Links",
    copy: "Copy",
    copied: "Copied",
    regenerate: "Regenerate",
    replyWithoutSearch: "Answer without web search",
    retryWithFastModel: "Try Fast model",
    exportMarkdown: "Export Markdown",
    deleteThread: "Delete conversation",
    untitledThread: "New conversation",
    youLabel: "You",
    assistantLabel: "NOVA AI",
    thinkingMessage: "NOVA AI is thinking…",
    searchingMessage: "Searching the live web and gathering sources…",
    verifyingLinksMessage: "Scanning source links for safety…",
    emptyHeading: "Welcome to NOVA AI",
    emptySubheading:
      "Your all-in-one AI assistant for protected web research, coding, step-by-step tutoring, image & PDF analysis, and voice.",
    rolePickerHeading: "Specializations",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    langToggle: "عربي",
    scrollToBottom: "Jump to latest message",
    messagesCount: (n: number) =>
      n === 0 ? "Empty" : n === 1 ? "1 message" : `${n} messages`,
    attachmentLimitError: "Please choose a file smaller than 10 MB.",
    attachmentUnsupportedError:
      "Supported formats: images (PNG/JPG/WEBP), PDFs, and text/code files.",
    networkError: "Could not reach the server. Please try again.",
    keyboardHint: "Enter to send · Shift + Enter for new line",
    customRoleIndicator: "Custom",
    pdfBadge: "PDF",
    textFileBadge: "TEXT",
  },
};
