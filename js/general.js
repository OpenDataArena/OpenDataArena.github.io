import * as LANG from "./lang.js";

// --- Minimal Vue i18n (方案B) ---
let __i18nLangRef = null; // Vue.ref at runtime
export function getLangRef() {
	return __i18nLangRef;
}

// 打开反馈表单（通用功能）
export function openFeedbackForm() {
	console.log("Feedback button clicked!");
	const googleFormUrl =
		"https://docs.google.com/forms/d/e/1FAIpQLSe2Mh4L3e-1TvlCl-Qfl_WasFk2dPO2mFcbmfMG4iF9IgKuIQ/viewform?usp=dialog";
	try {
		const newWindow = window.open(
			googleFormUrl,
			"_blank",
			"width=800,height=600,scrollbars=yes,resizable=yes"
		);
		if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
			console.log("Popup blocked, trying alternative method");
			window.location.href = googleFormUrl;
		} else {
			console.log("Popup opened successfully");
		}
	} catch (error) {
		console.error("Error opening feedback form:", error);
		window.location.href = googleFormUrl;
	}
}

// 初始化通用事件绑定（例如：反馈按钮）
export function initGeneral() {
	const bind = () => {
		document.querySelectorAll('[data-action="open-feedback"]').forEach((btn) => {
			// 防重复绑定
			btn.removeEventListener("click", openFeedbackForm);
			btn.addEventListener("click", openFeedbackForm);
		});
	};

	// DOM 已经就绪则立刻绑定；否则等到 DOMContentLoaded 再绑定
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bind, { once: true });
	} else {
		bind();
	}
}

// ===== i18n helpers =====
// 确保 getCurrentLang() 只返回 'en' 或 'zh'
export function getCurrentLang() {
	// 先从 localStorage 读
	const saved = (localStorage.getItem("oda_lang") || "").toLowerCase();
	if (saved === "zh" || saved === "en") return saved;

	// 再从浏览器语言推断
	const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
	return nav.startsWith("zh") ? "zh" : "en";
}

export function setCurrentLang(lang) {
	const norm =
		lang && lang.toLowerCase().startsWith("zh")
			? "zh"
			: lang && lang.toLowerCase().startsWith("en")
			? "en"
			: "en";
	localStorage.setItem("oda_lang", norm);
	document.documentElement.setAttribute("lang", norm === "zh" ? "zh-CN" : "en");
}

export function toggleLanguage() {
	const cur = getCurrentLang();
	const next = cur === "zh" ? "en" : "zh";
	setCurrentLang(next);
	return next;
}

export function createIndexI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_index && (LANG.lang_index[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_index && (LANG.lang_index.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function createLeaderboardI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_leaderboard && (LANG.lang_leaderboard[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_leaderboard && (LANG.lang_leaderboard.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function createComparisonI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_comparison && (LANG.lang_comparison[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_comparison && (LANG.lang_comparison.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function createConfigurationsI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_configurations && (LANG.lang_configurations[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_configurations && (LANG.lang_configurations.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function createContributionI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_contribution && (LANG.lang_contribution[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_contribution && (LANG.lang_contribution.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function createToolsI18nPlugin() {
	return {
		install(app) {
			const cur = getCurrentLang();
			const V = window.Vue || {};
			__i18nLangRef = V.ref ? V.ref(cur) : { value: cur };

			// 全局翻译函数：优先 index，再 all，支持简单占位符递归替换
			app.config.globalProperties.$t = function (key) {
				const lang = (__i18nLangRef?.value || "en").toLowerCase();
				const cur = lang.startsWith("zh") ? "zh" : "en";

				// 当前语言与英文的双层回退
				const LidxCur = (LANG.lang_tools && (LANG.lang_tools[cur] || {})) || {};
				const LallCur = (LANG.lang_all && (LANG.lang_all[cur] || {})) || {};
				const LidxEn = (LANG.lang_tools && (LANG.lang_tools.en || {})) || {};
				const LallEn = (LANG.lang_all && (LANG.lang_all.en || {})) || {};

				const lookup = (k) => LidxCur[k] ?? LallCur[k] ?? LidxEn[k] ?? LallEn[k] ?? null;

				let str = lookup(key);
				if (str == null) return key;

				// 占位符插值：{child_key}
				const re = /\{([a-zA-Z0-9_]+)\}/g;
				for (let i = 0; i < 3; i++) {
					re.lastIndex = 0;
					const next = String(str).replace(re, (m, k) => {
						const v = lookup(k);
						return v != null ? String(v) : m;
					});
					if (next === str) break;
					str = next;
				}
				return str;
			};

			// 可注入对象
			app.provide("i18n", {
				langRef: __i18nLangRef,
				set(lang) {
					setCurrentLang(lang);
					if (__i18nLangRef) __i18nLangRef.value = lang;
				},
				toggle() {
					const next = getCurrentLang() === "zh" ? "en" : "zh";
					setCurrentLang(next);
					if (__i18nLangRef) __i18nLangRef.value = next;
					return next;
				},
			});
		},
	};
}

export function initI18nForIndex() {
	const bind = () => {
		// 初始化 html[lang]
		setCurrentLang(getCurrentLang());
		const btn = document.getElementById("lang-toggle");
		if (btn) {
			const syncBtn = () => {
				const cur = getCurrentLang();
				btn.innerHTML =
					'<img src="./icon/lang.svg" class="lang-icon-img" alt="" aria-hidden="true" />';
				const label = cur === "zh" ? "Switch to English" : "切换为中文";
				btn.setAttribute("aria-label", label);
				btn.title = label;
			};
			syncBtn();
			btn.addEventListener("click", () => {
				const next = getCurrentLang() === "zh" ? "en" : "zh";
				setCurrentLang(next);
				// 驱动 Vue 响应式刷新
				if (getLangRef()) getLangRef().value = next;
				syncBtn();
			});
		}
	};
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bind, { once: true });
	} else {
		bind();
	}
}
