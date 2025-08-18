// index.js (ES module) — 首页入口
import {
	initGeneral,
	openFeedbackForm,
	initI18nForIndex,
	createIndexI18nPlugin,
	getLangRef,
	getCurrentLang,
	setCurrentLang,
	initStickyHeader,
	initHeroFillViewport,
} from "./general.js";

// —— Vue 应用（首页专用）——
const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

// 订阅弹窗逻辑（首页专用）
function setupSubscribeModal() {
	const btn = document.getElementById("subscribe-btn");
	const modal = document.getElementById("subscribe-modal");
	if (!modal) return;
	modal.style.display = "none";
	const close = modal.querySelector(".close-modal");
	const form = document.getElementById("subscribe-form");
	const emailInput = document.getElementById("subscribe-email");
	const successMsg = document.getElementById("subscribe-success");
	const errorMsg = document.getElementById("subscribe-error");
	if (!btn || !close || !form) return;
	btn.onclick = () => {
		modal.classList.add("show");
		modal.style.display = "flex";
		if (successMsg) successMsg.style.display = "none";
		if (errorMsg) errorMsg.style.display = "none";
		if (emailInput) emailInput.value = "";
	};
	close.onclick = () => {
		modal.classList.remove("show");
		modal.style.display = "none";
	};
	window.addEventListener("click", (e) => {
		if (e.target === modal) {
			modal.classList.remove("show");
			modal.style.display = "none";
		}
	});
	window.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && modal.classList.contains("show")) {
			modal.classList.remove("show");
			modal.style.display = "none";
		}
	});
	form.onsubmit = async function (e) {
		e.preventDefault();
		if (successMsg) successMsg.style.display = "none";
		if (errorMsg) errorMsg.style.display = "none";
		const email = (emailInput?.value || "").trim();
		if (!email) return;
		const endpoint =
			"https://script.google.com/macros/s/AKfycbw0AQD1p9wet2wowaC1rxmjo-Aw-bpyRkTMMRq4KXgqvak84CD7BSgEmVfKYcPQHSPR/exec";
		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: "email=" + encodeURIComponent(email),
			});
			if (res.ok) {
				if (successMsg) successMsg.style.display = "block";
				if (errorMsg) errorMsg.style.display = "none";
				if (emailInput) emailInput.value = "";
			} else {
				throw new Error("Network error");
			}
		} catch (err) {
			if (errorMsg) errorMsg.style.display = "block";
			if (successMsg) successMsg.style.display = "none";
		}
	};
}

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	setupSubscribeModal();
	// 标记语言按钮为由 Vue 管理，避免通用兜底再次绑定导致双触发
	const langBtn = document.getElementById("lang-toggle");
	if (langBtn) langBtn.setAttribute("data-i18n-vue", "1");
	initI18nForIndex();
	initHeroFillViewport();
});

const app = createApp({
	setup() {
		// Language toggle for header button (Vue controlled)
		const toggleLang = () => {
			const next = getCurrentLang() === "zh" ? "en" : "zh";
			setCurrentLang(next);
			const r = getLangRef && getLangRef();
			if (r) r.value = next; // trigger re-render
		};

		const langAriaLabel = computed(() => {
			return getCurrentLang() === "zh" ? "Switch to English" : "切换为中文";
		});
		// 基础状态（首页专用）
		const rawData = ref({});
		const loading = ref(false);
		const currentModel = ref("llama");
		const error = ref(null);
		const searchQuery = ref("");
		const selectedTags = ref([]);
		const tagFilterMode = ref("include");
		const sizeRangeMin = ref(0);
		const sizeRangeMax = ref(7);

		// —— 必要依赖（避免未定义错误）——
		const sortColumn = ref("overall_avg");
		const sortDirection = ref("desc");
		// 数据量刻度配置（对数刻度）
		const sizeValues = ref([0, 1000, 10000, 50000, 100000, 500000, 1000000, Infinity]);
		const sizeSliderMax = ref(7);

		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : "en";
		});

		const parseSizeToNumber = (sizeStr) => {
			if (!sizeStr || sizeStr === "-" || sizeStr === "") return 0;
			// 移除空格并转为小写
			const size = sizeStr.toString().toLowerCase().trim();
			// 提取数字部分
			const match = size.match(/^([0-9.]+)\s*([a-z]*)$/);
			if (!match) return 0;
			const number = parseFloat(match[1]);
			const unit = match[2];
			// 根据单位转换为实际数值
			switch (unit) {
				case "k":
					return number * 1000;
				case "m":
					return number * 1000000;
				case "b":
					return number * 1000000000;
				case "":
				case "b": // 有些数据可能直接是数字
					return number;
				default:
					return number;
			}
		};

		// 挂载时加载数据（等待数据就绪后再绘制首图）
		onMounted(async () => {
			await loadData(); // 等待异步数据加载完成（含回退模拟数据）
			await nextTick(); // 等待依赖的计算属性更新
			const langBtn = document.getElementById("lang-toggle");
			if (langBtn) langBtn.setAttribute("data-i18n-vue", "1");
			createLlamaRadarChart(); // 首次进入就绘制含数据的雷达图
			createQwenRadarChart();
		});

		// Re-render radar chart when language toggles
		watch(i18nLang, async () => {
			// Wait for i18n plugin to swap language, then rebuild chart with translated labels
			await nextTick();
			createLlamaRadarChart();
			createQwenRadarChart();
			initHeroFillViewport();
		});

		// 计算属性：当前数据
		const currentData = computed(() => {
			return rawData.value[currentModel.value] || [];
		});

		// 加载数据
		const loadData = async () => {
			try {
				loading.value = true;
				const response = await fetch("./data/processed_merge_data.json");
				if (!response.ok) {
					throw new Error("Failed to load data");
				}
				const data = await response.json();
				rawData.value = data;
				error.value = null;
			} catch (err) {
				console.error("Error loading data:", err);
				error.value = "Error loading data";
				// 使用模拟数据作为备用
				rawData.value = {
					llama: generateMockData("LLaMA"),
					qwen: generateMockData("Qwen"),
				};
			} finally {
				loading.value = false;
			}
		};

		// 生成模拟数据
		const generateMockData = (prefix) => {
			const datasets = [];
			const domains = ["general", "math", "code", "reasoning"];

			for (let i = 1; i <= 20; i++) {
				const general_avg = Math.random() * 80 + 20;
				const math_avg = Math.random() * 70 + 15;
				const code_avg = Math.random() * 75 + 20;
				const reasoning_avg = Math.random() * 65 + 25;
				const overall_avg = (general_avg + math_avg + code_avg + reasoning_avg) / 4;

				datasets.push({
					id: i,
					name: `${prefix}_Dataset_${i}`,
					domain: domains[Math.floor(Math.random() * domains.length)],
					general_avg: Math.round(general_avg * 100) / 100,
					math_avg: Math.round(math_avg * 100) / 100,
					code_avg: Math.round(code_avg * 100) / 100,
					reasoning_avg: Math.round(reasoning_avg * 100) / 100,
					overall_avg: Math.round(overall_avg * 100) / 100,
				});
			}
			return datasets;
		};

		// 工具：检查是否 base / instruct
		const isBaseModel = (dataset) => dataset.domain === "base";
		const isInstructModel = (dataset) => dataset.domain === "instruct";

		const getSizeValueFromIndex = (index) => {
			return sizeValues.value[index] || 0;
		};

		// 工具：获取数据集标签
		const getDatasetTags = (dataset) => {
			const tags = [];
			const tagStr = dataset.tag || "";
			if (tagStr) {
				const parsed = tagStr
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);
				tags.push(...parsed);
			}
			return tags;
		};

		// 工具：是否在大小范围内（依赖 parseSizeToNumber / sizeSliderMax 全局）
		const isInSizeRange = (dataset) => {
			const sizeNum = parseSizeToNumber(dataset.size);
			const minSize = getSizeValueFromIndex(sizeRangeMin.value);
			const maxSize = getSizeValueFromIndex(sizeRangeMax.value);
			if (sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value) return true;
			return sizeNum >= minSize && (maxSize === Infinity ? true : sizeNum <= maxSize);
		};

		// 排序后的数据（依赖 currentData / sortColumn / sortDirection 全局）
		const sortedData = computed(() => {
			if (!currentData.value.length) return [];

			const baseModel = currentData.value.find((item) => isBaseModel(item));
			const instructModel = currentData.value.find((item) => isInstructModel(item));
			const otherModels = currentData.value.filter(
				(item) => !isBaseModel(item) && !isInstructModel(item)
			);

			const sortedOtherModels = [...otherModels].sort((a, b) => {
				let scoreA = a[sortColumn.value] || 0;
				let scoreB = b[sortColumn.value] || 0;
				if (sortColumn.value === "name") {
					scoreA = a.name || "";
					scoreB = b.name || "";
					return sortDirection.value === "asc"
						? scoreA.localeCompare(scoreB)
						: scoreB.localeCompare(scoreA);
				}
				if (sortColumn.value === "year") {
					const yearA = parseInt(a.year) || 0;
					const yearB = parseInt(b.year) || 0;
					if (yearA === yearB) {
						const avgA = a.overall_avg || 0;
						const avgB = b.overall_avg || 0;
						return avgB - avgA;
					}
					return sortDirection.value === "asc" ? yearA - yearB : yearB - yearA;
				}
				if (sortColumn.value === "size") {
					const sizeA = parseSizeToNumber(a.size) || 0;
					const sizeB = parseSizeToNumber(b.size) || 0;
					if (sizeA === sizeB) {
						const avgA = a.overall_avg || 0;
						const avgB = b.overall_avg || 0;
						return avgB - avgA;
					}
					return sortDirection.value === "asc" ? sizeA - sizeB : sizeB - sizeA;
				}
				return sortDirection.value === "asc" ? scoreA - scoreB : scoreB - scoreA;
			});

			const result = [];
			if (instructModel) result.push(instructModel);
			if (baseModel) result.push(baseModel);
			result.push(...sortedOtherModels);
			return result;
		});

		// 过滤后的数据（主表格）
		const filteredData = computed(() => {
			let dataToFilter = sortedData.value;
			let baseModel = null;
			let instructModel = null;

			if (dataToFilter.length > 0 && isInstructModel(dataToFilter[0])) {
				instructModel = dataToFilter[0];
				dataToFilter = dataToFilter.slice(1);
			}
			if (dataToFilter.length > 0 && isBaseModel(dataToFilter[0])) {
				baseModel = dataToFilter[0];
				dataToFilter = dataToFilter.slice(1);
			}

			let filtered = dataToFilter;

			if (searchQuery.value) {
				filtered = filtered.filter((dataset) =>
					dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
				);
			}
			if (selectedTags.value.length > 0) {
				filtered = filtered.filter((dataset) => {
					const datasetTags = getDatasetTags(dataset);
					if (tagFilterMode.value === "exclusive") {
						return (
							selectedTags.value.every((tag) => datasetTags.includes(tag)) &&
							datasetTags.every((tag) => selectedTags.value.includes(tag))
						);
					} else {
						return selectedTags.value.some((tag) => datasetTags.includes(tag));
					}
				});
			}
			if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
				filtered = filtered.filter((dataset) => isInSizeRange(dataset));
			}

			const result = [];
			if (instructModel) result.push(instructModel);
			if (baseModel) result.push(baseModel);
			result.push(...filtered);
			return result;
		});

		// 首页榜单摘要 & 跳转
		const summaryLeaderboardRows = computed(() => {
			const dataArr = filteredData.value || [];
			if (!dataArr.length) return [];
			const baseRow = dataArr.find((item) => item.domain === "base");
			const top5 = dataArr
				.filter((item) => item.domain !== "base" && item.domain !== "instruct")
				.slice(0, 5);
			return baseRow ? [baseRow, ...top5] : top5.slice(0, 6);
		});

		function getTop5Datasets() {
			return summaryLeaderboardRows.value
				.filter((row) => row.domain !== "base" && row.domain !== "instruct")
				.slice(0, 5);
		}
		// 计算属性：未排序的过滤数据（用于排名计算）
		const filteredDataForRanking = computed(() => {
			let filtered = currentData.value.filter(
				(item) => !isBaseModel(item) && !isInstructModel(item)
			); // 排除 base 和 instruct
			// 搜索过滤
			if (searchQuery.value) {
				filtered = filtered.filter((dataset) =>
					dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
				);
			}
			// 数据标签多选过滤
			if (selectedTags.value.length > 0) {
				filtered = filtered.filter((dataset) => {
					// 获取数据集的标签
					const datasetTags = getDatasetTags(dataset);

					if (tagFilterMode.value === "exclusive") {
						// 仅包含模式：数据集必须只包含选中的标签
						return (
							selectedTags.value.every((tag) => datasetTags.includes(tag)) &&
							datasetTags.every((tag) => selectedTags.value.includes(tag))
						);
					} else {
						// 包含模式：数据集必须包含至少一个选中的标签
						return selectedTags.value.some((tag) => datasetTags.includes(tag));
					}
				});
			}
			// 数据量区间过滤
			if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
				filtered = filtered.filter((dataset) => isInSizeRange(dataset));
			}
			return filtered;
		});
		// —— Top5 by specific metric (Math / Code) ——
		function getTop5ByMetric(metricKey) {
			// 以与主榜相同的过滤视图为基础（已排除 base/instruct，并应用搜索/标签/体量）
			const source = Array.isArray(filteredDataForRanking.value)
				? filteredDataForRanking.value
				: [];
			const safeScore = (row) => {
				const v = row && row[metricKey];
				return typeof v === "number" && !Number.isNaN(v) ? v : 0;
			};
			return source
				.slice()
				.sort((a, b) => safeScore(b) - safeScore(a))
				.slice(0, 5);
		}
		const mathTop5Rows = computed(() => getTop5ByMetric("math_avg"));
		const codeTop5Rows = computed(() => getTop5ByMetric("code_avg"));

		// Baseline row (from filteredData, same source as Overall table)
		const baselineRow = computed(() => {
			const arr = filteredData.value || [];
			return arr.find((item) => item.domain === "base") || null;
		});

		// Math / Code tables with baseline as the first row
		const mathTop5WithBase = computed(() => {
			const base = baselineRow.value;
			const list = mathTop5Rows.value || [];
			return base ? [base, ...list] : list;
		});
		const codeTop5WithBase = computed(() => {
			const base = baselineRow.value;
			const list = codeTop5Rows.value || [];
			return base ? [base, ...list] : list;
		});
		function goToLeaderboard() {
			window.location.href = "leaderboard.html";
		}
		function goToDataComparison() {
			window.location.href = "data-comparison.html?id=87";
		}

		// —— 模板引用的辅助：避免渲染期未定义 ——
		const improvementType = ref("vs_base"); // 新增：improvement类型选择

		// 方法：获取排名
		const getRank = (
			dataset,
			data,
			scoreKey,
			isDetailed = false,
			selectedType = null,
			improvementType = "vs_base"
		) => {
			if (isBaseModel(dataset)) return "-"; // base 不参与排名
			const ranks = calculateRanks(
				data.filter((item) => !isBaseModel(item)),
				scoreKey,
				isDetailed,
				selectedType,
				improvementType
			);
			return ranks[dataset.id] || 1;
		};
		// 方法：获取排名类名
		const getRankClass = (index) => {
			if (index === 0) return "rank-1";
			if (index === 1) return "rank-2";
			if (index === 2) return "rank-3";
			return "";
		};
		// 方法：计算排名（考虑相同分数）
		const calculateRanks = (
			data,
			scoreKey,
			isDetailed = false,
			selectedType = null,
			improvementType = "vs_base"
		) => {
			let dataToRank = data.filter((item) => !isBaseModel(item)); // 排除 base
			let dataWithRoundedScores;

			if (isDetailed && scoreKey && scoreKey !== "name" && scoreKey !== "domain") {
				if (scoreKey === "average") {
					// 详细表格的平均分排名
					dataWithRoundedScores = data.map((item) => ({
						...item,
						roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType)),
					}));
				} else if (scoreKey === "efficiency") {
					// 详细表格的性价比排名
					dataWithRoundedScores = data.map((item) => ({
						...item,
						roundedScore: getTypeEfficiency(item, selectedType),
					}));
				} else if (scoreKey.includes("_")) {
					// 特定任务的排名
					const taskHeaders = getTaskHeaders(selectedType);
					const header = taskHeaders.find(
						(h) => h.taskName + "_" + h.metricName === scoreKey
					);
					if (header) {
						dataWithRoundedScores = data.map((item) => ({
							...item,
							roundedScore: roundToOneDecimal(
								getTaskScore(
									item,
									selectedType,
									header.taskName,
									header.metricName,
									true,
									improvementType
								)
							),
						}));
					} else {
						// 默认使用平均分
						dataWithRoundedScores = data.map((item) => ({
							...item,
							roundedScore: roundToOneDecimal(
								getTypeAverageValue(item, selectedType)
							),
						}));
					}
				} else {
					// 默认使用平均分
					dataWithRoundedScores = data.map((item) => ({
						...item,
						roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType)),
					}));
				}
			} else {
				// 主表格的排名逻辑
				if (scoreKey.includes("_efficiency")) {
					// 对于所有数据性价比列，直接使用原始值进行排序
					dataWithRoundedScores = data.map((item) => ({
						...item,
						roundedScore: item[scoreKey] || 0,
					}));
				} else {
					dataWithRoundedScores = data.map((item) => ({
						...item,
						roundedScore: roundToOneDecimal(item[scoreKey] || 0),
					}));
				}
			}

			// 按照四舍五入后的分数排序
			const sorted = [...dataWithRoundedScores].sort((a, b) => {
				if (scoreKey === "name") {
					return a.name.localeCompare(b.name);
				} else if (scoreKey === "domain") {
					return (a.domain || "").localeCompare(b.domain || "");
				}
				return b.roundedScore - a.roundedScore; // 降序排列
			});

			// 计算排名
			const ranks = {};
			let currentRank = 1;
			let previousScore = null;

			sorted.forEach((item, index) => {
				if (scoreKey === "name" || scoreKey === "domain") {
					ranks[item.id] = index + 1;
				} else {
					if (previousScore !== null && item.roundedScore !== previousScore) {
						currentRank = index + 1;
					}
					ranks[item.id] = currentRank;
					previousScore = item.roundedScore;
				}
			});

			return ranks;
		};

		// 方法：格式化分数（四舍五入到一位小数）
		const formatScore = (score) => {
			if (typeof score === "number") {
				return roundToOneDecimal(score).toFixed(1);
			}
			return "0.0";
		};
		// 方法：四舍五入到一位小数
		const roundToOneDecimal = (score) => {
			if (typeof score === "number") {
				return Math.round(score * 10) / 10;
			}
			return 0;
		};
		// 方法：格式化分数并显示改进值 (主榜单)
		const formatScoreWithImprovement = (
			score,
			improvementValue,
			dataset = null,
			improvementType = "vs_base"
		) => {
			const formattedScore = formatScore(score);
			let diffText = null;
			let diffClass = "";

			// 如果dataset有新的improvement结构，使用新的结构
			if (dataset && dataset.improvement && dataset.improvement[improvementType]) {
				// 根据score类型确定使用哪个improvement值
				let actualImprovementValue = null;
				if (typeof score === "number") {
					// 根据score值判断是哪个领域的分数
					if (Math.abs(score - (dataset.overall_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].overall_avg;
					} else if (Math.abs(score - (dataset.general_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].general_avg;
					} else if (Math.abs(score - (dataset.math_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].math_avg;
					} else if (Math.abs(score - (dataset.code_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].code_avg;
					} else if (Math.abs(score - (dataset.reasoning_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].reasoning_avg;
					}
				}

				if (typeof actualImprovementValue === "number") {
					improvementValue = actualImprovementValue;
				}
			}

			if (typeof improvementValue === "number") {
				// Always show if improvementValue is a number
				const diff = roundToOneDecimal(improvementValue);
				if (diff === 0) {
					diffText = "0.0";
					diffClass = "score-diff-positive"; // Changed to positive for 0.0
				} else {
					diffText = (diff > 0 ? "+" : "") + diff.toFixed(1);
					diffClass = diff > 0 ? "score-diff-positive" : "score-diff-negative";
				}
			}

			return {
				score: formattedScore,
				diffText: diffText,
				diffClass: diffClass,
			};
		};

		const colors = [
			{
				bg: "rgba(30, 64, 175, 0.1)",
				border: "rgba(30, 64, 175, 0.8)",
				point: "rgba(30, 64, 175, 1)",
			},
			{
				bg: "rgba(220, 38, 38, 0.1)",
				border: "rgba(220, 38, 38, 0.8)",
				point: "rgba(220, 38, 38, 1)",
			},
			{
				bg: "rgba(34, 197, 94, 0.1)",
				border: "rgba(34, 197, 94, 0.8)",
				point: "rgba(34, 197, 94, 1)",
			},
			{
				bg: "rgba(251, 146, 60, 0.1)",
				border: "rgba(251, 146, 60, 0.8)",
				point: "rgba(251, 146, 60, 1)",
			},
			{
				bg: "rgba(168, 85, 247, 0.1)",
				border: "rgba(168, 85, 247, 0.8)",
				point: "rgba(168, 85, 247, 1)",
			},
		];

		// 渲染 legend
		function renderRadarLegend(datasets, containerId = "summaryRadarLegend") {
			const legend = document.getElementById(containerId);
			if (!legend) return;
			legend.innerHTML = datasets
				.map(
					(ds) => `
                <div class="legend-item">
                    <span class="legend-marker" style="background:${ds.borderColor};"></span>
                    <span class="legend-label">${ds.label}</span>
                </div>
            `
				)
				.join("");
		}

		function createLlamaRadarChart() {
			const canvas = document.getElementById("summaryLlamaRadarChart");
			if (!canvas) return;

			// i18n translate helper (falls back to key if not ready)
			const t = (key) =>
				window.vm && typeof window.vm.$t === "function" ? window.vm.$t(key) : key;

			// 1. 组装数据
			const top5 = getTop5Datasets();
			const datasets = top5.map((row, idx) => ({
				label: row.name,
				data: [
					row.overall_avg,
					row.general_avg,
					row.math_avg,
					row.code_avg,
					row.reasoning_avg,
				],
				fill: true,
				backgroundColor: colors[idx % colors.length].bg,
				borderColor: colors[idx % colors.length].border,
				borderWidth: 2,
				pointBackgroundColor: colors[idx % colors.length].point,
				pointBorderColor: "#ffffff",
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			}));

			// 2. 销毁旧图表
			if (window.summaryLlamaRadar) {
				window.summaryLlamaRadar.destroy();
			}

			// 3. 创建新雷达图
			window.summaryLlamaRadar = new Chart(canvas.getContext("2d"), {
				type: "radar",
				data: {
					labels: [
						t("all_overall"),
						t("all_general"),
						t("all_math"),
						t("all_code"),
						t("all_reasoning"),
					],
					datasets: datasets,
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					layout: { padding: 8 },
					plugins: {
						legend: { display: false },
						tooltip: {
							enabled: true,
							callbacks: {
								label: function (context) {
									const label = context.dataset.label || "";
									const value = context.formattedValue || "";
									return `${label}: ${parseFloat(value).toFixed(1)}`;
								},
							},
						},
					},
					elements: {
						line: { borderWidth: 2 },
						point: { radius: 4, hoverRadius: 6, borderWidth: 2 },
					},
					scales: {
						r: {
							angleLines: { color: "#e3e8f0" },
							grid: { color: "#e3e8f0" },
							suggestedMin: 0,
							suggestedMax: 100,
							pointLabels: {
								font: { size: 15, weight: "bold" },
								color: "#1e293b",
							},
							ticks: {
								stepSize: 20,
								color: "#64748b",
							},
						},
					},
				},
			});
			// 4. 渲染自定义 legend
			renderRadarLegend(datasets, "summaryRadarLegend");
		}

		function createQwenRadarChart() {
			const canvas = document.getElementById("summaryQwenRadarChart");
			if (!canvas) return;

			// i18n translate helper (falls back to key if not ready)
			const t = (key) =>
				window.vm && typeof window.vm.$t === "function" ? window.vm.$t(key) : key;

			// 1) 取 Qwen 家族数据：来自原始数据的 qwen 分支，而不是当前 currentModel
			const qwenData =
				rawData.value && Array.isArray(rawData.value.qwen) ? rawData.value.qwen : [];
			if (!qwenData.length) return;

			// 2) baseline 行（domain === 'base'）
			const baseRow = qwenData.find((row) => row.domain === "base") || null;

			// 3) 取 ALL 的前 5 名（排除 base/instruct），按照 overall_avg 排序
			const top5 = qwenData
				.filter((row) => row.domain !== "base" && row.domain !== "instruct")
				.slice() // copy
				.sort((a, b) => (b.overall_avg || 0) - (a.overall_avg || 0))
				.slice(0, 5);

			const rowsForChart = top5;
			const datasets = rowsForChart.map((row, idx) => ({
				label: row.name,
				data: [
					row.overall_avg,
					row.general_avg,
					row.math_avg,
					row.code_avg,
					row.reasoning_avg,
				],
				fill: true,
				backgroundColor: colors[idx % colors.length].bg,
				borderColor: colors[idx % colors.length].border,
				borderWidth: 2,
				pointBackgroundColor: colors[idx % colors.length].point,
				pointBorderColor: "#ffffff",
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			}));

			// 5) 销毁旧图表
			if (window.summaryQwenRadar) {
				window.summaryQwenRadar.destroy();
			}

			// 6) 创建新雷达图
			window.summaryQwenRadar = new Chart(canvas.getContext("2d"), {
				type: "radar",
				data: {
					labels: [
						t("all_overall"),
						t("all_general"),
						t("all_math"),
						t("all_code"),
						t("all_reasoning"),
					],
					datasets: datasets,
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					layout: { padding: 8 },
					plugins: {
						legend: { display: false },
						tooltip: {
							enabled: true,
							callbacks: {
								label: function (context) {
									const label = context.dataset.label || "";
									const value = context.formattedValue || "";
									return `${label}: ${parseFloat(value).toFixed(1)}`;
								},
							},
						},
					},
					elements: {
						line: { borderWidth: 2 },
						point: { radius: 4, hoverRadius: 6, borderWidth: 2 },
					},
					scales: {
						r: {
							angleLines: { color: "#e3e8f0" },
							grid: { color: "#e3e8f0" },
							suggestedMin: 0,
							suggestedMax: 100,
							pointLabels: {
								font: { size: 15, weight: "bold" },
								color: "#1e293b",
							},
							ticks: {
								stepSize: 20,
								color: "#64748b",
							},
						},
					},
				},
			});

			// 7) 渲染自定义 legend（单独的容器，避免与 Llama 冲突）
			renderRadarLegend(datasets, "summaryQwenLegend");
		}

		// 贡献者数据
		const contributors = ref([
			{
				id: 1,
				name: "Xiaoyang Wang",
				avatar: "https://avatars.githubusercontent.com/u/27850859?v=4",
				github: "https://github.com/gavinwxy",
			},
			{
				id: 2,
				name: "Qizhi Pei",
				avatar: "https://avatars.githubusercontent.com/u/55624066?v=4",
				github: "https://github.com/QizhiPei",
			},
			{
				id: 3,
				name: "Mengzhang Cai",
				avatar: "https://avatars.githubusercontent.com/u/26041719?v=4",
				github: "https://github.com/orangeadegit",
			},
			{
				id: 4,
				name: "Zinan Tang",
				avatar: "https://avatars.githubusercontent.com/u/108537196?v=4",
				github: "https://github.com/Word2VecT",
			},
			{
				id: 5,
				name: "Yu Li",
				avatar: "https://avatars.githubusercontent.com/u/112166430?v=4",
				github: "https://github.com/Leey21",
			},
			{
				id: 6,
				name: "Mengyuan Sun",
				avatar: "https://avatars.githubusercontent.com/u/100028683?v=4",
				github: "https://github.com/Bl404ue",
			},
			{
				id: 7,
				name: "Honglin Lin",
				avatar: "https://avatars.githubusercontent.com/u/87508425?v=4",
				github: "https://github.com/LHL3341",
			},
			{
				id: 8,
				name: "Xin Gao",
				avatar: "https://avatars.githubusercontent.com/u/91539538?v=4",
				github: "https://github.com/GX-XinGao",
			},
			{
				id: 9,
				name: "Lijun Wu",
				avatar: "https://avatars.githubusercontent.com/u/3659280?v=4",
				github: "https://github.com/apeterswu",
			},
			{
				id: 10,
				name: "Zhuoshi Pan",
				avatar: "https://avatars.githubusercontent.com/u/64088736?v=4",
				github: "https://github.com/pzs19",
			},
			{
				id: 11,
				name: "Chenlin Ming",
				avatar: "https://avatars.githubusercontent.com/u/68684685?v=4",
				github: "https://github.com/ming-bot",
			},
			{
				id: 12,
				name: "Zhanping Zhong",
				avatar: "https://avatars.githubusercontent.com/u/221066409?v=4",
				github: "https://github.com/ChampionZhong",
			},
			{
				id: 13,
				name: "Conghui He",
				avatar: "https://avatars.githubusercontent.com/u/1290544?v=4",
				github: "https://github.com/conghui",
			},
		]);

		const openContributionGuide = () => {
			const guideUrl = "contribution.html";
			window.open(guideUrl, "_blank");
		};

		return {
			toggleLang,
			langAriaLabel,
			// 公用方法可以按需暴露（模板需要时）
			openFeedbackForm,
			loadData,
			generateMockData,
			rawData,
			currentData,
			currentModel,

			// 状态
			loading,
			error,
			searchQuery,
			selectedTags,
			tagFilterMode,
			sizeRangeMin,
			sizeRangeMax,

			// 工具/计算
			isBaseModel,
			isInstructModel,
			getDatasetTags,
			isInSizeRange,
			getSizeValueFromIndex,
			sortedData,
			filteredData,

			// 依赖/工具（可选暴露）
			currentData,
			sortColumn,
			sortDirection,
			sizeValues,
			sizeSliderMax,
			parseSizeToNumber,

			// 模板辅助（避免未定义）
			improvementType,
			filteredDataForRanking,
			getRank,
			getRankClass,
			calculateRanks,
			formatScore,
			roundToOneDecimal,
			formatScoreWithImprovement,

			// 首页摘要与跳转
			summaryLeaderboardRows,
			getTop5Datasets,
			mathTop5Rows,
			codeTop5Rows,
			getTop5ByMetric,
			// Baseline and with-base helpers for Math/Code tables
			baselineRow,
			mathTop5WithBase,
			codeTop5WithBase,
			goToLeaderboard,
			goToDataComparison,

			// radar
			renderRadarLegend,
			createLlamaRadarChart,
			createQwenRadarChart,

			// contributor
			contributors,
			openContributionGuide,

			// i18n lang for reactivity
			i18nLang,
		};
	},
});

// Register i18n plugin before mounting
app.use(createIndexI18nPlugin());

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
