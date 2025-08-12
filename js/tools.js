import {
	initGeneral,
	initI18nForIndex,
	createToolsI18nPlugin,
	getLangRef,
} from "./general.js";

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	initI18nForIndex();
});

const { createApp, computed} = Vue;

const app = createApp({
	setup() {
		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : "en";
		});
        return{
            i18nLang,
        }
	},
});

// Register i18n plugin before mounting
app.use(createToolsI18nPlugin());

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
} catch (e) {
	console.error("[MountError]", e);
	window.vm = null;
}
