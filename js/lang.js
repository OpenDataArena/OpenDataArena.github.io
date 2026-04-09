export const lang_all = {
	en: {
		all_slogan: "Benchmark Data Value—Right at Your Fingertips",
		all_leaderboard: "Leaderboard",
		all_data_comparison: "Data Comparison",
		all_data_genealogy: "Data Lineage",
		all_configuration: "Configuration",
		all_contribution: "Contribution",
		all_tools: "Tools",
		all_subscribe: "Subscribe",
		all_subscribe_h4: "Subscribe to Our Updates",
		all_subscribe_hint: "Enter your email",
		all_subscribe_thanks: "Thank you for subscribing!",
		all_subscribe_error: "Subscription failed, please try again.",
		all_related_links: "Related Links",
		all_opendatalab_research: "OpenDataLab Research",
		all_opendatalab: "OpenDataLab",
		all_repository: "Repository",
		all_contact_us: "Contact Us",
		all_copyright: "© 2025 OpenDataArena. All rights reserved.",
		all_feedback: "Feedback",
		all_back_to_home: "Back to Home",
		all_back_to_leaderboard: "Back to Leaderboard",
		all_loading: "Loading...",
		all_error: "Error",
		all_overall: "Overall",
		all_general: "General",
		all_math: "Math",
		all_code: "Code",
		all_science: "Science",
		all_reasoning: "Reasoning",
		all_spatial: "Spatial",
		all_infographic: "Infographic",
		all_technical_report: "Technical Report",
	},
	zh: {
		all_slogan: "让数据价值触手可及",
		all_leaderboard: "排行榜",
		all_data_comparison: "数据集对比",
		all_data_genealogy: "数据血缘",
		all_configuration: "配置",
		all_contribution: "贡献",
		all_tools: "工具",
		all_subscribe: "订阅",
		all_subscribe_h4: "订阅更新",
		all_subscribe_hint: "输入邮箱地址",
		all_subscribe_thanks: "感谢订阅!",
		all_subscribe_error: "订阅失败，请重新尝试",
		all_related_links: "相关链接",
		all_opendatalab_research: "OpenDataLab 实验室",
		all_opendatalab: "OpenDataLab 主页",
		all_repository: "代码仓库",
		all_contact_us: "联系我们",
		all_copyright: "© 2025 OpenDataArena 保留所有权利",
		all_feedback: "反馈",
		all_back_to_home: "返回首页",
		all_back_to_leaderboard: "返回排行榜",
		all_loading: "加载中...",
		all_error: "错误",
		all_overall: "总览",
		all_general: "通用",
		all_math: "数学",
		all_code: "代码",
		all_reasoning: "推理",
		all_science: "科学",
		all_spatial: "空间",
		all_infographic: "图表",
		all_technical_report: "技术报告",
	},
};

export const lang_data_lineage = {
	en: {
		genealogy_appTitle: "Data Lineage Analysis",
		genealogy_appSubtitle: "Explore the relationships and dependencies between datasets. ",
		genealogy_tipText: "Enter dataset names to visualize their lineage relationships",
		genealogy_targetDatasetLabel: "Target Dataset",
		genealogy_targetPlaceholder: "Enter dataset name...",
		genealogy_maxDepthLabel: "Max Depth",
		genealogy_generateButton: "Generate Lineage Graph",
		genealogy_targetControlTitle: "Target Datasets",
		genealogy_targetControlTip1: "• Click on a dataset name to remove it",
		genealogy_targetControlTip2: "• Multiple datasets can be analyzed together",
		genealogy_targetControlTip3: "• Use the + button to add more datasets",
		genealogy_loadingText: "Loading data...",
		genealogy_zoomInTitle: "Zoom In",
		genealogy_zoomOutTitle: "Zoom Out",
		genealogy_resetZoomTitle: "Reset Zoom",
		genealogy_duplicateTitle: "Duplicate Dataset",
		genealogy_duplicateText: "This dataset is already in the target list.",
		genealogy_duplicateConfirm: "OK",
		genealogy_duplicateAutoRemove: "It will be automatically removed.",
		genealogy_datasetInfo: "Dataset Information",
		genealogy_legendTitle: "Legend",
		genealogy_intermediateDataset: "Intermediate Dataset",
		genealogy_baseDataSource: "Base Data Source",
		genealogy_targetDatasetsLabel: "Target Datasets",
		genealogy_currentDisplay: "Currently displaying",
		genealogy_nodes: " nodes",
		genealogy_totalNodes: "Total Nodes",
		genealogy_uniqueNodes: "Unique Nodes",
		genealogy_relations: "Relations",
		genealogy_targets: "Targets",
		genealogy_maxDepth: "Max Depth",
		genealogy_downloadsTooltip: "Downloads: ",
		genealogy_depthLabel: "Depth: ",
		genealogy_targetNodeType: "Target",
		genealogy_sourceDataAnalysis: "Source Data Analysis",
		genealogy_targetDataDetails: "Target Data Details",
		genealogy_directSources: "Direct Sources",
		genealogy_clickToVisitHF: "Click to visit on HuggingFace",
		genealogy_dataCharacteristics: "Data Characteristics",
		genealogy_analyzing: "Analyzing...",
		genealogy_commonSources: "Common Sources",
		genealogy_depthLimit: "(depth ≤ {depth})",
		genealogy_needTwoTargets: "Need at least 2 targets to show common sources",
		genealogy_noCommonSources: "No common sources found",
		genealogy_commonSourceCount: "Found {count} common source(s)",
		genealogy_categoryStats: "Category Statistics",
		genealogy_noCategoryInfo: "No category information available",
		genealogy_dataTypeStats: "Data Type Distribution",
		genealogy_categoryStatsLabel: "Category Distribution",
		genealogy_cacheLoaded: "Data loaded from cache",
		genealogy_dataLoaded: "Data loaded successfully (took {time}ms)",
		genealogy_loadFailed: "Failed to load data: ",
		genealogy_enterTarget: "Please enter at least one target dataset",
		genealogy_targetNotFound: "Target dataset not found: {targets}",
		genealogy_noTreeBuilt: "Failed to build lineage tree",
		genealogy_llmDisabled: "LLM analysis is disabled",
		genealogy_noSourceData: "No source data available",
		genealogy_noValidSourceData: "No valid source data found",
		genealogy_apiUnavailable: "API is currently unavailable",
		genealogy_summaryFailed: "Failed to generate summary",
		genealogy_errorTitle: "Error",
		genealogy_infoTitle: "Information",
		genealogy_datasetNotFound: "Dataset not found",
		genealogy_notOnHFTitle: "This dataset is not available on HuggingFace",
		genealogy_yearLabel: "Year",
		genealogy_dataTypeLabel: "Data Type",
		genealogy_summaryLabel: "Summary",
		genealogy_categoriesLabel: "Categories",
		genealogy_unclassified: "Unclassified",
		genealogy_sourceDataLabel: "Source Data ({count})",
		genealogy_notOnHF: "Not on HF",
		genealogy_relationshipLabel: "Relationship: ",
		genealogy_confidenceLabel: "Confidence: ",
		genealogy_nodeTypeLabel: "Node Type",
		genealogy_targetNodeType: "Target",
		genealogy_leafNodeType: "Leaf",
		genealogy_intermediateNodeType: "Intermediate",
		genealogy_hfLabel: "On HuggingFace",
		genealogy_hfAvailable: "Yes",
		genealogy_hfUnavailable: "No",
		genealogy_downloadsLabel: "Downloads",
		genealogy_unknown: "Unknown",
		genealogy_noSummary: "No summary available",
	},
	zh: {
		genealogy_appTitle: "数据血缘分析",
		genealogy_appSubtitle: "探索数据集之间的关系和依赖，",
		genealogy_tipText: "输入数据集名称以可视化其血缘关系",
		genealogy_targetDatasetLabel: "目标数据集",
		genealogy_targetPlaceholder: "输入数据集名称...",
		genealogy_maxDepthLabel: "最大深度",
		genealogy_generateButton: "生成血缘图",
		genealogy_targetControlTitle: "目标数据集",
		genealogy_targetControlTip1: "• 点击数据集名称可移除它",
		genealogy_targetControlTip2: "• 可以同时分析多个数据集",
		genealogy_targetControlTip3: "• 使用 + 按钮添加更多数据集",
		genealogy_loadingText: "加载数据中...",
		genealogy_zoomInTitle: "放大",
		genealogy_zoomOutTitle: "缩小",
		genealogy_resetZoomTitle: "重置缩放",
		genealogy_duplicateTitle: "重复数据集",
		genealogy_duplicateText: "此数据集已在目标列表中。",
		genealogy_duplicateConfirm: "确定",
		genealogy_duplicateAutoRemove: "将自动移除。",
		genealogy_datasetInfo: "数据集信息",
		genealogy_legendTitle: "图例",
		genealogy_intermediateDataset: "中间数据集",
		genealogy_baseDataSource: "基础数据源",
		genealogy_targetDatasetsLabel: "目标数据集",
		genealogy_currentDisplay: "当前显示",
		genealogy_nodes: " 个节点",
		genealogy_totalNodes: "总节点数",
		genealogy_uniqueNodes: "唯一节点数",
		genealogy_relations: "关系数",
		genealogy_targets: "目标数",
		genealogy_maxDepth: "最大深度",
		genealogy_downloadsTooltip: "下载量：",
		genealogy_depthLabel: "深度：",
		genealogy_targetNodeType: "目标",
		genealogy_sourceDataAnalysis: "数据源分析",
		genealogy_targetDataDetails: "目标数据详情",
		genealogy_directSources: "直接来源",
		genealogy_clickToVisitHF: "点击访问 HuggingFace",
		genealogy_dataCharacteristics: "数据特征",
		genealogy_analyzing: "分析中...",
		genealogy_commonSources: "共同来源",
		genealogy_depthLimit: "（深度 ≤ {depth}）",
		genealogy_needTwoTargets: "需要至少 2 个目标才能显示共同来源",
		genealogy_noCommonSources: "未找到共同来源",
		genealogy_commonSourceCount: "找到 {count} 个共同来源",
		genealogy_categoryStats: "类别统计",
		genealogy_noCategoryInfo: "无类别信息",
		genealogy_dataTypeStats: "数据类型分布",
		genealogy_categoryStatsLabel: "类别分布",
		genealogy_cacheLoaded: "从缓存加载数据",
		genealogy_dataLoaded: "数据加载成功（耗时 {time}ms）",
		genealogy_loadFailed: "数据加载失败：",
		genealogy_enterTarget: "请输入至少一个目标数据集",
		genealogy_targetNotFound: "未找到目标数据集：{targets}",
		genealogy_noTreeBuilt: "构建血缘树失败",
		genealogy_llmDisabled: "LLM 分析已禁用",
		genealogy_noSourceData: "无可用数据源",
		genealogy_noValidSourceData: "未找到有效数据源",
		genealogy_apiUnavailable: "API 当前不可用",
		genealogy_summaryFailed: "生成摘要失败",
		genealogy_errorTitle: "错误",
		genealogy_infoTitle: "信息",
		genealogy_datasetNotFound: "未找到数据集",
		genealogy_notOnHFTitle: "此数据集在 HuggingFace 上不可用",
		genealogy_yearLabel: "年份",
		genealogy_dataTypeLabel: "数据类型",
		genealogy_summaryLabel: "摘要",
		genealogy_categoriesLabel: "类别",
		genealogy_unclassified: "未分类",
		genealogy_sourceDataLabel: "数据源（{count}）",
		genealogy_notOnHF: "不在 HF",
		genealogy_relationshipLabel: "关系：",
		genealogy_confidenceLabel: "置信度：",
		genealogy_nodeTypeLabel: "节点类型",
		genealogy_targetNodeType: "目标",
		genealogy_leafNodeType: "叶子",
		genealogy_intermediateNodeType: "中间",
		genealogy_hfLabel: "在 HuggingFace 上",
		genealogy_hfAvailable: "是",
		genealogy_hfUnavailable: "否",
		genealogy_downloadsLabel: "下载量",
		genealogy_unknown: "未知",
		genealogy_noSummary: "无可用摘要",
	},
};

export const lang_index = {
	en: {
		index_subtitle: "Fair, Open, and Transparent Arena for Data — Benchmarking Dataset Value",

		index_hero_section_left_1:
			"Make every dataset measurable, comparable, and verifiable for LLM post-training.",
		index_hero_section_left_2:
			"Leading benchmarks across general, math, code, science, and more domains.",
		index_hero_section_left_3:
			"Unified evaluation pipeline, open-source scoring tools, visualized leaderboards.",
		index_hero_section_left_4:
			"Community collaboration and methodological innovation for a better data-centric paradigm.",
		index_hero_section_right_1: "Quickly assess dataset quality",
		index_hero_section_right_2: "Select the right data for your task",
		index_hero_section_right_3: "Evaluate the quality of your own created or synthetic data",
		index_hero_section_right_4: "Use ready-to-go tools for scoring your data",
		index_hero_section_right_5: "Build better experimental subsets with confidence",
		index_hero_section_right_6: "Join a community shaping the future of data value",

		// Summary leaderboard block
		index_table_rank: "rank",
		index_table_dataset: "dataset",
		index_table_year: "year",
		index_table_size: "size",
		index_table_avg_score: "avg",
		index_lb_cta: "Click to view detail Leaderboard",
		index_overall: "Overall",

		// Summary comparison block
		index_llama_model: "Llama Model",
		index_qwen_model: "Qwen Model",
		index_cmp_cta: "Click to start Dataset Comparison",
		index_dl_cta: "Explore Data Lineage",
		index_data_genealogy: "Data Lineage",
		index_genealogy_cta: "Explore the lineage of a dataset deeply",

		index_tool: 'Tool',
		index_data_scorer: 'Data Scorer',

		// News
		index_news_1:
			'Full training and evaluation toolkit open-sourced',
		index_news_2:
			'Data scoring framework open-sourced',
		index_news_3:
			'Multi-dimensional data scoring results released',
		index_news_4:
			'Tap to subscribe and get the latest news delivered',

		// Future
		index_coming_1:
			'<b class="highlight">Monthly update dataset rankings and dataset recommendation (ing)</b>',
		index_coming_2:
			'<b class="highlight">Expand to medical, scientific, and other domain-specific datasets (ing)</b>',
		index_coming_3: '<b class="highlight">Support multimodal datasets evaluation (ing)</b>',
		index_coming_4:
			'<b class="highlight">Introduce more data scoring factors and evaluation methods (ing)</b>',

		index_contributor_prefix:
			"Thanks to these outstanding researchers and developers for their contributions to OpenDataArena. We invite everyone to collaborate in building and enhancing OpenDataArena.",
		index_contributors_title: "Our Contributors",
		index_contributors_subtitle:
			"Thanks to these outstanding researchers and developers for their contributions to OpenDataArena",
		index_become_contributor: "Become a Contributor",
		index_contributor_num_1: "Domains",
		index_contributor_num_2: "Benchmarks",
		index_contributor_num_3: "Score Dimensions",
		index_contributor_num_4: "Trainings",
		index_contributor_num_5: "Evaluations",
		index_contributor_num_6: "Datasets",
		index_contributor_num_7: "Data Points",
	},
	zh: {
		index_subtitle: "公平、公正、公开的数据竞技场 —— 数据价值评估平台",
		index_hero_section_left_1: "致力于让每一份数据的价值可衡量、可比较、可验证",
		index_hero_section_left_2: "主流 benchmark内容覆盖数学、代码、科学、通用任务等方向",
		index_hero_section_left_3: "构建统一流程、可视化榜单、开源打分工具",
		index_hero_section_left_4: "社区共建与方法协同推动更可信的数据驱动范式",
		index_hero_section_right_1: "为你快速判断数据集质量优劣",
		index_hero_section_right_2: "让你精准挑选适合某任务的数据",
		index_hero_section_right_3: "验证你创建/合成的数据好坏",
		index_hero_section_right_4: "给你开箱即用的数据打分工具",
		index_hero_section_right_5: "帮你更科学地构建实验用数据子集",
		index_hero_section_right_6: "加入社区共建数据价值共识",

		// Summary leaderboard block
		index_table_rank: "排名",
		index_table_dataset: "数据集",
		index_table_year: "年份",
		index_table_size: "大小",
		index_table_avg_score: "平均分",
		index_lb_cta: "查看完整排行榜",
		index_overall: "总览",

		// Summary comparison block
		index_llama_model: "Llama 模型",
		index_qwen_model: "Qwen 模型",
		index_cmp_cta: "开始数据集对比",
		index_dl_cta: "探索数据血缘",
		index_data_genealogy: "数据血缘",
		index_genealogy_cta: "深度探索数据血缘",

		index_tool: '工具链',
		index_data_scorer: '数据评分工具',
		// News
		index_news_1: '训练与评测工具链全面开源',
		index_news_2: '数据评分工具框架开源',
		index_news_3: '数据评分结果集正式发布',
		index_news_4: '点击订阅获取最新消息',

		// Future
		index_coming_1: '<b class="highlight">月度数据集榜单更新与推荐数据集（ing）</b>',
		index_coming_2: '<b class="highlight">覆盖医学、科学等更多领域数据评估（ing）</b>',
		index_coming_3: '<b class="highlight">支持多模态数据评估（ing）</b>',
		index_coming_4: '<b class="highlight">引入更多数据评分因子与结果（ing）</b>',

		index_contributors_title: "贡献者",
		index_contributors_subtitle: "感谢以下研究者与开发者对 OpenDataArena 的贡献",
		index_become_contributor: "成为贡献者",
		index_contributor_prefix:
			"谨此向为 OpenDataArena 作出贡献的优秀研究者与开发者们致谢。诚邀各界同仁携手共建，让 OpenDataArena 更臻完善.",
		index_contributor_num_1: "数据领域",
		index_contributor_num_2: "基准测试数量",
		index_contributor_num_3: "数据评价维度",
		index_contributor_num_4: "数据训练次数",
		index_contributor_num_5: "数据验证次数",
		index_contributor_num_6: "评估数据集合",
		index_contributor_num_7: "评估数据数量",
	},
};

export const lang_leaderboard = {
	en: {
		lb_workbench_badge: "Leaderboard Workbench",
		lb_hero_subtitle_llm:
			"Track how text datasets change model capability across the Llama, Qwen and Qwen3 families.",
		lb_hero_subtitle_mm:
			"Track how multimodal datasets move reasoning, spatial and infographic capability in Qwen3-VL.",
		lb_hero_note:
			"Use the workbench below to switch family, narrow dataset scale, filter by tag, and jump between the overall ranking and a benchmark-specific table.",
		lb_stat_pool: "Dataset Pool",
		lb_stat_visible: "Visible Rows",
		lb_stat_baseline: "Comparison Baseline",
		lb_stat_scope: "Current Scope",
		lb_baseline_base: "Base Model",
		lb_baseline_instruct: "Instruct Model",
		lb_baseline_thinking: "Thinking Baseline",
		lb_scope_overall: "Overall",
		lb_filter_panel_title: "Filters & Controls",
		lb_filter_panel_note:
			"Switch model family, tune the candidate set, and surface the exact slice you want to inspect.",
		lb_no_tag_filters: "No tag filter applied",
		lb_model_family: "Model Family",
		lb_llama_family: "Llama-3.1 Family",
		lb_qwen_family: "Qwen2.5 Family",
		lb_qwen3_family: "Qwen3 Family",
		lb_qwen3vl_family: "Qwen3-VL Family",
		lb_include: "include",
		lb_only: "only",
		lb_dataset_tags: "Dataset Tags",
		lb_dataset_size_range: "Dataset Size Range",
		lb_benchmark_domain: "Benchmark Domain",
		lb_search_datasets: "Search datasets...",
		lb_all: "All",
		lb_rank: "Rank",
		lb_dataset: "Dataset",
		lb_year: "Year",
		lb_size: "Size",
		lb_avg_score: "Avg Score",
		lb_efficiency: "Efficiency",
		lb_efficiency_tip:
			"Efficiency measures the improvement per unit of data size (in thousands).\nIt calculates how much the average score of the current dataset exceeds the base average score, then divides that difference by the dataset size (in 'k' or thousands). \nHigher values indicate greater efficiency in achieving score gains relative to data volume.",
		// Tooltip for baseline indicator
		lb_tooltip_baseline_base: "Currently using Base Model as comparison baseline",
		lb_tooltip_baseline_instruct: "Currently using Instruct Model as comparison baseline",
		lb_large_language_model: "Large Language Model",
		lb_multi_model: "Multi Model",
	},
	zh: {
		lb_workbench_badge: "排行榜工作台",
		lb_hero_subtitle_llm:
			"查看文本数据集在 Llama、Qwen 与 Qwen3 系列中的能力变化与相对价值。",
		lb_hero_subtitle_mm:
			"查看多模态数据集在 Qwen3-VL 上对推理、空间与信息图能力的影响。",
		lb_hero_note:
			"使用下方工作区切换模型系列、缩小数据规模、按标签过滤，并在总榜与细分基准榜之间快速切换。",
		lb_stat_pool: "数据集池",
		lb_stat_visible: "当前可见",
		lb_stat_baseline: "对比基线",
		lb_stat_scope: "当前视图",
		lb_baseline_base: "Base 模型",
		lb_baseline_instruct: "Instruct 模型",
		lb_baseline_thinking: "Thinking 基线",
		lb_scope_overall: "总览",
		lb_filter_panel_title: "筛选与控制",
		lb_filter_panel_note:
			"切换模型系列、收窄候选集合，并快速定位你真正想看的那一段榜单。",
		lb_no_tag_filters: "当前未启用标签过滤",
		lb_model_family: "模型系列",
		lb_llama_family: "Llama-3.1 系列",
		lb_qwen_family: "Qwen2.5 系列",
		lb_qwen3_family: "Qwen3 系列",
		lb_qwen3vl_family: "Qwen3-VL 系列",
		lb_include: "包含",
		lb_only: "仅有",
		lb_dataset_tags: "数据集标签",
		lb_dataset_size_range: "数据集大小范围",
		lb_benchmark_domain: "基准领域",
		lb_search_datasets: "搜索数据集...",
		lb_all: "总览",
		lb_rank: "排名",
		lb_dataset: "数据集",
		lb_year: "年份",
		lb_size: "大小",
		lb_avg_score: "平均分",
		lb_efficiency: "效率",
		lb_efficiency_tip:
			"效率度量的是每单位数据规模（以千为单位）所带来的提升幅度。\n其计算方法是：先计算当前数据集的平均分比基准平均分高出多少，再将这个差值除以数据集的规模（单位为 \"k\"，即千）。\n数值越高，表示在相同数据量下获得分数提升的效率越高。",
		// Tooltip for baseline indicator
		lb_tooltip_baseline_base: "当前使用 Base 模型作为对比基准",
		lb_tooltip_baseline_instruct: "当前使用 Instruct 模型作为对比基准",
		lb_large_language_model: "大语言模型",
		lb_multi_model: "多模态模型",
	},
};

export const lang_comparison = {
	en: {
		comparison_title: "Data Comparison",
		comparison_subtitle_1:
			"Compare datasets by model performance and multi-dimensional data scores — for both instruction and instruction–response data.",
		comparison_subtitle_2: "Please select datasets to compare.",
		comparison_workbench_badge: "Comparison Workbench",
		comparison_focus_dataset: "Current Anchor Dataset",
		comparison_focus_note:
			"This page starts from the dataset you opened from the leaderboard, then expands into side-by-side comparisons.",
		comparison_picker_note:
			"Search by dataset name or tag, then build a side-by-side workbench.",
		comparison_selection_snapshot: "Selection Snapshot",
		comparison_selection_empty: "Search and add datasets to start comparison.",
		comparison_candidate_pool: "Candidate Pool",
		comparison_model_scope: "Model Scope",
		comparison_ready_hint:
			"Adjust the selection on the left, then update the charts and score panels below.",
		comparison_search: "Search",
		comparison_clear_all: "Clear All",
		comparison_select_datasets: "Select datasets...",
		comparison_select_datasets_to_compare: "Select datasets to compare:",
		comparison_update_comparison: "Update Comparison",
		comparison_num_selected: "selected",
		comparison_scored_link: "Scored Link",
		comparison_paper: "Paper",
		comparison_release_year: "Release Year",
		comparison_dataset_size: "Dataset Size",
		comparison_tags: "Tags",
		comparison_overall_average: "Overall Average",
		comparison_performance_overview: "Performance Overview",
		comparison_overall: "Overall",
		comparison_llama_model: "Llama Model",
		comparison_qwen_model: "Qwen Model",
		comparison_data_score_overview: "Data Score Overview",
		comparison_dataset: "Dataset",
		comparison_heuristic: "Heuristic (Answer Length)",
		comparison_min: "Min",
		comparison_max: "Max",
		comparison_average: "Average",
	},
	zh: {
		comparison_title: "数据集对比",
		comparison_subtitle_1:
			"支持根据模型表现与多维数据评分对数据集进行对比，面向指令和指令–回复数据。",
		comparison_subtitle_2: "请选择需要对比的数据集。",
		comparison_workbench_badge: "对比工作台",
		comparison_focus_dataset: "当前锚点数据集",
		comparison_focus_note:
			"当前页面会以你从排行榜进入的数据集为锚点，再扩展到多数据集并排对比。",
		comparison_picker_note: "按名称或标签搜索，构建并排对比工作台。",
		comparison_selection_snapshot: "当前选择",
		comparison_selection_empty: "搜索并添加数据集后即可开始对比。",
		comparison_candidate_pool: "候选集合",
		comparison_model_scope: "模型范围",
		comparison_ready_hint:
			"在左侧调整选择后，点击更新即可同步下方图表与评分面板。",
		comparison_search: "搜索",
		comparison_clear_all: "清除",
		comparison_select_datasets: "选择数据集...",
		comparison_select_datasets_to_compare: "选择数据集进行对比：",
		comparison_update_comparison: "更新",
		comparison_num_selected: "已选择",
		comparison_scored_link: "打分链接",
		comparison_paper: "论文",
		comparison_release_year: "发布时间",
		comparison_dataset_size: "数据集大小",
		comparison_tags: "标签",
		comparison_overall_average: "总体平均分",
		comparison_performance_overview: "性能概览",
		comparison_overall: "总览",
		comparison_llama_model: "Llama 模型",
		comparison_qwen_model: "Qwen 模型",
		comparison_data_score_overview: "评分概览",
		comparison_dataset: "数据集",
		comparison_heuristic: "启发性 (回答文本的长度)",
		comparison_min: "最小长度",
		comparison_max: "最大长度",
		comparison_average: "平均长度",
	},
};

export const lang_configurations = {
	en: {
		config_guide_title: "Configuration Guide",
		config_guide_prefix: "This page details the training and testing configurations, dataset selection rules, and evaluation scoring methods used in OpenDataArena. All settings are standardized to ensure fair and reproducible evaluation results.",
		config_train_settings: "Training Settings",
		config_train_framework:
			'<strong>Framework:</strong> <a href="https://github.com/hiyouga/LLaMA-Factory/tree/v0.9.2" target="_blank" class="repo-link"><u>LLaMA_Factory version 0.9.2</u></a>',
		config_train_base_model: "<strong>Base Model:</strong> Llama-3.1-8B, Qwen2.5-7B, Qwen3-8B-Base",
		config_train_param_title: "Parameter Details",
		config_train_param_1:
			"To ensure fair training and minimize the impact of training configurations on evaluation results, we carefully reference a wide range of existing literature to standardize the hyperparameter settings across different models. This approach helps eliminate performance bias caused by inconsistent training setups.",
		config_train_param_2:
			"The final training configurations for the LLaMA and Qwen model families are summarized below.",
		config_test_settings: "Testing Settings",
		config_test_framework:
			'<strong>Framework:</strong> <a href="https://github.com/open-compass/opencompass/tree/0.4.2" target="_blank" class="repo-link"><u>OpenCompass version 0.4.2</u></a>',
		config_test_param_title: "Parameter Details",
		config_test_1:
			"To achieve reliable and fair comparisons of model performance, we design a standardized and reproducible evaluation pipeline based on extensive preliminary experiments and analysis. Key aspects include:",
		config_test_1_1:
			'Evaluation strictly follows official protocols or widely adopted tools in the community, such as <a href="https://github.com/ZubinGou/math-evaluation-harness" target="_blank" class="repo-link"><code><u>math-eval-harness</u></code></a> and <a href="https://github.com/EleutherAI/lm-evaluation-harness" target="_blank" class="repo-link"><code><u>lm-evaluation-harness</u></code></a>, to ensure consistency and comparability with existing benchmarks.',
		config_test_1_2:
			"To mitigate potential performance bias caused by inaccurate answer extraction, we employ high-performance models to assist in post-processing:",
		config_test_1_2_1:
			"For <strong>code-related benchmarks</strong>, we adopt the default evaluation logic provided by the original tools.",
		config_test_1_2_2:
			'For <strong>non-code benchmarks</strong>, we use powerful large models (e.g.,<a href="https://github.com/IAAR-Shanghai/xVerify" target="_blank" class="repo-link"><code><u>xVerify</u></code></a>, <a href="https://huggingface.co/KbsdJames/Omni-Judge" target="_blank" class="repo-link"><code><u>Omni-Judge</u></code></a>) to extract and evaluate answers, ensuring higher accuracy and robustness in the results.',
		config_test_2:
			"The detailed evaluation configurations used in our testing tools are listed below.",
		config_test_3:
			'The complete evaluation setup and parameter configurations can be found at: <a href="https://github.com/OpenDataArena/OpenDataArena-Tool" target="_blank" class="url">https://github.com/OpenDataArena/OpenDataArena-Tool</a>',
		config_dataset_selection_rules: "Dataset Selection Rules",
		config_dataset_prefix:
			"To ensure fairness and effectiveness in evaluation, we have established strict dataset selection criteria. All datasets used for training and evaluation are sourced from the Hugging Face platform and must meet the following screening conditions:",
		config_dataset_subtitle_selection_criteria: "Selection Criteria",
		config_dataset_criteria: "Criteria",
		config_dataset_requirements: "Requirements",
		config_dataset_criteria_impact_metrics: "Impact Metrics",
		config_dataset_criteria_impact_metrics_re:
			"<code>likes</code> or <code>downloads</code> count greater than <strong>10</strong> on Hugging Face platform, ensuring community recognition",
		config_dataset_criteria_priority_ranking: "Priority Ranking",
		config_dataset_criteria_priority_ranking_re:
			"In domains with abundant training data (e.g., general dialogue, mathematical reasoning, code generation), prioritize datasets with higher <code>likes</code> counts",
		config_dataset_criteria_recency_requirement: "Recency Requirement",
		config_dataset_criteria_recency_requirement_re:
			"Dataset last updated after <strong>January 2023</strong>, ensuring data timeliness and relevance",
		config_dataset_criteria_size_limitation: "Size Limitation",
		config_dataset_criteria_size_limitation_re:
			"Dataset size limited to <strong>under 1M</strong>, balancing training effectiveness with computational resource consumption",
		config_dataset_criteria_suitability_assessment: "Suitability Assessment",
		config_dataset_criteria_suitability_assessment_re:
			"Dataset purpose or content must be suitable for <strong>SFT (Supervised Fine-Tuning)</strong> training, containing high-quality instruction-response pairs",
		config_dataset_quality_assurance: "Quality Assurance",
		config_dataset_quality_assurance_prefix:
			"To ensure training data quality, we conduct the following additional validations:",
		config_dataset_quality_assurance_1:
			"<strong>Content Review:</strong> Check datasets for harmful, biased, or inappropriate content",
		config_dataset_quality_assurance_2:
			"<strong>Format Standardization:</strong> Ensure all datasets conform to unified input-output format requirements",
		config_dataset_quality_assurance_3:
			"<strong>Diversity Balance:</strong> Maintain diversity and balance across different domains",
		config_dataset_quality_assurance_4:
			"<strong>Regular Updates:</strong> Periodically update selections based on community feedback and newly released high-quality datasets",
		config_scorer_title:
			"Scorer Function Settings",
		config_scorer_prefix:
			"To facilitate multi-dimensional evaluation of data quality and performance, we provide a variety of scorers. These scorers are classified into three categories based on their technical implementation:",
		config_scorer_1:
			'<strong>LLM-as-a-Judge Scorers:</strong> Utilize a Large Language Model (LLM) to act as a "judge," providing a comprehensive evaluation of the data.',
		config_scorer_2:
			"<strong>Model-based Scorers:</strong> Leverage pre-trained models (e.g., classification or regression models) to precisely calculate specific metrics.",
		config_scorer_3:
			"<strong>Heuristic Scorers:</strong> Employ pre-defined rules and algorithms (such as keyword matching, text length, etc.) for rapid scoring.",
		config_scorer_ending:
			'For detailed implementation principles and usage instructions for each scorer, please consult the <a href="https://opendataarena-tool.readthedocs.io/en/latest/" target="_blank" class="repo-link">wiki documentation</a>.',
	},
	zh: {
		config_guide_title: "配置指南",
		config_guide_prefix: "本页面详细介绍了 OpenDataArena 所使用的训练配置、测试配置、数据集选择规则以及评估评分方法。所有配置均经过标准化设置，以确保评估结果的公平性与可复现性。",
		config_train_settings: "训练设置",
		config_train_framework:
			'<strong>训练框架：</strong><a href="https://github.com/hiyouga/LLaMA-Factory/tree/v0.9.2" target="_blank" class="repo-link"><u>LLaMA_Factory version 0.9.2</u></a>',
		config_train_base_model: "<strong>基础模型：</strong> Llama-3.1-8B, Qwen2.5-7B, Qwen3-8B-Base",
		config_train_param_title: "参数详情",
		config_train_param_1:
			"为了确保模型训练的公平性，并最大程度减少训练配置对后续评估结果的干扰，我们广泛参考了现有主流文献中的设置，统一了各类模型的训练参数，以避免因超参差异导致的性能偏差。",
		config_train_param_2: "最终用于训练 LLaMA 和 Qwen 系列模型的关键参数设置如下所示。",
		config_test_settings: "测试设置",
		config_test_framework:
			'<strong>评测框架：</strong><a href="https://github.com/opencompass-ai/opencompass/tree/v0.4.2" target="_blank" class="repo-link"><u>OpenCompass version 0.4.2</u></a>',
		config_test_param_title: "参数详情",
		config_test_1:
			"为了实现对比结果的公平性与可靠性，我们在评测流程设计中进行了充分的预实验和分析，最终确定了一套标准化、可复现的评测方案。具体包括：",
		config_test_1_1:
			"测试流程严格遵循官方发布或社区广泛使用的评测工具，如 " +
			'<a href="https://github.com/openai/math-eval-harness" target="_blank" class="repo-link"><code><u>math-eval-harness</u></code></a> ' +
			"与 " +
			'<a href="https://github.com/EleutherAI/lm-evaluation-harness" target="_blank" class="repo-link"><code><u>lm-evaluation-harness</u></code></a>，' +
			"以确保结果在同行中的一致性与可比性。",
		config_test_1_2:
			"为了避免因答案提取误差影响模型表现的评估，在部分任务中我们引入了高性能模型协助进行答案解析：",
		config_test_1_2_1:
			"对于 <strong>代码类测试集</strong>，直接采用原始测试工具提供的默认评估逻辑。",
		config_test_1_2_2:
			'对于 <strong>非代码类测试集</strong>，使用高精度的大模型（如 <a href="https://github.com/IAAR-Shanghai/xVerify" target="_blank" class="repo-link"><code><u>xVerify</u></code></a>、<a href="https://github.com/KbsdJames/Omni-Judge" target="_blank" class="repo-link"><code><u>Omni-Judge</u></code></a>）对生成答案进行提取与评估，以增强测评的准确性与鲁棒性。',
		config_test_2: "以下为测试工具中详细的测试配置",
		config_test_3:
			'完整的测试设置和参数配置可参见：<a href="https://github.com/OpenDataArena/OpenDataArena-Tool" target="_blank" class="url">https://github.com/OpenDataArena/OpenDataArena-Tool</a>。',
		config_dataset_selection_rules: "数据集选择规则",
		config_dataset_prefix:
			"为确保评估的公平与有效性，我们制定了严格的数据集筛选标准。所有用于训练与评测的数据集均来自 Hugging Face 平台，且需满足以下筛选条件：",
		config_dataset_subtitle_selection_criteria: "筛选条件",
		config_dataset_criteria: "筛选项",
		config_dataset_requirements: "要求",
		config_dataset_criteria_impact_metrics: "影响指标",
		config_dataset_criteria_impact_metrics_re:
			"<code>likes</code> 或 <code>downloads</code> 数量大于 <strong>10</strong>，保证一定的社区认可度",
		config_dataset_criteria_priority_ranking: "优先级排序",
		config_dataset_criteria_priority_ranking_re:
			"在训练数据充足的领域（如通用对话、数学推理、代码生成），优先选择 <code>likes</code> 数更高的数据集",
		config_dataset_criteria_recency_requirement: "时效性要求",
		config_dataset_criteria_recency_requirement_re:
			"数据集最近更新时间在 <strong>2023 年 1 月之后</strong>，确保数据的时效性与相关性",
		config_dataset_criteria_size_limitation: "规模限制",
		config_dataset_criteria_size_limitation_re:
			"数据集规模限制在 <strong>100 万条以内</strong>，在训练效果与算力消耗之间取得平衡",
		config_dataset_criteria_suitability_assessment: "适配性评估",
		config_dataset_criteria_suitability_assessment_re:
			"数据集的用途或内容需适用于 <strong>SFT（监督微调）</strong> 训练，并包含高质量的指令—回复样本",
		config_dataset_quality_assurance: "质量保障",
		config_dataset_quality_assurance_prefix: "为确保训练数据质量，我们还会进行如下附加校验：",
		config_dataset_quality_assurance_1: "<strong>内容审核：</strong> 排查有害、偏见或不当内容",
		config_dataset_quality_assurance_2:
			"<strong>格式规范：</strong> 保证样本满足统一的输入/输出字段与格式要求",
		config_dataset_quality_assurance_3:
			"<strong>多样性平衡：</strong> 维持不同领域与题型的多样性与平衡",
		config_dataset_quality_assurance_4:
			"<strong>定期更新：</strong> 基于社区反馈与新发布的高质量数据集定期更新选择",
		config_scorer_title:
			"打分函数配置",
		config_scorer_prefix:
			"为实现多维度的数据质量与效果评估，我们提供了多种打分器（Scorer）。这些打分器在技术实现上可分为三类：",
		config_scorer_1:
			'<strong>LLM-as-a-Judge 打分器:</strong> 调用大语言模型（LLM）作为“裁判”，对数据进行综合性评价。',
		config_scorer_2:
			"<strong>Model-based 打分器:</strong> 利用预先训练好的模型（如分类模型、回归模型等）来精准计算特定指标。",
		config_scorer_3:
			"<strong>启发式（Heuristic）打分器:</strong> 通过预设的规则和算法（如关键词匹配、文本长度等）进行快速评分。",
		config_scorer_ending:
			'每种打分器的详细实现原理和使用说明，请查阅<a href="https://opendataarena-tool.readthedocs.io/en/latest/" target="_blank" class="repo-link">说明文档</a>。',
	},
};

export const lang_contribution = {
	en: {
		contrib_guide_title: "Contribution Guide",
		contrib_guide_prefix:
			"Welcome to the OpenDataArena community! This guide will help you understand how to contribute to OpenDataArena, whether by uploading datasets, submitting evaluation results, or providing improvement suggestions.",
		contrib_follow: "To upload your dataset, please follow these steps:",
		contrib_1_title: "Prepare Your Dataset",
		contrib_1_prefix:
			"Your dataset should be uploaded to Hugging Face, ideally with the following columns:",
		contrib_1_1:
			"<strong>instruction:</strong> A clear and concise instruction for each data point. If your original data contains an <code>input</code> key (common in formats like Alpaca), you must concatenate the <code>input</code> value with the <code>instruction</code> value, using a <code>\\n</code> as a separator.",
		contrib_1_2: "<strong>output:</strong> The expected output based on instruction.",
		contrib_1_3: "<strong>id</strong> (optional): The unique id for each sample.",
		contrib_1_4:
			"<strong>Q_scores</strong> (optional): Columns for various normalized scores about Q (instruction), including Clarity, Coherence, Completeness, Complexity, Correctness, Meaningfulness, Difficulty, Deita_Complexity, Thinking_Prob.",
		contrib_1_5:
			"<strong>QA_scores</strong> (optional): Columns for various normalized scores about QA (instruction + output), including Clarity, Coherence, Completeness, Complexity, Correctness, Meaningfulness, Relevance, IFD, Deita_Quality. Reward_Model, Fail_Rate, A_Length.",
		contrib_1_quote:
			'<strong>Q_scores</strong> and <strong>QA_scores</strong> can be efficiently calculated using our <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer" target="_blank">OpenDataArena-Tool DataScorer</a>. More details about each score can be found in <a href="https://opendataarena-tool.readthedocs.io/en/latest/" target="_blank">OpenDataArena-Tool Data Scorer Documentation</a>. An example can be found in <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer/data_process/example_upload.jsonl" target="_blank">example_upload.jsonl</a> for your reference.',
		contrib_2_title: "Upload Your Dataset",
		contrib_2_1:
			"You will upload your dataset directly to the Hugging Face Hub. For a detailed, step-by-step guide on the upload process, please refer to the official Hugging Face documentation:",
		contrib_2_2:
			'<a href="https://huggingface.co/docs/hub/datasets-adding" target="_blank">https://huggingface.co/docs/hub/datasets-adding</a>',
		contrib_2_3: "A simple guide for uploading a JSONL file is provided below.",
		contrib_2_4: "First, install the required packages and login to Hugging Face:",
		contrib_3_title: "Information",
		contrib_3_submit: "Submit Dataset Information",
		contrib_need_help: "Need Help?",
		contrib_help_prefix:
			"If you encounter any issues during the contribution process or need more detailed guidance, please feel free to contact us.",
		contrib_help_send_email: "Send Email",
		contrib_help_issue: "Github Issues",
		contrib_help_feedback: "Feedback Form",
		contrib_submit_huggingface_link: "HuggingFace Dataset Link:",
		contrib_submit_email: "Email:",
		contrib_submit_user_name: "User Name:",
		contrib_submit_user_name_hint: "Your preferred username",
		contrib_submitting: "Submitting...",
		contrib_submit_thanks: "Thank you for your submission!",
		contrib_submit_fail: "Submission failed, please try again.",
	},
	zh: {
		contrib_guide_title: "贡献指南",
		contrib_guide_prefix:
			"欢迎加入 OpenDataArena 社区！本指南将帮助你了解如何为 OpenDataArena 做出贡献，包括上传数据集、提交评测结果或提出改进建议。",
		contrib_follow: "请按以下步骤上传你的数据集：",
		contrib_1_title: "准备你的数据集",
		contrib_1_prefix: "建议将数据集上传到 Hugging Face，推荐包含以下列：",
		contrib_1_1:
			"<strong>instruction：</strong> 为每条数据提供清晰、简洁的指令。如果你的原始数据包含 <code>input</code> 键（如 Alpaca 等格式常见），需要将 <code>input</code> 的内容与 <code>instruction</code> 进行拼接，并使用 <code>\\n</code> 作为分隔符。",
		contrib_1_2: "<strong>output：</strong> 针对指令所期望的输出。",
		contrib_1_3: "<strong>id</strong>（可选）：每个样本的唯一 ID。",
		contrib_1_4:
			"<strong>Q_scores</strong>（可选）：关于 Q（指令）的各项归一化评分列，包含 Clarity、Coherence、Completeness、Complexity、Correctness、Meaningfulness、Difficulty、Deita_Complexity、Thinking_Prob 等。",
		contrib_1_5:
			"<strong>QA_scores</strong>（可选）：关于 QA（指令 + 输出）的各项归一化评分列，包含 Clarity、Coherence、Completeness、Complexity、Correctness、Meaningfulness、Relevance、IFD、Deita_Quality、Reward_Model、Fail_Rate、A_Length 等。",
		contrib_1_quote:
			'<strong>Q_scores</strong> 与 <strong>QA_scores</strong> 可通过我们的 <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer" target="_blank">OpenDataArena-Tool DataScorer</a> 高效计算。各指标的详细说明见 <a href="https://opendataarena-tool.readthedocs.io/en/latest/" target="_blank">OpenDataArena-Tool Data Scorer 文档</a>。同时可参考示例文件 <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer/data_process/example_upload.jsonl" target="_blank">example_upload.jsonl</a>。',
		contrib_2_title: "上传你的数据集",
		contrib_2_1:
			"你需要将数据集直接上传到 Hugging Face Hub。有关上传流程的详细分步指南，请参考 Hugging Face 官方文档：",
		contrib_2_2:
			'<a href="https://huggingface.co/docs/hub/datasets-adding" target="_blank">https://huggingface.co/docs/hub/datasets-adding</a>',
		contrib_2_3: "下方提供一个 JSONL 文件上传的简要示例。",
		contrib_2_4: "首先安装所需依赖并登录 Hugging Face：",
		contrib_3_title: "提交相关信息",
		contrib_3_submit: "提交数据集信息",
		contrib_need_help: "需要帮助？",
		contrib_help_prefix: "如果你在贡献过程中遇到问题，或需要更详细的指导，欢迎随时与我们联系。",
		contrib_help_send_email: "发送邮件",
		contrib_help_issue: "GitHub Issues",
		contrib_help_feedback: "反馈表单",
		contrib_submit_huggingface_link: "Huggingface 数据集链接：",
		contrib_submit_email: "邮箱地址：",
		contrib_submit_user_name: "用户昵称：",
		contrib_submit_user_name_hint: "填写你的昵称",
		contrib_submitting: "提交中",
		contrib_submit_thanks: "感谢你的贡献",
		contrib_submit_fail: "提交失败，请重新尝试",
	},
};

export const lang_tools = {
	en: {
		tools_title: "OpenDataArena-Tools",
		tools_title_prefix_1:
			"We have developed a complete set of high-quality tools to support data value verification, covering key stages such as training, evaluation, and multi-dimensional data scoring. All tools are fully open-source and aligned with widely adopted community standards, ensuring ease of reproduction and extensibility.",
		tools_title_prefix_2:
			'See <a href="https://github.com/OpenDataArena/OpenDataArena-Tool" target="_blank" class="repo-link"><u>OpenDataArena-Tool</u></a> for more details.',
		tools_1_title: "1. Training & Evaluation Tools",
		tools_1_prefix:
			"Our training and testing tools provide a consistent, controllable, and reproducible experimental platform, enabling fair comparisons across different datasets and model configurations.",
		tools_1_1_title:
			'🔧 Train Tool: <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/model_train" target="_blank" class="repo-link"><code><u> model_train</u></code></a>',
		tools_1_1_1:
			'Built upon the widely used <a href="https://github.com/hiyouga/LLaMA-Factory" target="_blank" class="repo-link"><strong><u>LLaMA Factory</u></strong></a> training framework.',
		tools_1_1_2:
			"Standardized training pipeline supporting major open-source models such as <u><strong>LLaMA</strong></u>, <u><strong>Qwen</strong></u>, and others.",
		tools_1_1_3:
			"Configurable components including data loading, fine-tuning strategies, logging, and more.",
		tools_1_1_4:
			"Training configurations are derived from extensive literature review to ensure fairness and comparability.",
		tools_1_2_title:
			'🔧 Test Tool: <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/model_eval" target="_blank" class="repo-link"><code><u>model_eval</u></code></a>',
		tools_1_2_1:
			'Built on the popular <a href="https://github.com/open-compass/opencompass" target="_blank" class="repo-link"><strong><u>OpenCompass</u></strong></a> evaluation framework.',
		tools_1_2_2:
			"Unified evaluation pipeline compatible with a variety of tasks (e.g., code generation, mathematical reasoning, open-domain QA).",
		tools_1_2_3:
			'Aligned with mainstream tools such as <a href="https://github.com/ZubinGou/math-evaluation-harness" target="_blank" class="repo-link"><code><u>math-eval-harness</u></code></a> and <a href="https://github.com/EleutherAI/lm-evaluation-harness" target="_blank" class="repo-link"><code><u>lm-evaluation-harness</u></code></a>.',
		tools_1_2_4:
			"Supports automated result extraction and formatting, enhancing evaluation efficiency and consistency.",
		tools_2_title: "Data Scoring Tool (Data Scorer)",
		tools_2_prefix:
			"We provide a multi-dimensional <strong>data scoring framework</strong> designed to assess the quality and value of data from various perspectives. It supports LLM-based evaluation, statistical analysis, and task-related performance metrics.",
		tools_2_1_title:
			'🔧 Test Tool: <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer" target="_blank" class="repo-link"><code><u>data_scorer</u></code></a>',
		tools_2_1_1:
			"A versatile and extensible framework for multi-type, multi-dimensional data scoring.",
		tools_2_1_1_1:
			"Supports <strong>LLM-based subjective scoring</strong>, including tools like <em>LLM-as-a-Judge</em>.",
		tools_2_1_1_2:
			"Supports model-based metrics such as <strong>diversity</strong>, <strong>correctness</strong>, and <strong>complexity</strong>.",
		tools_2_1_1_3: "Includes statistical data features such as <strong>data length</strong>.",
		tools_2_1_2:
			"Seamlessly integrates with the training and testing tools to evaluate data effectiveness based on real downstream performance.",
		tools_2_1_3:
			"Applicable for tasks like selecting high-quality data, building dataset subsets, and analyzing the impact of data on model performance.",
	},
	zh: {
		tools_title: "OpenDataArena-Tool简介",
		tools_title_prefix_1:
			"我们为数据价值验证构建了一整套高质量的工具链，覆盖<strong>训练</strong>、<strong>测试评估</strong>以及<strong>数据多维评分</strong>等关键流程。所有工具均已开源，并严格对齐社区主流标准，便于复现与扩展。",
		tools_title_prefix_2:
			'点击链接查看更多内容：<a href="https://github.com/OpenDataArena/OpenDataArena-Tool" target="_blank" class="repo-link"><u>OpenDataArena-Tool</u></a>',
		tools_1_title: "1. 训练与评测工具",
		tools_1_prefix:
			"我们的训练与测试工具旨在提供一致、可控、易复现的实验平台，以确保不同数据源或模型的公平比较。",
		tools_1_1_title:
			'🔧 训练工具： <a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/model_train" target="_blank" class="repo-link"><code><u> model_train</u></code></a>',
		tools_1_1_1:
			'采用主流的 <a href="https://github.com/huggingface/llama-factory" target="_blank" class="repo-link"><strong><u>LLaMA Factory</u></strong></a> 训练框架。',
		tools_1_1_2:
			"用于标准化模型训练流程，支持主流开源模型如 <u><strong>LLaMA</strong></u>、<u><strong>Qwen</strong></u> 等。",
		tools_1_1_3: "可配置的数据加载、微调策略、日志记录等。",
		tools_1_1_4: "训练参数设置参考多篇论文，确保训练过程具有良好公平对比性。",
		tools_1_2_title:
			'🔧 评测工具：<a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/model_eval" target="_blank" class="repo-link"><code><u>model_eval</u></code></a>',
		tools_1_2_1:
			'采用主流的 <a href="https://github.com/opencompass-ai/opencompass" target="_blank" class="repo-link"><strong><u>OpenCompass</u></strong></a> 评测框架',
		tools_1_2_2: "统一的模型评估工具，兼容多领域能力评测（通用问答、代码、数学、推理等）。",
		tools_1_2_3:
			'与主流评测框架对齐（如 <a href="https://github.com/openai/math-eval-harness" target="_blank" class="repo-link"><code><u>math-eval-harness</u></code></a> 和 <a href="https://github.com/EleutherAI/lm-evaluation-harness" target="_blank" class="repo-link"><code><u>lm-evaluation-harness</u></code></a>。）',
		tools_1_2_4: "支持自动化结果提取与格式化，提升测试效率与一致性。",
		tools_2_title: "2. 数据评分工具（Data Scorer）",
		tools_2_prefix:
			"我们提供一套多维度的<strong>数据评分框架</strong>，从多个角度评估数据的质量与价值，支持基于大模型的主观评估、统计分析以及与任务相关的性能指标。",
		tools_2_1_title:
			'🔧 评分工具：<a href="https://github.com/OpenDataArena/OpenDataArena-Tool/tree/main/data_scorer" target="_blank" class="repo-link"><code><u>data_scorer</u></code></a>',
		tools_2_1_1: "面向多类型、多维度数据评分的通用且可扩展框架。",
		tools_2_1_1_1:
			"支持<strong>基于大模型的主观评分</strong>，例如 <em>LLM-as-a-Judge</em> 等工具。",
		tools_2_1_1_2:
			"支持多种基于模型的度量，如<strong>多样性</strong>、<strong>正确性</strong>、<strong>复杂度</strong>等。",
		tools_2_1_1_3: "包含诸如<strong>数据长度</strong>等统计特征。",
		tools_2_1_2: "可与训练与测试工具无缝集成，基于实际下游性能评估数据有效性。",
		tools_2_1_3: "适用于高质量数据筛选、构建数据子集、分析数据对模型性能的影响等任务。",
	},
};
