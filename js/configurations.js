import {
	initGeneral,
	initI18nForIndex,
	createConfigurationsI18nPlugin,
	getLangRef,
} from "./general.js";

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	initI18nForIndex();
});

const { createApp, computed } = Vue;

const app = createApp({
	setup() {
		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : "en";
		});

		return {
			i18nLang,
		};
	},
});

// Register i18n plugin before mounting
app.use(createConfigurationsI18nPlugin());

// Harden: global Vue error handler
app.config.errorHandler = (err, instance, info) => {
	console.error("[VueError]", err, info);
};

// Mount and expose the component proxy directly (Vue 3 returns proxy from mount)
let vmInstance = null;
try {
	vmInstance = app.mount("#app");
	window.vm = vmInstance;
	console.log("[ODA] vm exposed:", window.vm);
	// Remove preload skeleton after mount
	const preload = document.getElementById("preload");
	if (preload) {
		// fade-out for a tiny bit smoother transition
		preload.style.transition = "opacity .18s ease";
		preload.style.opacity = "0";
		setTimeout(() => preload.remove(), 220);
	}
	// Reveal the app (remove .app-hidden class) after mount
	const appRoot = document.getElementById("app");
	if (appRoot) appRoot.classList.remove("app-hidden");
} catch (e) {
	console.error("[MountError]", e);
	const preload = document.getElementById("preload");
	if (preload) preload.remove();
	// Reveal the app (remove .app-hidden class) even if mount fails
	const appRoot = document.getElementById("app");
	if (appRoot) appRoot.classList.remove("app-hidden");
	window.vm = null;
}
