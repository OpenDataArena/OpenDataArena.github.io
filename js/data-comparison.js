import {
	initGeneral,
	initI18nForIndex,
	createComparisonI18nPlugin,
	getLangRef,
} from "./general.js";

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	initI18nForIndex();
});

// Set Chart.js global defaults for light theme
if (typeof Chart !== "undefined") {
	Chart.defaults.color = "#334155";
	Chart.defaults.borderColor = "rgba(0, 0, 0, 0.08)";
	Chart.defaults.scale.ticks.backdropColor = "transparent";
}

const { createApp, ref, computed, onMounted, watch } = Vue;

const app = createApp({
	setup() {
		const loading = ref(true);
		const error = ref(null);
		const llamaDataset = ref(null);
		const qwenDataset = ref(null);

		const selectedDatasets = ref([]);
		const availableDatasets = ref([]);
		const allDatasetsData = ref({});

		// 搜索功能
		const searchInput = ref("");
		const searchQuery = ref("");

		// 卡片
		const cardCollapsed = ref([]);
		const mainCardCollapsed = ref(false);
		const showOriginalCard = ref(true);

		const activeTab = ref("overall");
		const selectedDomains = ref(["overall"]);

		let llamaChart = null;
		let qwenChart = null;
		let judgeQChart = null;
		let judgeQAChart = null;
		let modelEvalChart = null;
		let difficultyQChart = null;
		let relevanceQAChart = null;
		let deitaComplexityQChart = null;
		let thinkingProbQChart = null;
		let deitaQualityQALineChart = null;
		let ifdQABarChart = null;
		let rewardModelQABarChart = null;
		// Per-metric LLM-as-Judge Q/QA line charts
		let judgeMetricQCharts = {};
		let judgeMetricQACharts = {};

		onMounted(() => {
			loadDatasetDetail().then(() => {
				setTimeout(() => {
					initializeCharts();
					update();
				}, 100);
			});
		});

		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : "en";
		});

		// 监听 selectedDatasets，保持所有卡片默认折叠
		watch(selectedDatasets, (newVal) => {
			cardCollapsed.value = newVal.map(() => true);
		});

		// 方法：从URL参数获取数据集ID
		const getUrlParams = () => {
			const urlParams = new URLSearchParams(window.location.search);
			const datasetId = urlParams.get("id");
			return { datasetId };
		};

		// 方法：加载数据集详情
		const loadDatasetDetail = async () => {
			try {
				loading.value = true;
				const { datasetId } = getUrlParams();

				if (!datasetId) {
					throw new Error("Dataset ID not specified");
				}

				const response = await fetch("./data/llm/llm.json");
				if (!response.ok) {
					throw new Error("Failed to load data");
				}

				const data = await response.json();
				allDatasetsData.value = data; // 保存所有数据用于比较

				// 加载两个模型的数据
				const llamaData = data["llama"];
				const qwenData = data["qwen"];

				if (!llamaData || !qwenData) {
					throw new Error("Model data not found");
				}

				const llamaDataset_data = llamaData.find(
					(d) => d.id.toString() === datasetId.toString()
				);
				const qwenDataset_data = qwenData.find(
					(d) => d.id.toString() === datasetId.toString()
				);

				if (!llamaDataset_data || !qwenDataset_data) {
					throw new Error("Dataset not found in both models");
				}

				llamaDataset.value = llamaDataset_data;
				qwenDataset.value = qwenDataset_data;

				// 设置可用于比较的数据集（使用llama数据）
				// 展示所有除id为0和1的数据集，且必须有evaluation_score字段的数据集
				// availableDatasets.value = llamaData.filter(
				//     (d) => d.id !== 0 && d.id !== 1 && d.hasOwnProperty('evaluation_score')
				// );

				availableDatasets.value = llamaData.filter((d) => d.id !== 0 && d.id !== 1);
				// 默认勾选本页面id对应数据集
				if (!selectedDatasets.value.includes(llamaDataset_data.name)) {
					selectedDatasets.value.unshift(llamaDataset_data.name);
				}

				// 更新页面标题
				document.title = `${llamaDataset_data.name} - Dataset Details`;

				return Promise.resolve();
			} catch (err) {
				console.error("Error loading dataset:", err);
				error.value = err.message;
				return Promise.reject(err);
			} finally {
				loading.value = false;
			}
		};

		// 方法：获取数据集对象
		const getDatasetByName = (name) => {
			const llamaModelData = allDatasetsData.value["llama"] || [];
			return llamaModelData.find((d) => d.name === name) || {};
		};

		/* ------------------------------------------------------------------------------------- */

		// 方法：更新搜索
		const applySearch = () => {
			searchQuery.value = searchInput.value;
		};

		// 方法：清空搜索
		const clearSearch = () => {
			searchInput.value = "";
			searchQuery.value = "";
		};

		// 方法：判断是否选中数据集
		const isDatasetSelected = (datasetName) => {
			return selectedDatasets.value.includes(datasetName);
		};

		// 属性：过滤后的数据集
		const filteredDatasets = computed(() => {
			if (!searchQuery.value.trim()) return availableDatasets.value;
			const q = searchQuery.value.trim().toLowerCase();
			return availableDatasets.value.filter((ds) => {
				const name = getDisplayName(ds.name).toLowerCase();
				const tags = (getDatasetTags(ds).join(" ") || "").toLowerCase();
				return name.includes(q) || tags.includes(q);
			});
		});

		// 方法：清除对比框选
		const clearComparison = () => {
			selectedDatasets.value = [];
			showOriginalCard.value = true; // 清空后恢复显示原始卡片
			// 清空时也重置折叠状态
			cardCollapsed.value = [];
		};

		//方法：触发checkbox点击，保证只用v-model控制
		const triggerCheckboxClick = (id) => {
			const checkbox = document.getElementById("compare-checkbox-" + id);
			if (checkbox) checkbox.click();
		};

		/* ------------------------------------------------------------------------------------- */

		// 方法：获取卡片样式（背景色、白字、无边框）
		const getCardRgb = (idx) => chartColorBase[idx % chartColorBase.length].rgb;

		const getCardStyle = (idx) => {
			const rgb = getCardRgb(idx);
			return {
				background: `rgba(${rgb}, 1)`,
				color: "#fff",
				border: "none",
				boxShadow: "0 2px 8px 0 rgba(30,64,175,0.04)",
			};
		};

		//方法：header同body
		const getCardHeaderStyle = (idx) => getCardStyle(idx);

		const getDatasetCardStyle = (idx) => {
			const rgb = getCardRgb(idx);
			return {
				"--comparison-accent": `rgb(${rgb})`,
				"--comparison-accent-soft": `rgba(${rgb}, 0.16)`,
				"--comparison-accent-muted": `rgba(${rgb}, 0.08)`,
				"--comparison-accent-line": `rgba(${rgb}, 0.32)`,
			};
		};

		const getDatasetChipStyle = (idx) => {
			const rgb = getCardRgb(idx);
			return {
				background: `rgba(${rgb}, 0.14)`,
				border: `1px solid rgba(${rgb}, 0.28)`,
				color: "#334155",
				boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)",
			};
		};

		const getCardOrdinal = (idx) => String(idx + 1).padStart(2, "0");

		// 方法：主卡片
		const toggleMainCardCollapse = () => {
			mainCardCollapsed.value = !mainCardCollapsed.value;
		};

		// 方法：获取显示的数据集名字
		const getDisplayName = (datasetName) => {
			const displayNameMapping = {
				"meta-llama/Llama-3.1-8B-Instruct": "Instruct Model",
				"meta-llama/Llama-3.1-8B": "Base Model",
				"Qwen/Qwen2.5-7B-Instruct": "Instruct Model",
				"Qwen/Qwen2.5-7B": "Base Model",
			};
			return displayNameMapping[datasetName] || datasetName;
		};

		// 方法：获取数据集tag
		const getDatasetTags = (dataset) => {
			const tags = [];
			const tagStr = dataset.tag || "";
			if (tagStr) {
				const parsedTags = tagStr
					.split(",")
					.map((t) => t.trim())
					.filter((t) => t);
				tags.push(...parsedTags);
			}
			return tags;
		};

		// 方法：获取tag icon
		const getTagIcon = (tag) => {
			const tagIcons = {
				general: "fas fa-book",
				math: "fas fa-calculator",
				code: "fas fa-code",
				science: "fas fa-flask",
				reasoning: "fas fa-brain",
			};

			return tagIcons[tag.toLowerCase()] || "fas fa-tag";
		};

		// 方法：获取标签显示名称（首字母大写）
		const getTagDisplayName = (tag) => {
			if (!tag) return "";
			return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
		};

		// 方法：切换卡片折叠
		const toggleCardCollapse = (idx) => {
			cardCollapsed.value[idx] = !cardCollapsed.value[idx];
		};

		// 属性：chartColorBase
		const chartColorBase = [
			{ rgb: "30, 64, 175" },
			{ rgb: "200, 30, 38" },
			{ rgb: "0, 128, 64" },
			{ rgb: "204, 102, 0" },
			{ rgb: "110, 36, 150" },
			{ rgb: "204, 153, 0" },
		];

		/* ------------------------------------------------------------------------------------- */

		// 方法：格式化分数
		const formatScore = (score) => {
			if (typeof score === "number") {
				return (Math.round(score * 10) / 10).toFixed(1);
			}
			return "0.0";
		};

		// 方法：格式化改进值
		const formatImprovement = (improvement) => {
			if (typeof improvement === "number") {
				const diff = Math.round(improvement * 10) / 10;
				return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
			}
			return "";
		};

		// 方法：获取领域显示名称
		const getDomainDisplayName = (domain) => {
			const domainNames = {
				general: "General",
				math: "Math",
				code: "Code",
				reasoning: "Reasoning",
				base: "Base Model",
			};
			return domainNames[domain] || domain;
		};

		// 方法：多选领域功能
		const toggleDomain = (domain) => {
			const index = selectedDomains.value.indexOf(domain);
			if (index > -1) {
				selectedDomains.value.splice(index, 1);
			} else {
				selectedDomains.value.push(domain);
			}
			update();
		};

		// 方法：获取多个domain的数据
		const getMultiDomainChartData = (datasetObj) => {
			if (selectedDomains.value.length === 0) {
				return {
					labels: [],
					data: [],
					title: "No domains selected",
				};
			}

			const allLabels = [];
			const allData = [];
			let title = "";

			selectedDomains.value.forEach((domain) => {
				const domainData = getChartDataForDataset(datasetObj, domain);
				if (domainData.labels.length > 0) {
					allLabels.push(...domainData.labels);
					allData.push(...domainData.data);
					if (!title) title = domainData.title;
				}
			});

			return {
				labels: allLabels,
				data: allData,
				title: selectedDomains.value.length > 1 ? "Multi-Domain Performance" : title,
			};
		};

		// 方法：获取图表数据
		const getChartDataForDataset = (datasetObj, tabType) => {
			switch (tabType) {
				case "overall":
					return {
						labels: ["General", "Math", "Code", "Reasoning"],
						data: [
							datasetObj.general_avg || 0,
							datasetObj.math_avg || 0,
							datasetObj.code_avg || 0,
							datasetObj.reasoning_avg || 0,
						],
						title: "Overall Performance",
					};

				case "general":
					if (datasetObj.task_details?.general_tasks) {
						return {
							labels: datasetObj.task_details.general_tasks.map(
								(task) => task.task_name
							),
							data: datasetObj.task_details.general_tasks.map(
								(task) => task.metrics[0]?.score || 0
							),
							title: "General Tasks Performance",
						};
					}
					break;

				case "math":
					if (datasetObj.task_details?.math_tasks) {
						return {
							labels: datasetObj.task_details.math_tasks.map(
								(task) => task.task_name
							),
							data: datasetObj.task_details.math_tasks.map(
								(task) => task.metrics[0]?.score || 0
							),
							title: "Math Tasks Performance",
						};
					}
					break;

				case "code":
					if (datasetObj.task_details?.code_tasks) {
						const labels = [];
						const data = [];

						datasetObj.task_details.code_tasks.forEach((task) => {
							if (task.metrics && task.metrics.length > 1) {
								task.metrics.forEach((metric) => {
									let shortTask = task.task_name;
									if (shortTask === "LiveCodeBench") shortTask = "LCB";
									if (shortTask === "humaneval") shortTask = "HE";

									let shortMetric = metric.metric
										.replace("lcb_", "")
										.replace("_", " ");
									if (shortMetric === "code generation") shortMetric = "gen";
									if (shortMetric === "code execution") shortMetric = "exec";
									if (shortMetric === "test output") shortMetric = "test";
									if (shortMetric === "pass@1") shortMetric = "pass";
									if (shortMetric === "score 3shot") shortMetric = "score";

									labels.push(`${shortTask}\n${shortMetric}`);
									data.push(metric.score || 0);
								});
							} else {
								let shortTask = task.task_name;
								if (shortTask === "humaneval") shortTask = "HE";
								labels.push(shortTask);
								data.push(task.metrics[0]?.score || 0);
							}
						});

						return {
							labels,
							data,
							title: "Code Tasks Performance",
						};
					}
					break;

				case "reasoning":
					if (datasetObj.task_details?.reasoning_tasks) {
						return {
							labels: datasetObj.task_details.reasoning_tasks.map(
								(task) => task.task_name
							),
							data: datasetObj.task_details.reasoning_tasks.map(
								(task) => task.metrics[0]?.score || 0
							),
							title: "Reasoning Tasks Performance",
						};
					}
					break;
			}

			return { labels: [], data: [], title: "" };
		};

		// 方法：创建单个雷达图
		const createRadarChart = (
			canvasId,
			labels,
			dataArrays,
			title,
			names = null,
			existingChart = null
		) => {
			const ctx = document.getElementById(canvasId);
			if (!ctx) return null;

			// 如果已存在图表，先销毁
			if (existingChart) {
				existingChart.destroy();
			}

			// 注册data labels插件
			Chart.register(ChartDataLabels);

			if (!Array.isArray(dataArrays[0])) {
				dataArrays = [dataArrays];
				names = names || [title];
			}

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
				{
					bg: "rgba(204, 153, 0, 0.1)",
					border: "rgba(204, 153, 0, 0.8)",
					point: "rgba(204, 153, 0, 1)",
				},
			];

			const datasets = dataArrays.map((data, index) => ({
				label: names[index] || `Dataset ${index + 1}`,
				data: data,
				backgroundColor: colors[index % colors.length].bg,
				borderColor: colors[index % colors.length].border,
				borderWidth: 2,
				pointBackgroundColor: colors[index % colors.length].point,
				pointBorderColor: "#ffffff",
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			}));

			// 针对LLM-as-Judge (Q Score)和LLM-as-Judge (QA Score)雷达图自定义刻度
			let customOptions = {};
			if (canvasId === "llmJudgeQRadarChart" || canvasId === "llmJudgeQARadarChart") {
				customOptions = {
					scales: {
						r: {
							beginAtZero: true,
							min: 0,
							max: 10,
							ticks: {
								stepSize: 2,
								color: "#94a3b8",
								callback: function (value) {
									return [0, 2, 4, 6, 8, 10].includes(value) ? value : "";
								},
								backdrop: {
									color: "transparent",
								},
							},
							pointLabels: {
								font: {
									size: 12,
									weight: "600",
									family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
								},
								color: "#334155",
								padding: 20,
								centerPointLabels: false,
								display: true,
							},
							grid: {
								color: "rgba(0, 0, 0, 0.08)",
							},
							angleLines: {
								color: "rgba(0, 0, 0, 0.08)",
							},
						},
					},
				};
			} else if (canvasId === "modelEvalRadarChart") {
				customOptions = {
					scales: {
						r: {
							beginAtZero: true,
							min: 0,
							max: 1,
							ticks: {
								stepSize: 0.2,
								color: "#94a3b8",
								callback: function (value) {
									return [0.0, 0.2, 0.4, 0.6, 0.8, 1.0].includes(
										Number(value.toFixed(1))
									)
										? value.toFixed(1)
										: "";
								},
								backdrop: {
									color: "transparent",
								},
							},
							pointLabels: {
								font: {
									size: 12,
									weight: "600",
									family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
								},
								color: "#334155",
								padding: 20,
								centerPointLabels: false,
								display: true,
							},
							grid: {
								color: "rgba(0, 0, 0, 0.08)",
							},
							angleLines: {
								color: "rgba(0, 0, 0, 0.08)",
							},
						},
					},
				};
			}
			const chart = new Chart(ctx, {
				type: "radar",
				data: {
					labels: labels,
					datasets: datasets,
				},
				options: Object.assign(
					{
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								display: datasets.length > 1,
								position: "bottom",
								labels: {
									padding: 20,
									usePointStyle: true,
									color: "#334155",
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							datalabels: {
								display: datasets.length === 1, // 只有单个数据集时显示
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							r: {
								beginAtZero: true,
								max: 100,
								grid: {
									color: "rgba(0, 0, 0, 0.08)",
								},
								angleLines: {
									color: "rgba(0, 0, 0, 0.08)",
								},
								pointLabels: {
									font: {
										size: 12,
										weight: "600",
										family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
									},
									color: "#334155",
									padding: 20,
									centerPointLabels: false,
									display: true,
								},
								ticks: {
									stepSize: 20,
									color: "#94a3b8",
									backdrop: {
										color: "transparent",
									},
								},
							},
						},
						layout: {
							padding: {
								top: 45,
								bottom: 70,
								left: 70,
								right: 70,
							},
						},
					},
					customOptions
				),
			});

			return chart;
		};

		// 方法：初始化表格
		const initializeCharts = () => {
			// TODO(zzp): how many charts?
			createRadarChart();
		};

		// 方法：更新对比（performance）
		const updatePerformance = () => {
			showOriginalCard.value = false; // 更新后隐藏原始卡片
			const llamaModelData = allDatasetsData.value["llama"] || [];
			const qwenModelData = allDatasetsData.value["qwen"] || [];
			const datasetNameMapping = {
				"meta-llama/Llama-3.1-8B-Instruct": "Qwen/Qwen2.5-7B-Instruct",
				"meta-llama/Llama-3.1-8B": "Qwen/Qwen2.5-7B",
			};
			// 只显示当前勾选的数据集
			let llamaDataArrays = [];
			let qwenDataArrays = [];
			let llamaNames = [];
			let qwenNames = [];
			let chartLabels = [];
			let chartTitle = "";
			if (selectedDatasets.value.length > 0) {
				selectedDatasets.value.forEach((datasetName) => {
					const compareLlamaDataset = llamaModelData.find((d) => d.name === datasetName);
					const qwenDatasetName = datasetNameMapping[datasetName] || datasetName;
					const compareQwenDataset = qwenModelData.find(
						(d) => d.name === qwenDatasetName
					);
					if (compareLlamaDataset && compareQwenDataset) {
						const llamaCompareData = getMultiDomainChartData(compareLlamaDataset);
						const qwenCompareData = getMultiDomainChartData(compareQwenDataset);
						llamaDataArrays.push(llamaCompareData.data);
						qwenDataArrays.push(qwenCompareData.data);
						llamaNames.push(compareLlamaDataset.name);
						qwenNames.push(compareQwenDataset.name);
						if (chartLabels.length === 0) {
							chartLabels = llamaCompareData.labels;
							chartTitle = llamaCompareData.title;
						}
					}
				});
			}
			llamaChart = createRadarChart(
				"llamaRadarChart",
				chartLabels,
				llamaDataArrays,
				chartTitle,
				llamaNames,
				llamaChart
			);
			qwenChart = createRadarChart(
				"qwenRadarChart",
				chartLabels,
				qwenDataArrays,
				chartTitle,
				qwenNames,
				qwenChart
			);
			// 保证折叠数组长度与选中数据集一致
			cardCollapsed.value = selectedDatasets.value.map(() => true);
		};

		// 属性：计算Heuristic表格数据，随selectedDatasets同步
		const selectedHeuristicDatasets = computed(() => {
			return selectedDatasets.value
				.map((name) => {
					const ds = getDatasetByName(name);
					if (!ds) return null;
					const aLength = ds?.evaluation_score?.QA_scores?.Heuristic?.A_Length;
					return {
						name: ds.name,
						min: aLength?.min || "-",
						max: aLength?.max || "-",
						avg: aLength?.avg || "-",
					};
				})
				.filter(Boolean);
		});

		// 方法：创建三图
		const createTripleRadarCharts = (
			llmJudgeQLabels,
			llmJudgeQDataArrays,
			llmJudgeQNames,
			llmJudgeQALabels,
			llmJudgeQADataArrays,
			llmJudgeQANames,
			modelEvalLabels,
			modelEvalDataArrays,
			modelEvalNames,
			existingJudgeQChart,
			existingJudgeQAChart,
			existingModelChart
		) => {
			const newJudgeQChart = createRadarChart(
				"llmJudgeQRadarChart",
				llmJudgeQLabels,
				llmJudgeQDataArrays,
				"LLM-as-Judge (Q Score)",
				llmJudgeQNames,
				existingJudgeQChart
			);
			const newJudgeQAChart = createRadarChart(
				"llmJudgeQARadarChart",
				llmJudgeQALabels,
				llmJudgeQADataArrays,
				"LLM-as-Judge (QA Score)",
				llmJudgeQANames,
				existingJudgeQAChart
			);
			const newModelEvalChart = createRadarChart(
				"modelEvalRadarChart",
				modelEvalLabels,
				modelEvalDataArrays,
				"Model-based Evaluation",
				modelEvalNames,
				existingModelChart
			);
			return {
				judgeQChart: newJudgeQChart,
				judgeQAChart: newJudgeQAChart,
				modelEvalChart: newModelEvalChart,
			};
		};

		// 方法：处理三图数据
		const getTripleScoreData = (datasets, type) => {
			// type: 'LLM-as-Judge-Q', 'LLM-as-Judge-QA', 'Model-based Evaluation'
			// 返回 {labels, dataArrays, names}
			// 目标：严格按选中顺序对齐 (names === selected order)，缺失指标补 0，避免数据与颜色/legend 错位。
			const datasetNames = datasets.map((ds) => ds.name);

			// 1) 先收集所有 labels，保持遇到顺序稳定
			const labelSet = new Set();
			const pushLabel = (label) => {
				if (label && !labelSet.has(label)) labelSet.add(label);
			};

			datasets.forEach((ds) => {
				const es = ds.evaluation_score || {};
				if (type === "LLM-as-Judge-Q") {
					const q = es.Q_scores?.["LLM-as-Judge"] || {};
					Object.keys(q).forEach((metric) => {
						const mean = q[metric]?.mean;
						if (typeof mean === "number") pushLabel(metric);
					});
				} else if (type === "LLM-as-Judge-QA") {
					const qa = es.QA_scores?.["LLM-as-Judge"] || {};
					Object.keys(qa).forEach((metric) => {
						const mean = qa[metric]?.mean;
						if (typeof mean === "number") pushLabel(metric);
					});
				} else if (type === "Model-based Evaluation") {
					const q = es.Q_scores?.["Model-based Evaluation"] || {};
					const qa = es.QA_scores?.["Model-based Evaluation"] || {};
					Object.keys(q).forEach((metric) => {
						const mean = q[metric]?.mean;
						if (typeof mean === "number") pushLabel(metric);
					});
					Object.keys(qa).forEach((metric) => {
						const mean = qa[metric]?.mean;
						if (typeof mean === "number") pushLabel(metric);
					});
				}
			});

			const labels = Array.from(labelSet);

			// 2) 再按 datasetNames 的顺序对齐生成 dataArrays；缺失项补 0
			const dataArrays = datasetNames.map((name) => {
				const ds = datasets.find((d) => d.name === name) || {};
				const es = ds.evaluation_score || {};
				return labels.map((metric) => {
					let mean = null;
					if (type === "LLM-as-Judge-Q") {
						mean = es.Q_scores?.["LLM-as-Judge"]?.[metric]?.mean;
					} else if (type === "LLM-as-Judge-QA") {
						mean = es.QA_scores?.["LLM-as-Judge"]?.[metric]?.mean;
					} else if (type === "Model-based Evaluation") {
						const mQ = es.Q_scores?.["Model-based Evaluation"]?.[metric]?.mean;
						const mQA = es.QA_scores?.["Model-based Evaluation"]?.[metric]?.mean;
						mean = typeof mQ === "number" ? mQ : mQA;
					}
					return typeof mean === "number" ? Number(mean.toFixed(1)) : 0;
				});
			});

			return { labels, dataArrays, names: datasetNames };
		};

		// 方法：处理2曲线图数据
		const get2LineChartData = (datasets, type, metricName) => {
			// type: 'Q' or 'QA', metricName: 'Coherence', 'Completeness', etc.
			const labelsArr = [];
			const dataArr = [];
			const names = [];
			datasets.forEach((ds) => {
				let metric = null;
				if (type === "Q")
					metric = ds?.evaluation_score?.Q_scores?.["LLM-as-Judge"]?.[metricName];
				else if (type === "QA")
					metric = ds?.evaluation_score?.QA_scores?.["LLM-as-Judge"]?.[metricName];
				if (metric && Array.isArray(metric.range) && Array.isArray(metric.distribution)) {
					labelsArr.push(metric.range);
					dataArr.push(metric.distribution);
					names.push(ds.name);
				} else {
					// 空数据
					labelsArr.push([]);
					dataArr.push([]);
					names.push(ds.name);
				}
			});
			// 只要有一个数据集有数据，labels用第一个非空的
			let labels = [];
			for (let arr of labelsArr) {
				if (arr.length) {
					labels = arr;
					break;
				}
			}
			return { labels, dataArr, names };
		};

		// 方法：创建2曲线图
		const create2LineCharts = (
			metricName,
			qLabels,
			qData,
			qNames,
			qaLabels,
			qaData,
			qaNames,
			existingQChart,
			existingQAChart
		) => {
			let qChart = null;
			const ctxQ = document.getElementById(metricName.toLowerCase() + "QLineChart");
			if (ctxQ && existingQChart) existingQChart.destroy();
			if (ctxQ) {
				qChart = new Chart(ctxQ, {
					type: "line",
					data: {
						labels: qLabels,
						datasets: qData.map((data, idx) => ({
							label: qNames[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: qData.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			let qaChart = null;
			const ctxQA = document.getElementById(metricName.toLowerCase() + "QALineChart");
			if (ctxQA && existingQAChart) existingQAChart.destroy();
			if (ctxQA) {
				qaChart = new Chart(ctxQA, {
					type: "line",
					data: {
						labels: qaLabels,
						datasets: qaData.map((data, idx) => ({
							label: qaNames[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: qaData.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			return { qChart, qaChart };
		};

		// 方法：处理 difficulty relevance 数据
		const getDifficultyLineChartData = (datasets, type) => {
			// type: 'Q' or 'QA'
			const labelsArr = [];
			const dataArr = [];
			const names = [];
			datasets.forEach((ds) => {
				let metric = null;
				if (type === "Q")
					metric = ds?.evaluation_score?.Q_scores?.["LLM-as-Judge"]?.Difficulty;
				else if (type === "QA")
					metric = ds?.evaluation_score?.QA_scores?.["LLM-as-Judge"]?.Relevance;
				if (metric && Array.isArray(metric.range) && Array.isArray(metric.distribution)) {
					labelsArr.push(metric.range);
					dataArr.push(metric.distribution);
					names.push(ds.name);
				} else {
					// 空数据
					labelsArr.push([]);
					dataArr.push([]);
					names.push(ds.name);
				}
			});
			// 只要有一个数据集有数据，labels用第一个非空的
			let labels = [];
			for (let arr of labelsArr) {
				if (arr.length) {
					labels = arr;
					break;
				}
			}
			return { labels, dataArr, names };
		};

		// 方法：创建 difficulty relevance 图
		const createDiffAndRelCharts = (
			openQ,
			relQA,
			existingDifficultyQChart,
			existingRelevanceQAChart
		) => {
			let newDifficultyQChart = null;
			const openCtx = document.getElementById("difficultyQLineChart");
			if (openCtx && existingDifficultyQChart) existingDifficultyQChart.destroy();
			if (openCtx) {
				newDifficultyQChart = new Chart(openCtx, {
					type: "line",
					data: {
						labels: openQ.labels,
						datasets: openQ.dataArr.map((data, idx) => ({
							label: openQ.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: { size: 12, weight: "500" },
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: openQ.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: { size: 12, weight: "600" },
								formatter: (value) => value.toFixed(1),
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: { size: 13, weight: "600" },
								},
								grid: { color: "rgba(30, 64, 175, 0.08)" },
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: { size: 13, weight: "600" },
								},
								beginAtZero: true,
								grid: { color: "rgba(30, 64, 175, 0.08)" },
								ticks: { font: { size: 12 }, callback: (v) => v },
							},
						},
						layout: { padding: { top: 30, bottom: 40, left: 30, right: 30 } },
					},
				});
			}
			let newRelevanceQAChart = null;
			const relCtx = document.getElementById("relevanceQALineChart");
			if (relCtx && existingRelevanceQAChart) existingRelevanceQAChart.destroy();
			if (relCtx) {
				newRelevanceQAChart = new Chart(relCtx, {
					type: "line",
					data: {
						labels: relQA.labels,
						datasets: relQA.dataArr.map((data, idx) => ({
							label: relQA.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: { size: 12, weight: "500" },
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: relQA.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: { size: 12, weight: "600" },
								formatter: (value) => value.toFixed(1),
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: { size: 13, weight: "600" },
								},
								grid: { color: "rgba(30, 64, 175, 0.08)" },
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: { size: 13, weight: "600" },
								},
								beginAtZero: true,
								grid: { color: "rgba(30, 64, 175, 0.08)" },
								ticks: { font: { size: 12 }, callback: (v) => v },
							},
						},
						layout: { padding: { top: 30, bottom: 40, left: 30, right: 30 } },
					},
				});
			}
			return {
				difficultyQChart: newDifficultyQChart || existingDifficultyQChart,
				relevanceQAChart: newRelevanceQAChart || existingRelevanceQAChart,
			};
		};

		// 方法：处理model based Q 双图数据
		const getModelBasedQLineChartData = (datasets, metric) => {
			// metric: 'Deita Complexity' or 'Thinking Prob'
			const labelsArr = [];
			const dataArr = [];
			const names = [];
			datasets.forEach((ds) => {
				const q = ds?.evaluation_score?.Q_scores?.["Model-based Evaluation"] || {};
				const m = q[metric];
				if (m && Array.isArray(m.range) && Array.isArray(m.distribution)) {
					if (metric === "Deita Complexity") {
						// x轴: 1,2,3,4,5,6
						labelsArr.push([1, 2, 3, 4, 5, 6]);
						dataArr.push(m.distribution);
						names.push(ds.name);
					} else if (metric === "Thinking Prob") {
						// x轴: (range[i]+range[i+1])/2, i=0..5, 保留一位小数
						const xLabels = [];
						for (let i = 0; i < 6; i++) {
							if (
								typeof m.range[i] === "number" &&
								typeof m.range[i + 1] === "number"
							) {
								xLabels.push(
									Number(((m.range[i] + m.range[i + 1]) / 2).toFixed(1))
								);
							} else {
								xLabels.push("");
							}
						}
						labelsArr.push(xLabels);
						dataArr.push(m.distribution);
						names.push(ds.name);
					}
				} else {
					// 空数据
					if (metric === "Deita Complexity") labelsArr.push([1, 2, 3, 4, 5, 6]);
					else if (metric === "Thinking Prob")
						labelsArr.push([0, 0.2, 0.4, 0.6, 0.8, 1.0]);
					dataArr.push([]);
					names.push(ds.name);
				}
			});
			// 只要有一个数据集有数据，labels用第一个非空的
			let labels = [];
			for (let arr of labelsArr) {
				if (arr.length && arr.some((x) => x !== "")) {
					labels = arr;
					break;
				}
			}
			return { labels, dataArr, names };
		};

		// 方法：创建DeitaQ曲线图
		const createDeitaQCharts = (deitaQ, existingDeitaQChart) => {
			let newDeitaChart = null;
			const deitaCtx = document.getElementById("deitaComplexityQLineChart");
			if (deitaCtx && existingDeitaQChart) existingDeitaQChart.destroy();
			if (deitaCtx) {
				newDeitaChart = new Chart(deitaCtx, {
					type: "line",
					data: {
						labels: deitaQ.labels,
						datasets: deitaQ.dataArr.map((data, idx) => ({
							label: deitaQ.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: deitaQ.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			return newDeitaChart || existingDeitaQChart;
		};

		// 方法：计算Thinking Prob柱状图区间label
		const getThinkingProbBarChartLabels = (range) => {
			if (!Array.isArray(range) || range.length < 2) return [];
			const labels = [];
			for (let i = 0; i < range.length - 1; i++) {
				labels.push(`[${range[i]}, ${range[i + 1]})`);
			}
			return labels;
		};

		// 方法：生成Model-based Evaluation (Q)卡片的柱状图
		const createThinkQChart = (labels, dataArr, names, existingChart) => {
			let newThinkChart = null;
			const ctx = document.getElementById("thinkingProbQLineChart");
			if (ctx && existingChart) existingChart.destroy();
			if (ctx) {
				newThinkChart = new Chart(ctx, {
					type: "bar",
					data: {
						labels: labels,
						datasets: dataArr.map((data, idx) => ({
							label: names[idx] || `Dataset ${idx + 1}`,
							data: data,
							backgroundColor: getCardStyle(idx).background,
							borderColor: getCardStyle(idx).background,
							borderWidth: 1,
							borderRadius: 6,
							barPercentage: 0.7,
							categoryPercentage: 0.7,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			return newThinkChart || existingChart;
		};

		// 方法：处理Model-based 三图数据
		const getModelBasedQALineChartData = (datasets, metric) => {
			// metric: 'Deita Quality', 'IFD', 'Reward Model'
			const labelsArr = [];
			const dataArr = [];
			const names = [];
			datasets.forEach((ds) => {
				const qa = ds?.evaluation_score?.QA_scores?.["Model-based Evaluation"] || {};
				const m = qa[metric];
				if (m && Array.isArray(m.range) && Array.isArray(m.distribution)) {
					if (metric === "Deita Quality") {
						// 线图：使用range作为x轴标签
						labelsArr.push(m.range);
						dataArr.push(m.distribution);
						names.push(ds.name);
					} else if (metric === "IFD" || metric === "Reward Model") {
						// 柱状图：使用区间标签
						const intervalLabels = [];
						for (let i = 0; i < m.range.length - 1; i++) {
							intervalLabels.push(`[${m.range[i]}, ${m.range[i + 1]})`);
						}
						labelsArr.push(intervalLabels);
						dataArr.push(m.distribution);
						names.push(ds.name);
					}
				} else {
					// 空数据
					if (metric === "Deita Quality") {
						labelsArr.push([]);
						dataArr.push([]);
					} else if (metric === "IFD" || metric === "Reward Model") {
						labelsArr.push([]);
						dataArr.push([]);
					}
					names.push(ds.name);
				}
			});
			// 只要有一个数据集有数据，labels用第一个非空的
			let labels = [];
			for (let arr of labelsArr) {
				if (arr.length && arr.some((x) => x !== "")) {
					labels = arr;
					break;
				}
			}
			return { labels, dataArr, names };
		};

		// 方法：创建Model-based QA三图
		const createModelBasedQACharts = (
			deitaQualityData,
			ifdData,
			rewardModelData,
			existingDeitaQualityChart,
			existingIfdChart,
			existingRewardChart
		) => {
			let newDeitaQualityChart = null;
			const deitaQualityCtx = document.getElementById("deitaQualityQALineChart");
			if (deitaQualityCtx && existingDeitaQualityChart) existingDeitaQualityChart.destroy();
			if (deitaQualityCtx) {
				newDeitaQualityChart = new Chart(deitaQualityCtx, {
					type: "line",
					data: {
						labels: deitaQualityData.labels,
						datasets: deitaQualityData.dataArr.map((data, idx) => ({
							label: deitaQualityData.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							fill: false,
							borderColor: getCardStyle(idx).background,
							backgroundColor: getCardStyle(idx).background,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: deitaQualityData.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			let newIfdChart = null;
			const ifdCtx = document.getElementById("ifdQABarChart");
			if (ifdCtx && existingIfdChart) existingIfdChart.destroy();
			if (ifdCtx) {
				newIfdChart = new Chart(ifdCtx, {
					type: "bar",
					data: {
						labels: ifdData.labels,
						datasets: ifdData.dataArr.map((data, idx) => ({
							label: ifdData.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							backgroundColor: getCardStyle(idx).background,
							borderColor: getCardStyle(idx).background,
							borderWidth: 1,
							borderRadius: 6,
							barPercentage: 0.7,
							categoryPercentage: 0.7,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: ifdData.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			let newRewardModelChart = null;
			const rewardModelCtx = document.getElementById("rewardModelQABarChart");
			if (rewardModelCtx && existingRewardChart) existingRewardChart.destroy();
			if (rewardModelCtx) {
				newRewardModelChart = new Chart(rewardModelCtx, {
					type: "bar",
					data: {
						labels: rewardModelData.labels,
						datasets: rewardModelData.dataArr.map((data, idx) => ({
							label: rewardModelData.names[idx] || `Dataset ${idx + 1}`,
							data: data,
							backgroundColor: getCardStyle(idx).background,
							borderColor: getCardStyle(idx).background,
							borderWidth: 1,
							borderRadius: 6,
							barPercentage: 0.7,
							categoryPercentage: 0.7,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						aspectRatio: 1.8,
						plugins: {
							legend: {
								display: true,
								position: "bottom",
								labels: {
									padding: 30,
									usePointStyle: true,
									font: {
										size: 12,
										weight: "500",
									},
								},
							},
							tooltip: {
								callbacks: {
									title: function () {
										return "";
									},
									label: function (context) {
										return (
											context.dataset.label +
											": (" +
											context.label +
											", " +
											context.parsed.y +
											"%)"
										);
									},
								},
							},
							datalabels: {
								display: rewardModelData.dataArr.length === 1,
								align: "end",
								anchor: "end",
								color: "#334155",
								font: {
									size: 12,
									weight: "600",
								},
								formatter: (value) => {
									return value.toFixed(1);
								},
								offset: 8,
							},
						},
						scales: {
							x: {
								title: {
									display: true,
									text: "Score",
									font: {
										size: 13,
										weight: "600",
									},
								},
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: { font: { size: 12 } },
							},
							y: {
								title: {
									display: true,
									text: "%",
									font: {
										size: 13,
										weight: "600",
									},
								},
								beginAtZero: true,
								grid: {
									color: "rgba(0, 0, 0, 0.07)",
								},
								ticks: {
									font: { size: 12 },
									callback: (v) => v,
								},
							},
						},
						layout: {
							padding: {
								top: 30,
								bottom: 40,
								left: 30,
								right: 30,
							},
						},
					},
				});
			}
			return {
				deitaQualityChart: newDeitaQualityChart || existingDeitaQualityChart,
				ifdChart: newIfdChart || existingIfdChart,
				rewardModelChart: newRewardModelChart || existingRewardChart,
			};
		};

		const updateDataScore = () => {
			// 获取当前选中数据集对象
			const llamaModelData = allDatasetsData.value["llama"] || [];
			const selectedObjs = selectedDatasets.value
				.map((name) => llamaModelData.find((d) => d.name === name))
				.filter(Boolean);

			// LLM-as-Judge (Q Score)
			const judgeQ = getTripleScoreData(selectedObjs, "LLM-as-Judge-Q");
			// LLM-as-Judge (QA Score)
			const judgeQA = getTripleScoreData(selectedObjs, "LLM-as-Judge-QA");
			// Model-based Evaluation
			const modelEval = getTripleScoreData(selectedObjs, "Model-based Evaluation");
			const triple = createTripleRadarCharts(
				judgeQ.labels,
				judgeQ.dataArrays,
				judgeQ.names,
				judgeQA.labels,
				judgeQA.dataArrays,
				judgeQA.names,
				modelEval.labels,
				modelEval.dataArrays,
				modelEval.names,
				judgeQChart,
				judgeQAChart,
				modelEvalChart
			);
			judgeQChart = triple.judgeQChart;
			judgeQAChart = triple.judgeQAChart;
			modelEvalChart = triple.modelEvalChart;

			// 2 line charts
			const metrics = [
				"Clarity",
				"Coherence",
				"Completeness",
				"Complexity",
				"Correctness",
				"Meaningfulness",
			];
			metrics.forEach((metric) => {
				const key = metric.toLowerCase();
				const q = get2LineChartData(selectedObjs, "Q", metric);
				const qa = get2LineChartData(selectedObjs, "QA", metric);
				const res = create2LineCharts(
					metric,
					q.labels,
					q.dataArr,
					q.names,
					qa.labels,
					qa.dataArr,
					qa.names,
					judgeMetricQCharts[key],
					judgeMetricQACharts[key]
				);
				if (res) {
					judgeMetricQCharts[key] = res.qChart || judgeMetricQCharts[key] || null;
					judgeMetricQACharts[key] = res.qaChart || judgeMetricQACharts[key] || null;
				}
			});

			// difficulty and rel
			const openQ = getDifficultyLineChartData(selectedObjs, "Q");
			const relQA = getDifficultyLineChartData(selectedObjs, "QA");
			const diffRel = createDiffAndRelCharts(
				openQ,
				relQA,
				difficultyQChart,
				relevanceQAChart
			);
			if (diffRel) {
				difficultyQChart = diffRel.difficultyQChart;
				relevanceQAChart = diffRel.relevanceQAChart;
			}

			// Model-based Q
			const deitaQ = getModelBasedQLineChartData(selectedObjs, "Deita Complexity");
			const thinkQ = getModelBasedQLineChartData(selectedObjs, "Thinking Prob");
			let barLabels = [];
			if (selectedObjs.length > 0) {
				// 只要有一个数据集有数据，取第一个非空的range
				for (let ds of selectedObjs) {
					const q = ds?.evaluation_score?.Q_scores?.["Model-based Evaluation"] || {};
					const m = q["Thinking Prob"];
					if (m && Array.isArray(m.range) && m.range.length > 1) {
						barLabels = getThinkingProbBarChartLabels(m.range);
						break;
					}
				}
			}
			deitaComplexityQChart = createDeitaQCharts(deitaQ, deitaComplexityQChart);
			thinkingProbQChart = createThinkQChart(
				barLabels,
				thinkQ.dataArr,
				thinkQ.names,
				thinkingProbQChart
			);

			// Model-based QA
			const deitaQualityQA = getModelBasedQALineChartData(selectedObjs, "Deita Quality");
			const ifdQA = getModelBasedQALineChartData(selectedObjs, "IFD");
			const rewardModelQA = getModelBasedQALineChartData(selectedObjs, "Reward Model");
			const qaCharts = createModelBasedQACharts(
				deitaQualityQA,
				ifdQA,
				rewardModelQA,
				deitaQualityQALineChart,
				ifdQABarChart,
				rewardModelQABarChart
			);
			if (qaCharts) {
				deitaQualityQALineChart = qaCharts.deitaQualityChart;
				ifdQABarChart = qaCharts.ifdChart;
				rewardModelQABarChart = qaCharts.rewardModelChart;
			}
		};

		// 方法：更新图表
		const update = () => {
			updatePerformance();
			updateDataScore();
		};

		// 属性：卡片折叠状态
		const expandedCards = ref({
			llmjudge: false,
			clarity: false,
			coherence: false,
			completeness: false,
			complexity: false,
			correctness: false,
			meaningfulness: false,
			difficulty: false,
			modelevaluation: false,
			modelbasedq: false,
			modelbasedqa: false,
		});

		// 方法：点击卡片切换折叠
		const toggleCard = (key) => {
			expandedCards.value[key] = !expandedCards.value[key];
		};

		// --- Return all methods/props used by the template and helpers ---
		return {
			// state initialize
			i18nLang,
			loading,
			error,
			llamaDataset,
			qwenDataset,

			// dataset initialize
			selectedDatasets,
			availableDatasets,
			allDatasetsData,
			getUrlParams,
			loadDatasetDetail,
			getDatasetByName,

			// comparison control
			searchInput,
			searchQuery,
			applySearch,
			clearSearch,
			isDatasetSelected,
			filteredDatasets,
			clearComparison,
			triggerCheckboxClick,
			toggleMainCardCollapse,
			activeTab,
			selectedDomains,
			clearComparison,

			// dataset card
			getCardStyle,
			getCardHeaderStyle,
			getDatasetCardStyle,
			getDatasetChipStyle,
			getCardOrdinal,
			cardCollapsed,
			mainCardCollapsed,
			chartColorBase,
			getDisplayName,
			getDatasetTags,
			getTagIcon,
			getTagDisplayName,
			toggleCardCollapse,

			// Domain
			toggleDomain,

			// Radar
			createRadarChart,
			update,

			// performance overview
			llamaChart,
			qwenChart,
			formatScore,
			formatImprovement,
			getDomainDisplayName,
			getMultiDomainChartData,
			isDatasetSelected,
			getChartDataForDataset,
			initializeCharts,
			updatePerformance,

			// data score overview
			selectedHeuristicDatasets,
			judgeQChart,
			judgeQAChart,
			modelEvalChart,
			difficultyQChart,
			relevanceQAChart,
			deitaComplexityQChart,
			thinkingProbQChart,
			deitaQualityQALineChart,
			ifdQABarChart,
			rewardModelQABarChart,
			judgeMetricQCharts,
			judgeMetricQACharts,

			// card
			expandedCards,
			toggleCard,
		};
	},
});

// Register i18n plugin before mounting
app.use(createComparisonI18nPlugin());

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
