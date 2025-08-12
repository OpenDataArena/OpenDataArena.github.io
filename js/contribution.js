import {
	initGeneral,
	initI18nForIndex,
	createContributionI18nPlugin,
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

		function copyCode(button) {
			const codeBlock = button.closest(".code-block");
			const code = codeBlock.querySelector("code");
			const textToCopy = code.textContent;

			// 复制到剪贴板
			navigator.clipboard
				.writeText(textToCopy)
				.then(function () {
					// 更新按钮状态
					const originalText = button.innerHTML;
					button.innerHTML = '<i class="fas fa-check"></i> Copied!';
					button.classList.add("copied");

					// 2秒后恢复原状态
					setTimeout(function () {
						button.innerHTML = originalText;
						button.classList.remove("copied");
					}, 2000);
				})
				.catch(function (err) {
					console.error("Failed to copy: ", err);
					// 备用方案：使用传统方法
					const textArea = document.createElement("textarea");
					textArea.value = textToCopy;
					document.body.appendChild(textArea);
					textArea.select();
					document.execCommand("copy");
					document.body.removeChild(textArea);

					// 更新按钮状态
					const originalText = button.innerHTML;
					button.innerHTML = '<i class="fas fa-check"></i> Copied!';
					button.classList.add("copied");

					setTimeout(function () {
						button.innerHTML = originalText;
						button.classList.remove("copied");
					}, 2000);
				});
		}

		// 提交信息弹窗逻辑
		function setupSubmitInfoModal() {
			const btn = document.getElementById("submit-info-btn");
			const modal = document.getElementById("submit-info-modal");
			const close = modal.querySelector(".close-modal");
			const form = document.getElementById("submit-info-form");
			const successMsg = document.getElementById("submit-success");
			const errorMsg = document.getElementById("submit-error");

			if (!btn || !modal || !close || !form) return;

			// 打开弹窗
			btn.onclick = () => {
				modal.classList.add("show");
				successMsg.style.display = "none";
				errorMsg.style.display = "none";
				form.reset();
			};

			// 关闭弹窗
			close.onclick = () => {
				modal.classList.remove("show");
			};

			// 点击背景关闭弹窗
			window.addEventListener("click", (e) => {
				if (e.target === modal) modal.classList.remove("show");
			});

			// 表单提交
			form.onsubmit = async function (e) {
				e.preventDefault();
				successMsg.style.display = "none";
				errorMsg.style.display = "none";

				const submitBtn = document.getElementById("submit-btn");
				const btnText = submitBtn.querySelector(".btn-text");
				const btnLoading = submitBtn.querySelector(".btn-loading");

				// 防止重复提交
				if (submitBtn.disabled) return;

				const datasetLink = document.getElementById("dataset-link").value.trim();
				const userEmail = document.getElementById("user-email").value.trim();
				const userName = document.getElementById("user-name").value.trim();

				if (!datasetLink || !userEmail || !userName) return;

				// 显示加载状态
				submitBtn.disabled = true;
				btnText.style.display = "none";
				btnLoading.style.display = "flex";

				// Google Sheets API 端点
				const endpoint =
					"https://script.google.com/macros/s/AKfycbyQySADHHdtfs2E7AATp2DioSUhB3tYyWjyfD7_OG_4DaMPeBXw-bUc3ke_RkF_saSUiA/exec";

				try {
					const formData = new FormData();
					formData.append("dataset-link", datasetLink);
					formData.append("user-email", userEmail);
					formData.append("user-name", userName);

					const res = await fetch(endpoint, {
						method: "POST",
						body: formData,
					});

					if (res.ok) {
						successMsg.style.display = "block";
						errorMsg.style.display = "none";
						form.reset();

						// 3秒后关闭弹窗
						setTimeout(() => {
							modal.classList.remove("show");
						}, 3000);
					} else {
						throw new Error("Network error");
					}
				} catch (err) {
					errorMsg.style.display = "block";
					successMsg.style.display = "none";
				} finally {
					// 恢复按钮状态
					submitBtn.disabled = false;
					btnText.style.display = "inline";
					btnLoading.style.display = "none";
				}
			};
		}

		// 加载所有带 data-src 的 <code> 元素
		async function loadExternalCodeBlocks() {
			const nodes = document.querySelectorAll("code[data-src]");
			await Promise.all(
				[...nodes].map(async (el) => {
					const url = el.getAttribute("data-src");
					try {
						const res = await fetch(url, { cache: "no-cache" });
						if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
						let text = await res.text();
						// 统一换行符，避免 Windows CRLF 导致显示异常
						text = text.replace(/\r\n/g, "\n");
						// 用 textContent 防 XSS，并保留原始换行/缩进
						el.textContent = text;

						// 可选：给语法高亮库用的类名（如果你后面接 Prism.js 等）
						const lang = el.dataset.lang;
						if (lang) el.classList.add(`language-${lang}`);
					} catch (e) {
						console.error("[CodeLoad] Failed:", url, e);
						el.textContent = `# Failed to load: ${url}\n# ${e.message || e}`;
						el.classList.add("code-load-error");
					}
				})
			);
		}

		return {
			i18nLang,
			copyCode,
			setupSubmitInfoModal,
			loadExternalCodeBlocks,
		};
	},
});

// Register i18n plugin before mounting
app.use(createContributionI18nPlugin());

// Harden: global Vue error handler
app.config.errorHandler = (err, instance, info) => {
	console.error("[VueError]", err, info);
};

// 挂载
let vmInstance = null;
try {
	vmInstance = app.mount("#app");
	window.vm = vmInstance;
	console.log("[ODA] vm exposed:", window.vm);

	vmInstance.loadExternalCodeBlocks?.();

	window.copyCode = vmInstance.copyCode;

	// 页面加载完成后初始化弹窗
	if (document.readyState === "complete" || document.readyState === "interactive") {
		setTimeout(vmInstance.setupSubmitInfoModal, 500);
	} else {
		document.addEventListener("DOMContentLoaded", () =>
			setTimeout(vmInstance.setupSubmitInfoModal, 500)
		);
	}
} catch (e) {
	console.error("[MountError]", e);
	window.vm = null;
}
