import {
	initGeneral,
	initI18nForIndex,
	createLeaderboardI18nPlugin,
	getLangRef,
} from "./general.js";

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	initI18nForIndex();
});

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const app = createApp({
	setup() {
		// --- Add missing reactive state refs ---
		const loading = ref(false);
		const error = ref(null);
		const rawData = ref({ llama: [], qwen: [], qwen3: [] });
		const mmData = ref([]); // Multi Model 数据
		const leaderboardType = ref("llm"); // 'llm' 或 'mm'
		const currentModel = ref("llama");
		const improvementType = ref("vs_base");

		// Filters & UI state
		const searchQuery = ref("");
		const selectedTags = ref([]);
		const tagFilterMode = ref("include"); // 'include' | 'exclusive'

		// Size range slider config (0..7)
		const sizeValues = ref([0, 1000, 10000, 50000, 100000, 500000, 1000000, Infinity]);
		const sizeRangeMin = ref(0);
		const sizeRangeMax = ref(7);
		const sizeSliderMax = ref(7);
		const minSlider = ref(null);
		const maxSlider = ref(null);

		// Dropdowns / selections
		const showDomainDropdown = ref(false);
		const showTypeDropdown = ref(false);
		const selectedType = ref(""); // '', 'general', 'math', 'code', 'reasoning'

		// Sorting state (main table)
		const sortColumn = ref("overall_avg");
		const sortDirection = ref("desc");

		// Sorting state (detailed table)
		const detailedSortColumn = ref(""); // 'average' | 'efficiency' | 'name' | 'domain' | 'year' | 'size' | '<task>_<metric>'
		const detailedSortDirection = ref("desc");

		// Highlighted columns
		const highlightedColumn = ref(null);
		const highlightedDetailedColumn = ref(null);

		const showTooltip = ref(false);
		const showEfficiencyTooltipMain = ref(false);
		const showEfficiencyTooltipDetail = ref(false);
		const efficiencyTooltipPositionMain = ref({ left: 0, top: 0 });
		const efficiencyTooltipPositionDetail = ref({ left: 0, top: 0 });

		onMounted(() => {
			loadData();
			// 使用多重延迟确保 DOM 完全渲染后再更新下划线位置
			nextTick(() => {
				setTimeout(() => {
					updateInkBarPosition();
					// 再次延迟确保样式已应用
					setTimeout(() => {
						updateInkBarPosition();
					}, 50);
				}, 100);
			});
			// 监听窗口大小变化
			window.addEventListener('resize', updateInkBarPosition);
		});

		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : "en";
		});

		const llmModels = ref([
			{ id: "llama", nameKey: "lb_llama_family", icon: "fas fa-robot" },
			{ id: "qwen", nameKey: "lb_qwen_family", icon: "fas fa-microchip" },
			{ id: "qwen3", nameKey: "lb_qwen3_family", icon: "fas fa-microchip" },
		]);

		const mmModels = ref([
			{ id: "qwen3vl", nameKey: "lb_qwen3vl_family", icon: "fas fa-images" },
		]);

		// 计算属性：根据 leaderboardType 返回对应的模型列表
		const models = computed(() => {
			return leaderboardType.value === 'mm' ? mmModels.value : llmModels.value;
		});

		// 选择比较基准的函数
		const selectBaseline = (dataset) => {
			// Multi Model 模式下：
			// domain="instruct" 对应 vs_instruct（选中 instruct baseline）
			// domain="thinking" 对应 vs_thinking（选中 thinking baseline）
			if (leaderboardType.value === 'mm') {
				if (dataset.domain === "instruct") {
					improvementType.value = "vs_instruct";
				} else if (dataset.domain === "thinking") {
					improvementType.value = "vs_thinking";
				}
			} else {
				// LLM 模式：使用 domain 字段判断
				if (dataset.domain === "base") {
					improvementType.value = "vs_base";
				} else if (dataset.domain === "instruct") {
					improvementType.value = "vs_instruct";
				}
			}
		};

		// 加载数据
		const loadData = async () => {
			try {
				loading.value = true;
				// 加载 Large Language Model 数据
				const llmResponse = await fetch("./data/llm/llm.json");
				if (!llmResponse.ok) {
					throw new Error("Failed to load LLM data");
				}
				const llmData = await llmResponse.json();
				rawData.value = llmData;
				
				// 加载 Multi Model 数据
				try {
					const mmResponse = await fetch("./data/mm/mm.json");
					if (mmResponse.ok) {
						const mmDataLoaded = await mmResponse.json();
						// mm.json 的结构是 { "qwen3vl": [...] }
						if (mmDataLoaded && typeof mmDataLoaded === 'object') {
							// 提取 qwen3vl 数组
							mmData.value = mmDataLoaded.qwen3vl || [];
						} else if (Array.isArray(mmDataLoaded)) {
							mmData.value = mmDataLoaded;
						} else {
							mmData.value = [];
						}
					} else {
						console.warn("Multi Model data not found, using empty array");
						mmData.value = [];
					}
				} catch (mmErr) {
					console.warn("Error loading Multi Model data:", mmErr);
					mmData.value = [];
				}
				
				error.value = null;
			} catch (err) {
				console.error("Error loading data:", err);
				error.value = "Error loading data";
				// 使用模拟数据作为备用
				rawData.value = {
					llama: generateMockData("LLaMA"),
					qwen: generateMockData("Qwen"),
					qwen3: generateMockData("Qwen3"),
				};
				mmData.value = [];
			} finally {
				loading.value = false;
				// 数据加载完成后更新下划线位置
				nextTick(() => {
					setTimeout(() => {
						updateInkBarPosition();
					}, 150);
				});
			}
		};

		// 解析size字符串为数值（用于区间筛选）
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
					return number * 1_000;
				case "m":
					return number * 1_000_000;
				case "b":
					return number * 1_000_000_000;
				case "":
					return number; // plain number
				default:
					return number;
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

		// 计算属性：当前数据
		const currentData = computed(() => {
			if (leaderboardType.value === 'mm') {
				// Multi-model 模式：使用 mmData，只有一个模型系列
				return mmData.value || [];
			}
			return rawData.value[currentModel.value] || [];
		});

		// 计算属性：排序后的数据
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

				// 如果是名字列，使用字符串比较
				if (sortColumn.value === "name") {
					scoreA = a.name || "";
					scoreB = b.name || "";
					return sortDirection.value === "asc"
						? scoreA.localeCompare(scoreB)
						: scoreB.localeCompare(scoreA);
				}

				// 如果是年份列，使用数值比较，年份相同时按平均分排序
				if (sortColumn.value === "year") {
					const yearA = parseInt(a.year) || 0;
					const yearB = parseInt(b.year) || 0;
					if (yearA === yearB) {
						// 年份相同时，按平均分降序排序
						const avgA = a.overall_avg || 0;
						const avgB = b.overall_avg || 0;
						return avgB - avgA;
					}
					return sortDirection.value === "asc" ? yearA - yearB : yearB - yearA;
				}

				// 如果是size列，使用解析后的数值比较
				if (sortColumn.value === "size") {
					const sizeA = parseSizeToNumber(a.size) || 0;
					const sizeB = parseSizeToNumber(b.size) || 0;
					if (sizeA === sizeB) {
						// size相同时，按平均分降序排序
						const avgA = a.overall_avg || 0;
						const avgB = b.overall_avg || 0;
						return avgB - avgA;
					}
					return sortDirection.value === "asc" ? sizeA - sizeB : sizeB - sizeA;
				}

				// 数值比较
				return sortDirection.value === "asc" ? scoreA - scoreB : scoreB - scoreA;
			});

			// 构建结果数组：instruct模型 -> base模型 -> 其他模型
			const result = [];
			if (instructModel) result.push(instructModel);
			if (baseModel) result.push(baseModel);
			result.push(...sortedOtherModels);

			return result;
		});

		// 计算属性：可用的标签列表
		const availableTags = computed(() => {
			if (leaderboardType.value === 'mm') {
				// Multi-model 模式：固定标签列表
				return ['general', 'reasoning', 'spatial', 'infographic'];
			}

			// LLM 模式：从数据中提取标签
			if (!currentData.value.length) return [];
			const allTags = new Set();

			currentData.value
				.filter((item) => !isBaseModel(item) && !isInstructModel(item)) // 排除 base 和 instruct 模型
				.forEach((item) => {
					// 只从tag字段解析标签
					const tagStr = item.tag || "";
					if (tagStr) {
						// 假设标签用逗号分隔
						const tags = tagStr
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t);
						tags.forEach((tag) => allTags.add(tag));
					}
				});

			return Array.from(allTags).sort();
		});

		// 计算属性：有序的标签列表
		const orderedTags = computed(() => {
			if (leaderboardType.value === 'mm') {
				// Multi-model 模式：固定顺序
				return ['general', 'reasoning', 'spatial', 'infographic'];
			}

			// LLM 模式：按照优先级排序
			const tags = availableTags.value;
			const orderedTagsPriority = ["general", "math", "code", "science", "reasoning"];

			// 先添加按照优先级排序的常见标签
			const result = [];
			orderedTagsPriority.forEach((tag) => {
				if (tags.includes(tag)) {
					result.push(tag);
				}
			});

			// 再添加其他标签
			tags.forEach((tag) => {
				if (!orderedTagsPriority.includes(tag)) {
					result.push(tag);
				}
			});

			return result;
		});

		// 计算属性：过滤后的数据（主表格）
		const filteredData = computed(() => {
			let dataToFilter = sortedData.value; // 使用已经将base和instruct置顶的数据
			let baseModel = null;
			let instructModel = null;

			// 提取instruct模型
			if (dataToFilter.length > 0 && isInstructModel(dataToFilter[0])) {
				instructModel = dataToFilter[0];
				dataToFilter = dataToFilter.slice(1);
			}

			// 提取base模型
			if (dataToFilter.length > 0 && isBaseModel(dataToFilter[0])) {
				baseModel = dataToFilter[0];
				dataToFilter = dataToFilter.slice(1);
			}

			let filtered = dataToFilter;

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

			// 构建结果数组：instruct模型 -> base模型 -> 过滤后的其他模型
			const result = [];
			if (instructModel) result.push(instructModel);
			if (baseModel) result.push(baseModel);
			result.push(...filtered);

			return result;
		});

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

		// 计算属性：详细表格的未排序过滤数据（用于排名计算）
		const detailedFilteredDataForRanking = computed(() => {
			if (!selectedType.value) return [];

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

		// 计算属性：详细表格的过滤数据
		const detailedFilteredData = computed(() => {
			if (!selectedType.value) return [];

			const baseModel = currentData.value.find((item) => isBaseModel(item));
			const instructModel = currentData.value.find((item) => isInstructModel(item));
			let otherModels = currentData.value.filter(
				(item) => !isBaseModel(item) && !isInstructModel(item)
			);

			// 使用选中的类型作为详细视图的展示
			const primaryType = selectedType.value;
			let filtered = [...otherModels];

			// 排序逻辑
			filtered.sort((a, b) => {
				if (detailedSortColumn.value) {
					// 如果是特定任务的排序
					if (detailedSortColumn.value.includes("_")) {
						// 更安全的分解方式：从任务头信息中查找匹配
						const taskHeaders = getTaskHeaders(primaryType);
						const header = taskHeaders.find(
							(h) => h.taskName + "_" + h.metricName === detailedSortColumn.value
						);
						if (header) {
							const scoreA =
								getTaskScore(
									a,
									primaryType,
									header.taskName,
									header.metricName,
									true
								) || 0;
							const scoreB =
								getTaskScore(
									b,
									primaryType,
									header.taskName,
									header.metricName,
									true
								) || 0;
							return detailedSortDirection.value === "asc"
								? scoreA - scoreB
								: scoreB - scoreA;
						}
					} else if (detailedSortColumn.value === "name") {
						// 按名字排序
						return detailedSortDirection.value === "asc"
							? a.name.localeCompare(b.name)
							: b.name.localeCompare(a.name);
					} else if (detailedSortColumn.value === "domain") {
						// 按领域排序（保留向后兼容，但使用第一个标签）
						const tagsA = getDatasetTags(a);
						const tagsB = getDatasetTags(b);
						const domainA = tagsA.length > 0 ? tagsA[0] : "";
						const domainB = tagsB.length > 0 ? tagsB[0] : "";
						return detailedSortDirection.value === "asc"
							? domainA.localeCompare(domainB)
							: domainB.localeCompare(domainA);
					} else if (detailedSortColumn.value === "year") {
						// 按年份排序，年份相同时按该类型的平均分排序
						const yearA = parseInt(a.year) || 0;
						const yearB = parseInt(b.year) || 0;
						if (yearA === yearB) {
							// 年份相同时，按该类型的平均分降序排序
							const avgA = getTypeAverageValue(a, primaryType);
							const avgB = getTypeAverageValue(b, primaryType);
							return avgB - avgA;
						}
						return detailedSortDirection.value === "asc"
							? yearA - yearB
							: yearB - yearA;
					} else if (detailedSortColumn.value === "size") {
						// 按size排序，size相同时按该类型的平均分排序
						const sizeA = parseSizeToNumber(a.size) || 0;
						const sizeB = parseSizeToNumber(b.size) || 0;
						if (sizeA === sizeB) {
							// size相同时，按该类型的平均分降序排序
							const avgA = getTypeAverageValue(a, primaryType);
							const avgB = getTypeAverageValue(b, primaryType);
							return avgB - avgA;
						}
						return detailedSortDirection.value === "asc"
							? sizeA - sizeB
							: sizeB - sizeA;
					} else if (detailedSortColumn.value === "average") {
						// 按平均分排序
						const scoreA = getTypeAverageValue(a, primaryType);
						const scoreB = getTypeAverageValue(b, primaryType);
						return detailedSortDirection.value === "asc"
							? scoreA - scoreB
							: scoreB - scoreA;
					} else if (detailedSortColumn.value === "efficiency") {
						// 按性价比排序
						const efficiencyA = getTypeEfficiency(a, primaryType);
						const efficiencyB = getTypeEfficiency(b, primaryType);
						return detailedSortDirection.value === "asc"
							? efficiencyA - efficiencyB
							: efficiencyB - efficiencyA;
					} else {
						// 其他情况按平均分排序
						const scoreA = getTypeAverageValue(a, primaryType);
						const scoreB = getTypeAverageValue(b, primaryType);
						return detailedSortDirection.value === "asc"
							? scoreA - scoreB
							: scoreB - scoreA;
					}
				} else {
					// 默认按平均分降序排序
					const scoreA = getTypeAverageValue(a, primaryType);
					const scoreB = getTypeAverageValue(b, primaryType);
					return scoreB - scoreA;
				}
			});

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

			// 构建结果数组：instruct模型 -> base模型 -> 过滤后的其他模型
			const result = [];
			if (instructModel) result.push(instructModel);
			if (baseModel) result.push(baseModel);
			result.push(...filtered);

			return result;
		});

		// 计算属性：当前模型信息
		const currentModelInfo = computed(() => {
			return models.value.find((m) => m.id === currentModel.value) || models.value[0];
		});

		// 方法：切换模型
		const switchModel = (modelId) => {
			currentModel.value = modelId;
		};

		// 方法：重置筛选
		const resetFilters = () => {
			searchQuery.value = "";
			selectedTags.value = [];
			selectedType.value = "";
			showDomainDropdown.value = false;
			showTypeDropdown.value = false;
		};

		// 方法：移除所选标签
		const removeTag = (tag) => {
			selectedTags.value = selectedTags.value.filter((t) => t !== tag);
		};

		// 方法：移除所选领域 - 保留向后兼容
		const removeDomain = (domain) => {
			// 将domain转换为对应的tag并移除
			const domainToTagMap = {
				general: "general",
				math: "math",
				code: "code",
				reasoning: "science", // reasoning映射到science
			};
			const tag = domainToTagMap[domain];
			if (tag) {
				selectedTags.value = selectedTags.value.filter((t) => t !== tag);
			}
		};

		// 方法：选择类型（单选）
		const selectType = (type) => {
			selectedType.value = type;
			showTypeDropdown.value = false;
		};

		// 方法：清除类型选择
		const clearType = () => {
			selectedType.value = "";
			showTypeDropdown.value = false;
		};

		// 方法：更新数据量区间最小值
		const updateSizeRangeMin = (event) => {
			const value = parseInt(event.target.value);
			// 只有当新值不超过右端点时才更新
			if (value <= sizeRangeMax.value) {
				sizeRangeMin.value = value;
			} else {
				// 强制重置到有效值
				event.preventDefault();
				event.target.value = sizeRangeMin.value;
				// 确保DOM同步
				setTimeout(() => {
					if (minSlider.value) {
						minSlider.value.value = sizeRangeMin.value;
					}
				}, 0);
			}
		};

		// 方法：更新数据量区间最大值
		const updateSizeRangeMax = (event) => {
			const value = parseInt(event.target.value);
			// 只有当新值不小于左端点时才更新
			if (value >= sizeRangeMin.value) {
				sizeRangeMax.value = value;
			} else {
				// 强制重置到有效值
				event.preventDefault();
				event.target.value = sizeRangeMax.value;
				// 确保DOM同步
				setTimeout(() => {
					if (maxSlider.value) {
						maxSlider.value.value = sizeRangeMax.value;
					}
				}, 0);
			}
		};

		// 方法：处理滑动条鼠标按下事件
		const onSliderMouseDown = (event) => {
			// 记录当前值，以便在需要时恢复
			const currentMinValue = sizeRangeMin.value;
			const currentMaxValue = sizeRangeMax.value;

			// 添加全局鼠标释放监听器
			const onMouseUp = () => {
				// 最终验证和修正
				if (minSlider.value) {
					minSlider.value.value = sizeRangeMin.value;
				}
				if (maxSlider.value) {
					maxSlider.value.value = sizeRangeMax.value;
				}
				document.removeEventListener("mouseup", onMouseUp);
				document.removeEventListener("touchend", onMouseUp);
			};

			document.addEventListener("mouseup", onMouseUp);
			document.addEventListener("touchend", onMouseUp);
		};

		// 方法：根据索引获取数据量数值
		const getSizeValueFromIndex = (index) => {
			return sizeValues.value[index] || 0;
		};

		// 方法：格式化数据量标签
		const formatSizeLabel = (size) => {
			if (size === 0) return "0";
			if (size === Infinity || size >= 1000000) {
				if (size === Infinity) return "1M+";
				return (size / 1000000).toFixed(0) + "M";
			}
			if (size >= 1000) return (size / 1000).toFixed(0) + "K";
			return size.toString();
		};

		// 方法：获取滑动条范围样式
		const getRangeStyle = () => {
			const minPercent = (sizeRangeMin.value / 7) * 100;
			const maxPercent = (sizeRangeMax.value / 7) * 100;
			return {
				left: minPercent + "%",
				width: maxPercent - minPercent + "%",
			};
		};

		// 方法：检查数据集是否在选中的大小范围内
		const isInSizeRange = (dataset) => {
			const sizeNum = parseSizeToNumber(dataset.size);
			const minSize = getSizeValueFromIndex(sizeRangeMin.value);
			const maxSize = getSizeValueFromIndex(sizeRangeMax.value);

			// 如果是完整范围，不过滤
			if (sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value) {
				return true;
			}

			return sizeNum >= minSize && (maxSize === Infinity ? true : sizeNum <= maxSize);
		};

		// 方法：切换数据领域下拉框显示
		const toggleDomainDropdown = () => {
			showDomainDropdown.value = !showDomainDropdown.value;
			showTypeDropdown.value = false; // 关闭其他下拉框
		};

		// 方法：切换榜单领域下拉框显示
		const toggleTypeDropdown = () => {
			showTypeDropdown.value = !showTypeDropdown.value;
			showDomainDropdown.value = false; // 关闭其他下拉框
		};

		// 方法：获取数据集的标签列表
		const getDatasetTags = (dataset) => {
			const tags = [];

			// 只从tag字段解析标签
			const tagStr = dataset.tag || "";
			if (tagStr) {
				// 假设标签用逗号分隔
				const parsedTags = tagStr
					.split(",")
					.map((t) => t.trim())
					.filter((t) => t);
				tags.push(...parsedTags);
			}

			// Multi Model 模式下，按照指定顺序排序标签
			if (leaderboardType.value === 'mm') {
				const tagOrder = ['general', 'reasoning', 'spatial', 'infographic'];
				return tags.sort((a, b) => {
					const indexA = tagOrder.indexOf(a.toLowerCase());
					const indexB = tagOrder.indexOf(b.toLowerCase());
					// 如果标签在顺序列表中，按照顺序排序
					if (indexA !== -1 && indexB !== -1) {
						return indexA - indexB;
					}
					// 如果只有一个在列表中，在列表中的排在前面
					if (indexA !== -1) return -1;
					if (indexB !== -1) return 1;
					// 如果都不在列表中，保持原有顺序
					return 0;
				});
			}

			return tags;
		};

		// 方法：切换标签选择（多选）
		const toggleTag = (tag) => {
			const index = selectedTags.value.indexOf(tag);
			if (index > -1) {
				selectedTags.value.splice(index, 1);
			} else {
				selectedTags.value.push(tag);
			}
		};

		// 方法：切换数据领域选择（多选）- 保留向后兼容
		const toggleDomain = (domain) => {
			// 将domain转换为对应的tag并切换
			const domainToTagMap = {
				general: "general",
				math: "math",
				code: "code",
				reasoning: "science", // reasoning映射到science
			};
			const tag = domainToTagMap[domain];
			if (tag) {
				toggleTag(tag);
			}
		};

		// 方法：类型改变时的处理
		const onTypeChange = () => {
			// 当选择类型时，可以添加额外的逻辑
			console.log("Type changed to:", selectedType.value);
			// 如果选择了类型，滚动到详细表格
			if (selectedType.value) {
				setTimeout(() => {
					const detailedContainer = document.querySelector(
						".detailed-leaderboard-container"
					);
					if (detailedContainer) {
						detailedContainer.scrollIntoView({ behavior: "smooth" });
					}
				}, 100);
			}
		};

		// 方法：获取类型对应的图标
		const getTypeIcon = (type) => {
			const typeIcons = {
				general: "fas fa-book",
				math: "fas fa-calculator",
				code: "fas fa-code",
				reasoning: "fas fa-brain",
				spatial: "fas fa-globe",
				infographic: "fas fa-pie-chart",
			};

			return typeIcons[type.toLowerCase()] || "fas fa-list-ol";
		};

		// 方法：获取标签对应的图标
		const getTagIcon = (tag) => {
			const tagIcons = {
				general: "fas fa-book",
				math: "fas fa-calculator",
				code: "fas fa-code",
				science: "fas fa-flask",
				reasoning: "fas fa-brain",
				spatial: "fas fa-globe",
				infographic: "fas fa-pie-chart",
			};

			return tagIcons[tag.toLowerCase()] || "fas fa-tag";
		};

		// 方法：获取领域对应的图标 - 保留向后兼容
		const getDomainIcon = (domain) => {
			const domainIcons = {
				general: "fas fa-book",
				math: "fas fa-calculator",
				code: "fas fa-code",
				reasoning: "fas fa-brain",
			};

			return domainIcons[domain.toLowerCase()] || "fas fa-tag";
		};

		// 方法：获取标签显示名称（首字母大写）
		const getTagDisplayName = (tag) => {
			if (!tag) return "";
			return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
		};

		// 方法：获取领域显示名称（首字母大写）- 保留向后兼容
		const getDomainDisplayName = (domain) => {
			if (!domain) return "";
			return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();
		};

		// 方法：获取领域的描述
		// 方法：获取领域的详细描述（用于工具提示）
		const getDomainDescription = (domain) => {
			const domainDescriptions = {
				general: "通用领域能力，包括知识问答、常识、指令遵循等",
				math: "数学能力，包括计算、推导、解题等",
				code: "代码能力，包括代码生成、调试、理解等",
				reasoning: "推理能力，包括逻辑推理、思维链等",
			};

			return domainDescriptions[domain.toLowerCase()] || domain;
		};

		// 方法：格式化分数（四舍五入到一位小数）
		const formatScore = (score) => {
			if (typeof score === "number") {
				return roundToOneDecimal(score).toFixed(1);
			}
			return "0.0";
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
					} else if (Math.abs(score - (dataset.spatial_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].spatial_avg;
					} else if (Math.abs(score - (dataset.infographic_avg || 0)) < 0.1) {
						actualImprovementValue = dataset.improvement[improvementType].infographic_avg;
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

		// 方法：四舍五入到一位小数
		const roundToOneDecimal = (score) => {
			if (typeof score === "number") {
				return Math.round(score * 10) / 10;
			}
			return 0;
		};

		// 方法：检查是否是base模型
		const isBaseModel = (dataset) => {
			// Multi Model 模式下：domain="thinking" 作为 base baseline（类似 llm.json 中的 base）
			if (leaderboardType.value === 'mm') {
				return dataset.domain === "thinking";
			}
			// LLM 模式下：domain="base" 作为 base baseline
			return dataset.domain === "base";
		};

		// 方法：检查是否是instruct模型
		const isInstructModel = (dataset) => {
			// Multi Model 模式下：domain="instruct" 作为 instruct baseline（类似 llm.json 中的 instruct）
			if (leaderboardType.value === 'mm') {
				return dataset.domain === "instruct";
			}
			// LLM 模式下：domain="instruct" 作为 instruct baseline
			return dataset.domain === "instruct";
		};

		// 方法：获取分数等级类名
		const getScoreClass = (score) => {
			if (score >= 70) return "score-high";
			if (score >= 50) return "score-medium";
			return "score-low";
		};

		// 方法：获取排名类名
		const getRankClass = (index) => {
			if (index === 0) return "rank-1";
			if (index === 1) return "rank-2";
			if (index === 2) return "rank-3";
			return "";
		};

		// 方法：获取领域徽章类名
		const getDomainClass = (domain) => {
			return `domain-${domain}`;
		};

		// 方法：获取类型显示名称
		const getTypeDisplayName = (type) => {
			const typeNames = {
				general: "General",
				math: "Math",
				code: "Code",
				reasoning: "Reasoning",
			};
			return typeNames[type] || type;
		};

		// 方法：获取任务列表的表头
		const getTaskHeaders = (type) => {
			// 从实际数据中获取任务列表
			if (currentData.value.length > 0) {
				// Find the first model with task_details to use as a template (excluding base and instruct for consistency)
				const modelForHeaders = currentData.value.find(
					(item) => !isBaseModel(item) && !isInstructModel(item) && item.task_details
				);

				if (modelForHeaders) {
					const domainKey = type + "_tasks";
					const tasks = modelForHeaders.task_details[domainKey] || [];
					const headers = [];

					tasks.forEach((task) => {
						if (task.metrics && task.metrics.length > 1) {
							// 如果有多个指标，为每个指标创建一个列
							task.metrics.forEach((metric) => {
								headers.push({
									taskName: task.task_name,
									metricName: metric.metric,
									displayName: task.task_name,
									metricDisplayName: metric.metric,
								});
							});
						} else {
							// 如果只有一个指标，也显示指标名称
							headers.push({
								taskName: task.task_name,
								metricName: task.metrics[0]?.metric || "accuracy",
								displayName: task.task_name,
								metricDisplayName: task.metrics[0]?.metric || "accuracy",
							});
						}
					});

					return headers;
				}
			}

			// 如果没有数据或没有合适的模型来提取表头，返回空数组
			return [];
		};

		// 方法：获取特定领域的任务列表
		const getTasksForDomain = (type) => {
			if (currentData.value.length > 0) {
				const firstModel = currentData.value[0];
				if (firstModel.task_details) {
					const domainKey = type + "_tasks";
					const tasks = firstModel.task_details[domainKey] || [];
					return tasks.map((task) => task.task_name);
				}
			}
			return [];
		};

		// 方法：获取特定任务的分数
		const getTaskScore = (
			dataset,
			type,
			taskNameFromHeader,
			metricNameFromHeader,
			raw = false,
			improvementType = "vs_base"
		) => {
			if (!dataset || !type || !taskNameFromHeader) {
				return raw ? 0 : { score: "0.0", diffText: null, diffClass: "" };
			}

			if (isBaseModel(dataset) || isInstructModel(dataset)) {
				const taskScoresKey = type + "_task_scores";
				if (dataset[taskScoresKey] && Array.isArray(dataset[taskScoresKey])) {
					const headers = getTaskHeaders(type); // These headers are derived from a non-base model
					let scoreIndex = -1;

					// Find the index of the current task/metric in the dynamically generated headers
					for (let i = 0; i < headers.length; i++) {
						if (
							headers[i].taskName === taskNameFromHeader &&
							headers[i].metricName === metricNameFromHeader
						) {
							scoreIndex = i;
							break;
						}
					}

					if (scoreIndex !== -1 && scoreIndex < dataset[taskScoresKey].length) {
						const scoreValue = dataset[taskScoresKey][scoreIndex];
						if (raw) return scoreValue;
						return {
							score: formatScore(scoreValue), // Use existing formatScore
							diffText: null, // Base and instruct models do not have improvement scores for sub-tasks
							diffClass: "",
						};
					}
				}
				// Fallback if scores are not found or mapping fails
				return raw ? 0 : { score: "-", diffText: null, diffClass: "" };
			}

			// 1. 从 task_details 获取基础分数
			let scoreValue = 0;
			if (dataset.task_details) {
				const domainTasksKey = type + "_tasks";
				const tasksInDomain = dataset.task_details[domainTasksKey] || [];
				const currentTaskObject = tasksInDomain.find(
					(t) => t.task_name === taskNameFromHeader
				);
				if (currentTaskObject && currentTaskObject.metrics) {
					const metricData = currentTaskObject.metrics.find(
						(m) => m.metric === metricNameFromHeader
					);
					if (metricData) {
						scoreValue = metricData.score;
					}
				}
			}
			if (raw) return scoreValue;

			// 2. 使用 improvement[type + '_task_scores'] 数组确定 improvementValue
			let improvementValue = null;
			const improvementArrayKey = type + "_task_scores";
			// 生成当前数据集的指标序列，用于查找正确的索引
			const currentDatasetMetricSequence = [];
			if (dataset.task_details) {
				const domainKey = type + "_tasks";
				const tasksInCurrentDataset = dataset.task_details[domainKey] || [];
				tasksInCurrentDataset.forEach((task) => {
					if (task.metrics && task.metrics.length > 1) {
						task.metrics.forEach((metricObj) => {
							currentDatasetMetricSequence.push({
								taskName: task.task_name,
								metricName: metricObj.metric,
							});
						});
					} else {
						currentDatasetMetricSequence.push({
							taskName: task.task_name,
							metricName: (task.metrics && task.metrics[0]?.metric) || "accuracy",
						});
					}
				});
			}
			const indexInCurrentDatasetScores = currentDatasetMetricSequence.findIndex(
				(item) =>
					item.taskName === taskNameFromHeader && item.metricName === metricNameFromHeader
			);

			if (dataset.improvement) {
				let improvementArray = null;
				if (
					dataset.improvement[improvementType] &&
					dataset.improvement[improvementType][improvementArrayKey]
				) {
					// improvement.vs_base 或 improvement.vs_instruct
					improvementArray = dataset.improvement[improvementType][improvementArrayKey];
				} else if (dataset.improvement[improvementArrayKey]) {
					improvementArray = dataset.improvement[improvementArrayKey];
				}

				if (
					improvementArray &&
					indexInCurrentDatasetScores !== -1 &&
					improvementArray.length > indexInCurrentDatasetScores
				) {
					improvementValue = improvementArray[indexInCurrentDatasetScores];
				}
			}

			// 3. 格式化并返回
			const formattedScore = formatScore(scoreValue);
			let diffText = null;
			let diffClass = "";
			if (typeof improvementValue === "number") {
				const diff = roundToOneDecimal(improvementValue);
				if (diff === 0) {
					diffText = "0.0";
					diffClass = "score-diff-positive";
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

		// 方法：获取类型平均分
		const getTypeAverage = (dataset, type, improvementType = "vs_base") => {
			const avgKey = type + "_avg";
			const scoreValue = dataset[avgKey] || 0;

			let improvementValue = null;
			if (dataset.improvement) {
				if (dataset.improvement[improvementType]) {
					improvementValue = dataset.improvement[improvementType][avgKey];
				} else if (dataset.improvement[avgKey]) {
					improvementValue = dataset.improvement[avgKey];
				}
			}

			const formattedScore = formatScore(scoreValue);
			let diffText = null;
			let diffClass = "";

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

		// 方法：获取类型性价比分数
		const getTypeEfficiency = (dataset, type) => {
			const efficiencyKey = type + "_efficiency";
			return dataset[efficiencyKey] || 0;
		};

		// 方法：获取类型平均分数值（用于排序）
		const getTypeAverageValue = (dataset, type) => {
			const avgKey = type + "_avg";
			return dataset[avgKey] || 0;
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

		// 方法：获取排名
		const getRank = (
			dataset,
			data,
			scoreKey,
			isDetailed = false,
			selectedType = null,
			improvementType = "vs_base"
		) => {
			if (isBaseModel(dataset) || isInstructModel(dataset)) return "-"; // base 和 instruct 不参与排名
			const ranks = calculateRanks(
				data.filter((item) => !isBaseModel(item) && !isInstructModel(item)),
				scoreKey,
				isDetailed,
				selectedType,
				improvementType
			);
			return ranks[dataset.id] || 1;
		};

		// 新增：支持 year 和 size 排序
		const sortBy = (column) => {
			if (sortColumn.value === column) {
				sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
			} else {
				sortColumn.value = column;
				sortDirection.value = "desc";
			}
			if (column !== "domain") {
				highlightColumn(column, false);
			}
		};
		const sortDetailedBy = (column) => {
			if (detailedSortColumn.value === column) {
				detailedSortDirection.value =
					detailedSortDirection.value === "asc" ? "desc" : "asc";
			} else {
				detailedSortColumn.value = column;
				detailedSortDirection.value = "desc";
			}
			if (column !== "domain") {
				highlightColumn(column, true);
			}
		};

		// 方法：获取排序图标
		const getSortIcon = (column, isDetailed = false) => {
			const currentSortColumn = isDetailed ? detailedSortColumn.value : sortColumn.value;
			const currentSortDirection = isDetailed
				? detailedSortDirection.value
				: sortDirection.value;

			if (currentSortColumn === column) {
				return currentSortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
			}
			return "fas fa-sort";
		};

		// 方法：高亮列
		const highlightColumn = (columnKey, isDetailed = false) => {
			if (columnKey === "domain") return; // 如果是domain列，则不进行高亮

			if (isDetailed) {
				highlightedDetailedColumn.value = columnKey;
			} else {
				highlightedColumn.value = columnKey;
			}
		};

		// 方法：格式化数据性价比分数
		const formatEfficiencyScore = (efficiency) => {
			if (typeof efficiency !== "number" || efficiency === 0) {
				return "-";
			}

			// 智能格式化：根据数值大小调整小数位数
			const absValue = Math.abs(efficiency);
			let precision;

			if (absValue >= 0.001) {
				precision = 3; // 大于等于0.001，显示3位小数
			} else if (absValue >= 0.0001) {
				precision = 4; // 大于等于0.0001，显示4位小数
			} else if (absValue >= 0.00001) {
				precision = 5; // 大于等于0.00001，显示5位小数
			} else {
				precision = 6; // 小于0.00001，显示6位小数
			}

			// 显示涨跌值，添加正负号
			return (efficiency > 0 ? "+" : "") + efficiency.toFixed(precision);
		};

		// 方法：格式化数据性价比涨跌
		const formatEfficiencyDiff = (efficiencyDiff) => {
			if (typeof efficiencyDiff !== "number") {
				return "";
			}
			if (efficiencyDiff === 0) {
				return "0.000000";
			}
			return (efficiencyDiff > 0 ? "+" : "") + efficiencyDiff.toFixed(6);
		};

		// 方法：获取数据性价比涨跌的CSS类
		const getEfficiencyDiffClass = (efficiencyDiff) => {
			if (typeof efficiencyDiff !== "number") {
				return "";
			}
			if (efficiencyDiff === 0) {
				return "score-diff-positive"; // 0值显示为绿色
			}
			return efficiencyDiff > 0 ? "score-diff-positive" : "score-diff-negative";
		};

		// 方法：设置Efficiency提示框
		function setEfficiencyTooltipPositionMain(event) {
			const rect = event.currentTarget.getBoundingClientRect();
			efficiencyTooltipPositionMain.value = {
				left: rect.left + rect.width / 2 - 150,
				top: rect.bottom + 8, // 8px下移
			};
		}

		// 方法：Efficiency详细提示
		function setEfficiencyTooltipPositionDetail(event) {
			const rect = event.currentTarget.getBoundingClientRect();
			efficiencyTooltipPositionDetail.value = {
				left: rect.left + rect.width / 2 - 150,
				top: rect.bottom + 8, // 8px下移
			};
		}

		// 下划线指示器位置状态
		const inkBarStyle = ref({
			left: '0px',
			width: '0px',
			transform: 'translateX(-50%)',
		});

		// 方法：更新下划线指示器位置
		const updateInkBarPosition = (retryCount = 0) => {
			const maxRetries = 5;
			nextTick(() => {
				const tabs = document.querySelectorAll('.ant-tabs-tab');
				const activeTab = leaderboardType.value === 'llm' ? 'llm' : 'mm';
				let activeTabElement = null;
				
				tabs.forEach((tab) => {
					const nodeKey = tab.getAttribute('data-node-key');
					if (nodeKey === activeTab) {
						activeTabElement = tab;
					}
				});
				
				if (activeTabElement) {
					const rect = activeTabElement.getBoundingClientRect();
					const navList = document.querySelector('.ant-tabs-nav-list');
					if (navList && rect.width > 0) {
						const navRect = navList.getBoundingClientRect();
						const left = rect.left - navRect.left + rect.width / 2;
						const width = rect.width;
						inkBarStyle.value = {
							left: left + 'px',
							width: width + 'px',
							transform: 'translateX(-50%)',
						};
						return; // 成功更新，退出
					}
				}
				
				// 如果更新失败且还有重试次数，则重试
				if (retryCount < maxRetries) {
					setTimeout(() => {
						updateInkBarPosition(retryCount + 1);
					}, 50 * (retryCount + 1)); // 递增延迟
				}
			});
		};

		// 方法：获取下划线指示器样式
		const getInkBarStyle = () => {
			return inkBarStyle.value;
		};

		// 监听 leaderboardType 变化，更新下划线位置并重置 currentModel
		watch(leaderboardType, (newType) => {
			// 重置 currentModel
			if (newType === 'mm') {
				currentModel.value = 'qwen3vl';
				// Multi Model 模式下：默认选择 id 0 的数据集作为对比的 baseline (vs_instruct)
				improvementType.value = 'vs_instruct';
			} else {
				currentModel.value = 'llama';
				// LLM 模式下：默认使用 vs_base
				improvementType.value = 'vs_base';
			}
			// 如果切换 leaderboard 类型时，当前选中的类型在新类型中不存在，则重置为 All
			if (selectedType.value) {
				const llmTypes = ['general', 'math', 'code', 'reasoning'];
				const mmTypes = ['general', 'reasoning', 'spatial', 'infographic'];
				const validTypes = newType === 'mm' ? mmTypes : llmTypes;
				if (!validTypes.includes(selectedType.value)) {
					selectedType.value = '';
				}
			}
			// 更新下划线位置
			updateInkBarPosition();
		});


		// --- Return all methods/props used by the template and helpers ---
		return {
			// state
			i18nLang,
			loading,
			error,
			rawData,
			mmData,
			leaderboardType,
			currentModel,
			improvementType,
			searchQuery,
			selectedTags,
			tagFilterMode,
			sizeValues,
			sizeRangeMin,
			sizeRangeMax,
			sizeSliderMax,
			minSlider,
			maxSlider,
			showDomainDropdown,
			showTypeDropdown,
			selectedType,
			sortColumn,
			sortDirection,
			detailedSortColumn,
			detailedSortDirection,
			highlightedColumn,
			highlightedDetailedColumn,

			// data sources & computed
			models,
			currentData,
			sortedData,
			availableTags,
			orderedTags,
			filteredData,
			filteredDataForRanking,
			detailedFilteredData,
			detailedFilteredDataForRanking,
			currentModelInfo,

			// actions / UI handlers
			switchModel,
			resetFilters,
			removeTag,
			removeDomain,
			selectType,
			clearType,
			onTypeChange,
			toggleTag,
			toggleDomain,
			toggleDomainDropdown,
			toggleTypeDropdown,
			updateSizeRangeMin,
			updateSizeRangeMax,
			onSliderMouseDown,

			// formatters & helpers
			parseSizeToNumber,
			getSizeValueFromIndex,
			formatSizeLabel,
			getRangeStyle,
			getTypeIcon,
			getTagIcon,
			getDomainIcon,
			getTagDisplayName,
			getTypeDisplayName,
			getDomainDisplayName,
			getDomainDescription,
			formatScore,
			formatScoreWithImprovement,
			roundToOneDecimal,
			isBaseModel,
			isInstructModel,
			getScoreClass,
			getRankClass,
			getDomainClass,
			getDatasetTags,
			getTaskHeaders,
			getTasksForDomain,
			getTaskScore,
			getTypeAverage,
			getTypeEfficiency,
			getTypeAverageValue,
			calculateRanks,
			getRank,
			sortBy,
			sortDetailedBy,
			getSortIcon,
			highlightColumn,
			formatEfficiencyScore,
			formatEfficiencyDiff,
			getEfficiencyDiffClass,

			// misc
			selectBaseline,

			// efficiency tool tip
			showTooltip,
			showEfficiencyTooltipMain,
			showEfficiencyTooltipDetail,
			efficiencyTooltipPositionMain,
			efficiencyTooltipPositionDetail,
			setEfficiencyTooltipPositionDetail,
			setEfficiencyTooltipPositionMain,
			
			// ink bar style
			getInkBarStyle,
		};
	},
});

// Register i18n plugin before mounting
app.use(createLeaderboardI18nPlugin());

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
