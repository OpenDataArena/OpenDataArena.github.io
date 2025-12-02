import { initGeneral, initI18nForIndex, createDataLineageI18nPlugin, getLangRef, getCurrentLang, setCurrentLang } from "./general.js";
import * as LANG from "./lang.js";

// 初始化通用行为与弹窗
document.addEventListener("DOMContentLoaded", () => {
	initGeneral();
	// 标记语言按钮为由 Vue 管理，避免通用兜底再次绑定导致双触发
	const langBtn = document.getElementById("lang-toggle");
	if (langBtn) langBtn.setAttribute("data-i18n-vue", "1");
	initI18nForIndex();
});

const { createApp, computed, watch } = Vue;

const app = createApp({
	setup() {
		// Reactive language key for i18n: trigger re-render when language changes
		const i18nLang = computed(() => {
			const r = typeof getLangRef === "function" ? getLangRef() : null;
			return r && r.value ? r.value : getCurrentLang();
		});

		// Language toggle for header button (Vue controlled)
		const toggleLang = () => {
			const current = i18nLang.value || getCurrentLang();
			const next = current === "zh" ? "en" : "zh";
			setCurrentLang(next);
			const r = getLangRef && getLangRef();
			if (r) r.value = next; // trigger re-render
			// 触发 updateLanguage 函数（如果存在）
			if (window.updateLanguage) {
				setTimeout(() => {
					window.updateLanguage();
				}, 50);
			}
		};

		const langAriaLabel = computed(() => {
			return i18nLang.value === "zh" ? "Switch to English" : "切换为中文";
		});

		// 监听语言变化，触发 updateLanguage
		watch(i18nLang, () => {
			if (window.updateLanguage) {
				setTimeout(() => {
					window.updateLanguage();
				}, 100);
			}
		});

		return {
			i18nLang,
			toggleLang,
			langAriaLabel,
		};
	},
});

// Register i18n plugin before mounting
app.use(createDataLineageI18nPlugin());

// Harden: global Vue error handler
app.config.errorHandler = (err, instance, info) => {
	console.error("[VueError]", err, info);
};

// Mount and expose the component proxy directly (Vue 3 returns proxy from mount)
// 只在 data-lineage.html 页面挂载 Vue 应用，index.html 有自己的 Vue 应用
let vmInstance = null;
const appElement = document.getElementById("app");
if (appElement && document.getElementById("appPage")) {
	// 只在存在 appPage 元素时才挂载（data-lineage.html 的特征）
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
		if (appElement) appElement.classList.remove("app-hidden");
	} catch (e) {
		console.error("[MountError]", e);
		const preload = document.getElementById("preload");
		if (preload) preload.remove();
		// Reveal the app (remove .app-hidden class) even if mount fails
		if (appElement) appElement.classList.remove("app-hidden");
		window.vm = null;
	}
} else {
	// 在 index.html 中，不挂载 Vue 应用，但保留 index.js 设置的 window.vm（如果存在）
	// 不覆盖 window.vm，让 index.js 的 Vue 实例可以用于翻译
	// window.vm 应该由 index.js 设置
}

        // 获取翻译文本（使用 Vue 的 $t 函数）
        function t(key, params = {}) {
            // 尝试从 Vue 实例获取 $t 函数
            if (window.vm && window.vm.$t) {
                const result = window.vm.$t(key, params);
                if (result && result !== key) {
                    return result;
                }
            }
            
            // 如果 Vue 实例不存在或返回了 key，尝试直接从 lang.js 获取翻译
            try {
                const lang = getCurrentLang();
                const cur = lang.startsWith("zh") ? "zh" : "en";
                
                // 尝试从 data-lineage 的翻译中获取
                if (LANG && LANG.lang_data_lineage) {
                    const lineageLang = LANG.lang_data_lineage[cur] || LANG.lang_data_lineage.en;
                    if (lineageLang && lineageLang[key]) {
                        let result = lineageLang[key];
                        if (params && Object.keys(params).length > 0) {
                            Object.keys(params).forEach(paramKey => {
                                result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
                            });
                        }
                        return result;
                    }
                }
                
                // 尝试从通用翻译中获取
                if (LANG && LANG.lang_all) {
                    const allLang = LANG.lang_all[cur] || LANG.lang_all.en;
                    if (allLang && allLang[key]) {
                        let result = allLang[key];
                        if (params && Object.keys(params).length > 0) {
                            Object.keys(params).forEach(paramKey => {
                                result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
                            });
                        }
                        return result;
                    }
                }
            } catch (e) {
                console.warn('Translation fallback failed:', e, 'LANG:', LANG);
            }
            
            // 如果 Vue 实例还未准备好，返回 key 作为后备
            return key;
        }

        // 更新页面语言（当语言切换时调用）
        // 将函数暴露到全局，以便 Vue 可以调用
        window.updateLanguage = function updateLanguage() {
            // 更新数据血缘页面的图例
            const legend = document.getElementById('legend');
            if (legend && legend.style.display !== 'none' && currentRoots && currentRoots.length > 0) {
                // 尝试从图例中获取节点数量，如果获取不到则从DOM中计算
                const legendText = legend.textContent || '';
                const match = legendText.match(/(\d+)\s*(个节点|nodes)/);
                let nodeCount = match ? parseInt(match[1]) : document.querySelectorAll('#visualization .node').length;
                if (!nodeCount || nodeCount === 0) {
                    nodeCount = document.querySelectorAll('#visualization .node').length;
                }
                updateLegend(currentRoots, nodeCount, '#legend');
            }
            
            // 更新首页的图例
            const indexLegend = document.getElementById('indexLineageLegend');
            if (indexLegend && indexLegend.style.display !== 'none') {
                // 尝试从图例中获取节点数量
                const legendText = indexLegend.textContent || '';
                const match = legendText.match(/(\d+)\s*(个节点|nodes)/);
                let nodeCount = match ? parseInt(match[1]) : 0;
                
                // 如果找不到节点数量，尝试从全局变量获取
                if (!nodeCount && window.allOriginalRoots && window.allOriginalRoots.length > 0) {
                    const stats = calculateMultiStats(window.allOriginalRoots);
                    nodeCount = stats.uniqueNodes || stats.nodes || 0;
                }
                
                if (nodeCount > 0 && window.allOriginalRoots && window.allOriginalRoots.length > 0) {
                    updateLegend(window.allOriginalRoots, nodeCount, '#indexLineageLegend');
                }
            }

            // 如果信息面板已显示，更新它并重新加载LLM分析结果
            if (window.updateSourceInfoPanel) {
                setTimeout(() => {
                    if (window.sourceInfoPanelVisible && currentRoots && currentRoots.length > 0) {
                        updateSourceInfoPanel();
                        // 重新加载所有已显示的LLM分析结果
                        currentRoots.forEach(root => {
                            const summaryElementId = `summary-${root.targetName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                            const summaryElement = document.getElementById(summaryElementId);
                            if (summaryElement && summaryElement.innerHTML && !summaryElement.innerHTML.includes('loading-spinner')) {
                                // 如果已有分析结果，重新加载以获取新语言的结果
                                loadSourceSummary(root.targetName);
                            }
                        });
                    }
                }, 100);
            }

            // 如果数据集卡片已显示，更新它
            const cardContent = document.getElementById('cardContent');
            if (cardContent && cardContent.innerHTML) {
                const datasetName = window.lastShownDataset;
                if (datasetName) {
                    showDatasetCard(datasetName);
                }
            }
        }

        let graphData = null;
        let dataInfo = null;
        let allDatasetNames = [];  // 存储所有数据集名称，用于自动提示
        let currentRoots = [];
        let lastShownDataset = null; // 记录最后显示的数据集
        // 采用深蓝和谐配色体系
        let targetColors = [
            '#0066ff', // 深蓝
            '#00d4ff', // 青色
            '#4c5fff', // 靛蓝
            '#3385ff', // 亮蓝
            '#00b8d4', // 蓝绿
            '#66a3ff', // 浅蓝
            '#0099ff', // 天蓝
            '#003d99'  // 暗蓝
        ];

        // 节点类型配色 - 高饱和度对比色
        const nodeTypeColors = {
            target: {
                primary: '#ff3b30',       // 鲜红色
                glow: 'rgba(255, 59, 48, 0.5)',
                text: '#000000'           // 黑色文字
            },
            intermediate: {
                primary: '#34c759',       // 鲜绿色
                glow: 'rgba(52, 199, 89, 0.5)',
                text: '#000000'           // 黑色文字
            },
            leaf: {
                primary: '#ff9500',       // 鲜橙色
                glow: 'rgba(255, 149, 0, 0.4)',
                text: '#000000',          // 黑色文字
                stroke: 'rgba(255, 149, 0, 0.6)'
            }
        };
        let currentSvg = null;
        let currentG = null;
        let currentZoom = null;

        // 页面切换
        function enterApp() {
            const homePage = document.getElementById('homePage');
            const appPage = document.getElementById('appPage');
            homePage.classList.add('hidden');
            setTimeout(() => {
                homePage.style.display = 'none';
                appPage.classList.add('active');
            }, 400);

            // 延迟加载数据，提高首页渲染速度
            setTimeout(() => {
                loadGraphData();
            }, 300);
        }

        /**
         * 检查坐标点是否在中心区域内
         * @param {number} x - X坐标
         * @param {number} y - Y坐标
         * @param {Object} region - 区域信息 {x, y, width, height}
         * @returns {boolean} 是否在区域内
         */
        function isInCenterRegion(x, y, region) {
            if (!region) return false;
            return x >= region.x && x <= region.x + region.width &&
                   y >= region.y && y <= region.y + region.height;
        }

        // 首页可视化
        function initHomeVisualization() {
            if (!document.getElementById('homeViz')) return;
            
            // 检查 D3.js 是否已加载
            if (typeof d3 === 'undefined') {
                console.error('D3.js is not loaded. Please ensure d3.v7.min.js is included in the page.');
                return;
            }
            
            // 确保容器有实际大小，使用 hero-section 的实际尺寸
            const container = document.getElementById('homeViz');
            // 获取 hero-section 的实际尺寸
            const heroSection = container.closest('.hero-section');
            let width, height;
            
            if (heroSection) {
                const rect = heroSection.getBoundingClientRect();
                width = rect.width;
                height = rect.height;
            } else {
                // 回退到容器尺寸
                const rect = container.getBoundingClientRect();
                width = rect.width || window.innerWidth;
                height = rect.height || window.innerHeight;
            }

            const svg = d3.select('#homeViz')
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background', 'transparent');

            const g = svg.append('g');

            // 计算避开中间卡片的布局区域（修复坐标系问题）
            // 支持两种页面结构：data_lineage/index.html 的 .center-card 和 index.html 的 .hero-content
            const centerCard = document.querySelector('.center-card') || document.querySelector('.hero-content') || document.querySelector('.row.align-items-center');
            let centerRegion = null;
            if (centerCard) {
                // 获取卡片相对于视窗的位置
                const cardRect = centerCard.getBoundingClientRect();
                
                // 获取容器相对于视窗的位置
                const containerRect = container.getBoundingClientRect();

                // 转换为相对于 SVG 的坐标（SVG 现在使用视口尺寸）
                const padding = 50; // 减少内边距，让节点可以更靠近中间区域
                // 由于 SVG 使用视口尺寸，坐标直接相对于视口
                const regionX = cardRect.left - padding;
                const regionY = cardRect.top - padding;
                const regionWidth = cardRect.width + padding * 2;
                const regionHeight = cardRect.height + padding * 2;

                centerRegion = {
                    x: regionX,
                    y: regionY,
                    width: regionWidth,
                    height: regionHeight
                };

            }

            // 使用D3的力导向布局，让节点避开中央区域（优化参数以提高性能）
            const simulation = d3.forceSimulation()
                .force('link', d3.forceLink().id(d => d.id).distance(80).strength(0.4))
                .force('charge', d3.forceManyBody().strength(-180))
                .force('x', d3.forceX(width / 2).strength(0.03))
                .force('y', d3.forceY(height / 2).strength(0.03))
                .force('collision', d3.forceCollide().radius(d => d.size + 12).strength(0.8))
                .alphaDecay(0.05) // 加速模拟衰减
                .velocityDecay(0.4); // 快速停止

            // 加载真实数据
            Promise.all([
                fetch('data/lineage/graph.jsonl').then(r => {
                    if (!r.ok) throw new Error('Failed to load lineage/graph.jsonl');
                    return r.text();
                }),
                fetch('data/lineage/lineage_data.jsonl').then(r => {
                    if (!r.ok) throw new Error('Failed to load data.jsonl');
                    return r.text();
                })
            ]).then(([graphText, dataText]) => {
                // 处理空文件或格式错误
                if (!graphText || !dataText) {
                    throw new Error('Empty data files');
                }

                const graphEdges = graphText.trim().split('\n')
                    .filter(l => l.trim())
                    .map(l => {
                        try {
                            return JSON.parse(l);
                        } catch (e) {
                            console.warn('Failed to parse line:', l, e);
                            return null;
                        }
                    })
                    .filter(Boolean);

                const datasets = dataText.trim().split('\n')
                    .filter(l => l.trim())
                    .map(l => {
                        try {
                            return JSON.parse(l);
                        } catch (e) {
                            console.warn('Failed to parse line:', l, e);
                            return null;
                        }
                    })
                    .filter(Boolean);

                if (graphEdges.length === 0) {
                    throw new Error('No valid graph data found');
                }

                // 计算节点度数
                const nodeDegree = {};
                graphEdges.forEach(edge => {
                    nodeDegree[edge.source] = (nodeDegree[edge.source] || 0) + 1;
                    nodeDegree[edge.target] = (nodeDegree[edge.target] || 0) + 1;
                });

                // 找出度数最高的节点作为中心节点
                const sortedNodes = Object.entries(nodeDegree)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8);

                const centralNodes = sortedNodes.map(([id, degree], i) => {
                    // 智能生成初始位置，避开中心区域
                    let x, y;
                    let attempts = 0;
                    const maxAttempts = 50;

                    do {
                        x = Math.random() * width;
                        y = Math.random() * height;
                        attempts++;
                    } while (isInCenterRegion(x, y, centerRegion) && attempts < maxAttempts);

                    return {
                        id,
                        size: Math.min(30, 15 + degree / 5),
                        color: targetColors[i % targetColors.length],
                        isCentral: true,
                        degree: degree,
                        x: x,
                        y: y
                    };
                });

                // 收集更多连接关系
                const nodes = [...centralNodes];
                const links = [];
                const connectedNodes = new Set(centralNodes.map(n => n.id));

                // 降低阈值，收集更多节点
                graphEdges.forEach(edge => {
                    const sourceInCentral = centralNodes.find(n => n.id === edge.source);
                    const targetInCentral = centralNodes.find(n => n.id === edge.target);

                    if (sourceInCentral && !connectedNodes.has(edge.target)) {
                        const targetConnections = graphEdges.filter(e => e.target === edge.target || e.source === edge.target);
                        const isHighQuality = targetConnections.length > 1;

                        if (isHighQuality) {
                            // 智能生成初始位置，避开中心区域
                            let x, y;
                            let attempts = 0;
                            do {
                                x = Math.random() * width;
                                y = Math.random() * height;
                                attempts++;
                            } while (isInCenterRegion(x, y, centerRegion) && attempts < 50);

                            nodes.push({
                                id: edge.target,
                                size: 9 + Math.min(15, targetConnections.length / 2),
                                color: sourceInCentral.color,
                                opacity: 0.4,
                                degree: targetConnections.length,
                                x: x,
                                y: y
                            });
                            connectedNodes.add(edge.target);

                            links.push({
                                source: edge.source,
                                target: edge.target,
                                confidence: JSON.parse(edge.meta_info).confidence
                            });
                        }
                    }

                    if (targetInCentral && !connectedNodes.has(edge.source)) {
                        const sourceConnections = graphEdges.filter(e => e.target === edge.source || e.source === edge.source);
                        const isHighQuality = sourceConnections.length > 1;

                        if (isHighQuality) {
                            // 智能生成初始位置，避开中心区域
                            let x, y;
                            let attempts = 0;
                            do {
                                x = Math.random() * width;
                                y = Math.random() * height;
                                attempts++;
                            } while (isInCenterRegion(x, y, centerRegion) && attempts < 50);

                            nodes.push({
                                id: edge.source,
                                size: 9 + Math.min(15, sourceConnections.length / 2),
                                color: targetInCentral.color,
                                opacity: 0.4,
                                degree: sourceConnections.length,
                                x: x,
                                y: y
                            });
                            connectedNodes.add(edge.source);

                            links.push({
                                source: edge.source,
                                target: edge.target,
                                confidence: JSON.parse(edge.meta_info).confidence
                            });
                        }
                    }
                });

                // 减少中间节点数量，提高性能
                const midLevelNodes = [];
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if (Math.random() > 0.6) {
                        // 智能生成初始位置，避开中心区域
                        let x, y;
                        let attempts = 0;
                        do {
                            x = Math.random() * width;
                            y = Math.random() * height;
                            attempts++;
                        } while (isInCenterRegion(x, y, centerRegion) && attempts < 50);

                        midLevelNodes.push({
                            id: `${node.id}_mid_${i}`,
                            size: 6 + Math.random() * 9,
                            color: node.color,
                            opacity: 0.3,
                            isMid: true,
                            x: x,
                            y: y
                        });
                    }
                }

                // 将中间节点添加到主节点列表
                nodes.push(...midLevelNodes);

                // 为中间节点添加连接到最近的节点
                midLevelNodes.forEach(midNode => {
                    // 找到最近的2个节点连接（减少到2个）
                    const distances = nodes
                        .filter(n => n.id !== midNode.id)
                        .map(n => ({
                            node: n,
                            distance: Math.random() * 200 + 50
                        }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 2);

                    distances.forEach(({ node, distance }) => {
                        links.push({
                            source: midNode.id,
                            target: node.id,
                            confidence: 0.5
                        });
                    });
                });

                // 减少跨区域连接数量
                for (let i = 0; i < 20; i++) {
                    const sourceIndex = Math.floor(Math.random() * nodes.length);
                    const targetIndex = Math.floor(Math.random() * nodes.length);

                    if (sourceIndex !== targetIndex) {
                        const source = nodes[sourceIndex];
                        const target = nodes[targetIndex];

                        // 只有距离足够远的才连接
                        const dx = (source.x || 0) - (target.x || 0);
                        const dy = (source.y || 0) - (target.y || 0);
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > width / 4 || Math.random() > 0.8) {
                            links.push({
                                source: source.id,
                                target: target.id,
                                confidence: 0.2
                            });
                        }
                    }
                }

                // 添加中心节点之间的更多连接
                for (let i = 0; i < centralNodes.length; i++) {
                    for (let j = i + 1; j < centralNodes.length; j++) {
                        const hasConnection = graphEdges.some(e =>
                            (e.source === centralNodes[i].id && e.target === centralNodes[j].id) ||
                            (e.source === centralNodes[j].id && e.target === centralNodes[i].id)
                        );
                        if (hasConnection) {
                            links.push({
                                source: centralNodes[i].id,
                                target: centralNodes[j].id,
                                confidence: 0.9
                            });
                        } else if (Math.random() > 0.7) {
                            // 随机添加一些连接增强复杂度
                            links.push({
                                source: centralNodes[i].id,
                                target: centralNodes[j].id,
                                confidence: 0.3
                            });
                        }
                    }
                }

                // 添加连接线
                const linkElements = g.selectAll('.home-link')
                    .data(links)
                    .enter()
                    .append('line')
                    .attr('class', 'home-link')
                    .attr('stroke', d => {
                        const alpha = Math.max(0.08, (d.confidence || 0.3) * 0.3);
                        return `rgba(255, 255, 255, ${alpha})`;
                    })
                    .attr('stroke-width', d => 0.5 + (d.confidence || 0.3) * 1.5)
                    .attr('stroke-opacity', 0.3);

                // 添加节点
                const nodeElements = g.selectAll('.home-node')
                    .data(nodes)
                    .enter()
                    .append('g')
                    .attr('class', 'home-node');

                nodeElements.append('circle')
                    .attr('r', d => d.size)
                    .attr('fill', d => d.color)
                    .attr('opacity', d => d.opacity || 0.5)
                    .attr('stroke', 'rgba(255, 255, 255, 0.5)')
                    .attr('stroke-width', d => d.isCentral ? 2 : 1)
                    .attr('filter', d => `drop-shadow(0 0 6px ${d.color}20)`);

                nodeElements.append('text')
                    .attr('dx', 0)
                    .attr('dy', d => d.size + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', d => d.isCentral ? '11px' : '8px')
                    .attr('fill', 'rgba(255, 255, 255, 0.4)')
                    .attr('font-weight', 500)
                    .attr('pointer-events', 'none')
                    .text(d => {
                        const name = d.id.split('/').pop() || d.id;
                        return name.length > 15 ? name.substring(0, 15) + '...' : name;
                    });

                // 设置模拟
                simulation.nodes(nodes).on('tick', ticked);
                simulation.force('link').links(links);

                // 动画效果
                nodeElements
                    .style('opacity', 0)
                    .transition()
                    .duration(600)
                    .delay((d, i) => i * 15)
                    .style('opacity', d => d.opacity || 0.5);

                linkElements
                    .style('opacity', 0)
                    .transition()
                    .duration(600)
                    .delay((d, i) => i * 10)
                    .style('opacity', 0.3);

                // 限制模拟迭代次数，快速停止
                let tickCount = 0;
                const maxTicks = 100;

                function ticked() {
                    tickCount++;

                    linkElements
                        .attr('x1', d => d.source.x)
                        .attr('y1', d => d.source.y)
                        .attr('x2', d => d.target.x)
                        .attr('y2', d => d.target.y);

                    nodeElements
                        .attr('transform', d => {
                            // 检查节点是否进入中心区域，如果是则施加额外排斥力
                            if (centerRegion && isInCenterRegion(d.x, d.y, centerRegion)) {
                                // 计算从中心区域边缘的排斥力（使用修正后的坐标）
                                const centerX = centerRegion.x + centerRegion.width / 2;
                                const centerY = centerRegion.y + centerRegion.height / 2;
                                const angle = Math.atan2(d.y - centerY, d.x - centerX);
                                const force = -200; // 减少排斥力，让节点可以更靠近中间

                                d.fx = d.x + Math.cos(angle) * force * 0.02;
                                d.fy = d.y + Math.sin(angle) * force * 0.02;

                                // 在下一tick释放固定
                                setTimeout(() => {
                                    d.fx = null;
                                    d.fy = null;
                                }, 10);
                            }

                            return `translate(${d.x},${d.y})`;
                        });

                    // 提前停止模拟以提高性能
                    if (tickCount >= maxTicks) {
                        simulation.stop();
                    }
                }
            }).catch(error => {
                console.error('首页数据加载失败:', error);
                // 使用备用方案
                createFallbackVisualization();
            });
        }

        // 备用可视化方案
        function createFallbackVisualization() {
            const width = document.getElementById('homeViz').clientWidth;
            const height = document.getElementById('homeViz').clientHeight;

            const svg = d3.select('#homeViz')
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .style('background', 'transparent');

            const g = svg.append('g');

            // 计算避开中间卡片的布局区域（修复坐标系问题）
            // 支持两种页面结构：data_lineage/index.html 的 .center-card 和 index.html 的 .hero-content
            const centerCard = document.querySelector('.center-card') || document.querySelector('.hero-content') || document.querySelector('.row.align-items-center');
            let centerRegion = null;
            if (centerCard) {
                // 获取容器相对于视窗的位置
                const container = document.getElementById('homeViz');
                const containerRect = container.getBoundingClientRect();
                // 获取卡片相对于视窗的位置
                const cardRect = centerCard.getBoundingClientRect();

                // 转换为相对于 SVG 容器的坐标
                const padding = 50; // 减少内边距，让节点可以更靠近中间区域
                const regionX = cardRect.left - containerRect.left - padding;
                const regionY = cardRect.top - containerRect.top - padding;
                const regionWidth = cardRect.width + padding * 2;
                const regionHeight = cardRect.height + padding * 2;

                centerRegion = {
                    x: regionX,
                    y: regionY,
                    width: regionWidth,
                    height: regionHeight
                };
            }

            const simulation = d3.forceSimulation()
                .force('link', d3.forceLink().distance(80).strength(0.4))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2));

            // 简单的示例数据，智能生成位置避开中心区域
            const nodes = Array.from({length: 50}, (_, i) => {
                let x, y;
                let attempts = 0;
                do {
                    x = Math.random() * width;
                    y = Math.random() * height;
                    attempts++;
                } while (isInCenterRegion(x, y, centerRegion) && attempts < 50);

                return {
                    id: `node-${i}`,
                    size: 8 + Math.random() * 15,
                    color: targetColors[i % targetColors.length],
                    isCentral: i < 5,
                    x: x,
                    y: y
                };
            });

            const links = [];
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length && j < i + 4; j++) {
                    links.push({source: nodes[i].id, target: nodes[j].id});
                }
            }

            const linkElements = g.selectAll('.home-link')
                .data(links)
                .enter()
                .append('line')
                .attr('class', 'home-link')
                .attr('stroke', 'rgba(255, 255, 255, 0.15)')
                .attr('stroke-width', 1.5)
                .attr('stroke-opacity', 0.3);

            const nodeElements = g.selectAll('.home-node')
                .data(nodes)
                .enter()
                .append('g')
                .attr('class', 'home-node')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            nodeElements.append('circle')
                .attr('r', d => d.size)
                .attr('fill', d => d.color)
                .attr('opacity', d => d.isCentral ? 0.5 : 0.3)
                .attr('stroke', 'rgba(255, 255, 255, 0.5)')
                .attr('stroke-width', d => d.isCentral ? 3 : 2);

            simulation.nodes(nodes).on('tick', ticked);
            simulation.force('link').links(links);

            function ticked() {
                linkElements
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                nodeElements
                    .attr('transform', d => {
                        // 检查节点是否进入中心区域，如果是则施加额外排斥力
                        if (centerRegion && isInCenterRegion(d.x, d.y, centerRegion)) {
                            // 计算从中心区域边缘的排斥力（使用修正后的坐标）
                            const centerX = centerRegion.x + centerRegion.width / 2;
                            const centerY = centerRegion.y + centerRegion.height / 2;
                            const angle = Math.atan2(d.y - centerY, d.x - centerX);
                            const force = -200; // 减少排斥力，让节点可以更靠近中间

                            d.fx = d.x + Math.cos(angle) * force * 0.02;
                            d.fy = d.y + Math.sin(angle) * force * 0.02;

                            setTimeout(() => {
                                d.fx = null;
                                d.fy = null;
                            }, 10);
                        }

                        return `translate(${d.x},${d.y})`;
                    });
            }

            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }

        // 加载所有数据文件（优化版）
        function loadGraphData() {
            const loadingDiv = document.getElementById('loading');
            if (loadingDiv) {
                loadingDiv.style.display = 'block';
            }

            // 记录加载时间
            const loadStartTime = performance.now();

            // 尝试从缓存加载（localStorage）
            const cacheKey = 'dataLineageCache';
            const cachedData = localStorage.getItem(cacheKey);

            // 临时禁用缓存：直接将缓存时间设置为0
            const cacheEnabled = false;  // 修改这里可以启用/禁用缓存

            if (cacheEnabled && cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const cacheTime = parsed.timestamp;
                    const now = Date.now();

                    // 检查缓存是否过期（24小时）
                    if (now - cacheTime < 24 * 60 * 60 * 1000) {
                        graphData = parsed.graphData;
                        dataInfo = parsed.dataInfo;
                        // 从dataInfo重建allDatasetNames数组
                        allDatasetNames = Object.keys(dataInfo).map(name => ({
                            name: name,
                            year: dataInfo[name].year,
                            categories: dataInfo[name].categories,
                            data_type: dataInfo[name].data_type || 'unknown',
                            summary: dataInfo[name].summary
                        }));
                        window.adjacencyMap = buildAdjacencyMap(graphData);
                        if (loadingDiv) {
                            loadingDiv.style.display = 'none';
                        }
                        showError(t('genealogy_cacheLoaded'), true);
                        return Promise.resolve();
                    }
                } catch (e) {
                    console.warn('缓存解析失败，将重新加载', e);
                }
            }

            // 加载 lineage/graph.jsonl
            return fetch('data/lineage/graph.jsonl')
                .then(response => {
                    if (!response.ok) throw new Error('无法加载图数据');
                    return response.text();
                })
                .then(text => {
                    const lines = text.trim().split('\n');
                    graphData = lines.map(line => JSON.parse(line));
                    window.adjacencyMap = buildAdjacencyMap(graphData);

                    // 加载 data.jsonl
                    return fetch('data/lineage/lineage_data.jsonl');
                })
                .then(response => {
                    if (!response.ok) throw new Error('无法加载数据集信息');
                    return response.text();
                })
                .then(text => {
                    const lines = text.trim().split('\n');
                    dataInfo = {};
                    allDatasetNames = [];  // 重置数据集名称列表
                    lines.forEach(line => {
                        const item = JSON.parse(line);
                        dataInfo[item.name] = item;
                        allDatasetNames.push({
                            name: item.name,
                            year: item.year,
                            categories: item.categories,
                            data_type: item.data_type || 'unknown',
                            summary: item.summary
                        });
                    });

                    // 保存到缓存（仅在启用缓存时保存）
                    if (cacheEnabled) {
                        try {
                            localStorage.setItem(cacheKey, JSON.stringify({
                                graphData,
                                dataInfo,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            console.warn('缓存保存失败', e);
                        }
                    }

                    const loadTime = (performance.now() - loadStartTime).toFixed(2);
                    if (loadingDiv) {
                        loadingDiv.style.display = 'none';
                    }
                    showError(t('genealogy_dataLoaded', {time: loadTime}), true, 'success');
                })
                .catch(error => {
                    const loadingDiv = document.getElementById('loading');
                    if (loadingDiv) {
                        loadingDiv.style.display = 'none';
                    }
                    showError(t('genealogy_loadFailed') + error.message);
                    console.error(error);
                    return Promise.reject(error);
                });
        }

        // 构建邻接表
        function buildAdjacencyMap(edges) {
            const map = {};

            edges.forEach(edge => {
                if (!map[edge.target]) {
                    map[edge.target] = [];
                }

                const parsedMeta = JSON.parse(edge.meta_info);
                map[edge.target].push({
                    source: edge.source,
                    relationship: parsedMeta.relationship,
                    confidence: parsedMeta.confidence
                });
            });

            return map;
        }

        /**
         * 模糊搜索算法 - 支持多种匹配策略
         * @param {string} query - 搜索关键词
         * @param {number} maxResults - 最大结果数量
         * @returns {Array} 匹配的数据集列表
         */
        function fuzzySearch(query, maxResults = 10) {
            if (!query || query.length < 2 || !allDatasetNames.length) {
                return [];
            }

            const queryLower = query.toLowerCase();
            const queryParts = queryLower.split(/[\/\-\_\s]+/);
            const results = [];

            for (const dataset of allDatasetNames) {
                const nameLower = dataset.name.toLowerCase();
                let score = 0;

                // 1. 精确匹配（最高优先级）
                if (nameLower === queryLower) {
                    score = 100;
                }
                // 2. 前缀匹配
                else if (nameLower.startsWith(queryLower)) {
                    score = 90;
                }
                // 3. 包含匹配
                else if (nameLower.includes(queryLower)) {
                    score = 70;
                }
                // 4. 单词边界匹配（匹配斜杠、连字符等分隔的部分）
                else {
                    let hasWordBoundaryMatch = false;
                    for (const part of queryParts) {
                        if (part.length >= 2 && nameLower.includes(part)) {
                            hasWordBoundaryMatch = true;
                            break;
                        }
                    }
                    if (hasWordBoundaryMatch) {
                        score = 60;
                    }
                }

                // 5. 模糊匹配（编辑距离）
                if (score === 0) {
                    const similarity = calculateSimilarity(queryLower, nameLower);
                    if (similarity > 0.6) {
                        score = 50 * similarity;
                    }
                }

                if (score > 0) {
                    results.push({
                        ...dataset,
                        score: score
                    });
                }
            }

            // 按分数排序并返回前N个结果
            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);
        }

        /**
         * 计算两个字符串的相似度（使用编辑距离算法）
         */
        function calculateSimilarity(str1, str2) {
            const len1 = str1.length;
            const len2 = str2.length;
            const matrix = [];

            // 创建矩阵
            for (let i = 0; i <= len1; i++) {
                matrix[i] = [i];
            }
            for (let j = 0; j <= len2; j++) {
                matrix[0][j] = j;
            }

            // 填充矩阵
            for (let i = 1; i <= len1; i++) {
                for (let j = 1; j <= len2; j++) {
                    if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }

            const editDistance = matrix[len1][len2];
            const maxLen = Math.max(len1, len2);
            return 1 - editDistance / maxLen;
        }

        /**
         * 自动完成组件类
         */
        class Autocomplete {
            constructor(inputElement) {
                this.input = inputElement;
                this.wrapper = document.createElement('div');
                this.wrapper.className = 'autocomplete-wrapper';
                this.suggestionsList = document.createElement('div');
                this.suggestionsList.className = 'autocomplete-suggestions';

                // 将输入框包装起来
                this.input.parentNode.insertBefore(this.wrapper, this.input);
                this.wrapper.appendChild(this.input);
                this.wrapper.appendChild(this.suggestionsList);

                this.selectedIndex = -1;
                this.currentSuggestions = [];

                this.bindEvents();
            }

            bindEvents() {
                // 输入事件
                this.input.addEventListener('input', (e) => {
                    this.handleInput(e.target.value);
                });

                // 聚焦事件 - 当用户聚焦但未输入时，显示随机推荐
                this.input.addEventListener('focus', (e) => {
                    if (!e.target.value.trim()) {
                        this.showRandomRecommendations();
                    }
                });

                // 键盘事件
                this.input.addEventListener('keydown', (e) => {
                    this.handleKeydown(e);
                });

                // 点击外部关闭建议
                document.addEventListener('click', (e) => {
                    if (!this.wrapper.contains(e.target)) {
                        this.hideSuggestions();
                    }
                });
            }

            handleInput(value) {
                if (!value.trim()) {
                    // 如果输入为空，显示随机推荐
                    this.showRandomRecommendations();
                    return;
                }

                if (value.length < 2) {
                    this.hideSuggestions();
                    return;
                }

                this.currentSuggestions = fuzzySearch(value, 8);
                this.renderSuggestions();
            }

            handleKeydown(e) {
                if (!this.currentSuggestions.length) return;

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.selectedIndex = Math.min(
                            this.selectedIndex + 1,
                            this.currentSuggestions.length - 1
                        );
                        this.updateSelection();
                        break;

                    case 'ArrowUp':
                        e.preventDefault();
                        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                        this.updateSelection();
                        break;

                    case 'Enter':
                        e.preventDefault();
                        if (this.selectedIndex >= 0) {
                            this.selectSuggestion(this.currentSuggestions[this.selectedIndex]);
                        }
                        break;

                    case 'Escape':
                        this.hideSuggestions();
                        break;
                }
            }

            renderSuggestions() {
                if (!this.currentSuggestions.length) {
                    this.hideSuggestions();
                    return;
                }

                this.suggestionsList.innerHTML = '';
                this.suggestionsList.classList.add('visible');
                this.selectedIndex = -1;

                this.currentSuggestions.forEach((dataset, index) => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.innerHTML = `
                        <span class="autocomplete-item-name">${this.highlightMatch(dataset.name)}</span>
                        <span class="autocomplete-item-year">${dataset.year || 'N/A'}</span>
                        <span class="autocomplete-item-categories">${dataset.data_type || 'unknown'}</span>
                    `;

                    item.addEventListener('click', () => {
                        this.selectSuggestion(dataset);
                    });

                    this.suggestionsList.appendChild(item);
                });
            }

            highlightMatch(name) {
                const query = this.input.value.toLowerCase();
                const regex = new RegExp(`(${query})`, 'gi');
                return name.replace(regex, '<strong style="color: var(--color-blue-primary)">$1</strong>');
            }

            updateSelection() {
                const items = this.suggestionsList.querySelectorAll('.autocomplete-item');
                items.forEach((item, index) => {
                    item.classList.toggle('active', index === this.selectedIndex);
                });

                if (this.selectedIndex >= 0) {
                    const activeItem = items[this.selectedIndex];
                    const containerTop = this.suggestionsList.scrollTop;
                    const containerBottom = containerTop + this.suggestionsList.clientHeight;
                    const itemTop = activeItem.offsetTop;
                    const itemBottom = itemTop + activeItem.offsetHeight;

                    if (itemTop < containerTop) {
                        this.suggestionsList.scrollTop = itemTop;
                    } else if (itemBottom > containerBottom) {
                        this.suggestionsList.scrollTop = itemBottom - this.suggestionsList.clientHeight;
                    }
                }
            }

            selectSuggestion(dataset) {
                this.input.value = dataset.name;
                this.hideSuggestions();
                this.input.dispatchEvent(new Event('change'));
            }

            hideSuggestions() {
                this.suggestionsList.classList.remove('visible');
                this.selectedIndex = -1;
                this.currentSuggestions = [];
            }

            // 生成推荐（从直接source data数量在2-4的数据集中随机抽取）
            generateRandomRecommendations(count = 5) {
                if (!allDatasetNames.length) return [];
                
                // 如果 adjacencyMap 还未加载，返回空数组
                if (!window.adjacencyMap) return [];

                // 筛选出直接source data数量在2-4之间的数据集
                const filteredDatasets = allDatasetNames.filter(dataset => {
                    const sources = window.adjacencyMap[dataset.name] || [];
                    const sourceCount = sources.length;
                    return sourceCount >= 2 && sourceCount <= 4;
                });

                if (filteredDatasets.length === 0) return [];

                // 随机打乱数组
                const shuffled = [...filteredDatasets];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                // 返回前N个（随机抽取的）
                return shuffled.slice(0, Math.min(count, shuffled.length));
            }

            // 显示推荐（从直接source data数量在2-4的数据集中随机抽取）
            showRandomRecommendations() {
                this.currentSuggestions = this.generateRandomRecommendations(5);
                this.renderSuggestions();
            }
        }

        // 构建树形数据结构
        function buildTree(target, maxDepth, allTargetNodes = new Set()) {
            const visited = new Set();

            function buildNode(name, depth) {
                if (depth > maxDepth || visited.has(name)) {
                    return null;
                }
                visited.add(name);

                const sources = window.adjacencyMap[name] || [];
                const children = [];

                if (sources.length === 0) {
                    return {
                        name: name,
                        depth: depth,
                        children: [],
                        isLeaf: true,
                        isTarget: allTargetNodes.has(name),  // 标记是否为任意目标数据集
                        relations: []
                    };
                }

                sources.forEach(edge => {
                    // 只为存在于 Hugging Face 的数据集创建节点
                    const sourceInfo = dataInfo[edge.source];
                    if (sourceInfo && sourceInfo.exists_on_hf) {
                        const node = buildNode(edge.source, depth + 1, allTargetNodes);

                        if (node) {
                            children.push(node);
                        }
                    }
                });

                // 判断是否为叶子节点：基于整个数据图，而不是当前构建的树
                // 检查是否有任何有效的源数据（存在于 Hugging Face 的）
                const hasValidSources = sources.some(edge => {
                    const sourceInfo = dataInfo[edge.source];
                    return sourceInfo && sourceInfo.exists_on_hf;
                });
                const isLeaf = !hasValidSources;

                return {
                    name: name,
                    depth: depth,
                    children: children,
                    isLeaf: isLeaf,
                    isTarget: allTargetNodes.has(name),  // 标记是否为任意目标数据集
                    relations: sources  // relations 保留完整的源数据信息，用于在卡片中显示
                };
            }

            return buildNode(target, 0);
        }

        // 标记所有节点的角色，用于颜色分配
        function markNodeRoles(roots, allTargetNodes) {
            roots.forEach(root => {
                function traverse(node) {
                    // 标记节点角色，优先级：目标数据集 > 中间节点 > 叶子节点
                    // 基于整个数据图判断，不受深度限制影响
                    if (allTargetNodes.has(node.name)) {
                        node.nodeType = 'target';  // 目标数据集
                    } else {
                        // 检查是否有有效的源数据（存在于 Hugging Face 的）
                        const sources = window.adjacencyMap[node.name] || [];
                        const hasValidSources = sources.some(edge => {
                            const sourceInfo = dataInfo[edge.source];
                            return sourceInfo && sourceInfo.exists_on_hf;
                        });
                        
                        if (hasValidSources) {
                            node.nodeType = 'intermediate';  // 中间节点
                        } else {
                            node.nodeType = 'leaf';  // 叶子节点
                        }
                    }

                    node.children.forEach(traverse);
                }
                traverse(root);
            });
        }

        // 计算树统计信息
        function calculateStats(root) {
            let nodes = 0, edges = 0, maxDepth = 0;

            function traverse(node, depth) {
                nodes++;
                maxDepth = Math.max(maxDepth, depth);

                node.children.forEach(child => {
                    edges++;
                    traverse(child, depth + 1);
                });
            }

            if (root) traverse(root, 0);

            return { nodes, edges, maxDepth };
        }

        // 添加目标输入框
        function addTargetInput() {
            const container = document.getElementById('targetInputs');
            const newGroup = document.createElement('div');
            newGroup.className = 'target-input-group';
            newGroup.innerHTML = `
                <input type="text" class="target-input" placeholder="例如: open-r1/OpenR1-Math-220k" autocomplete="off">
                <button type="button" class="remove-target-btn" onclick="removeTargetInput(this)">×</button>
            `;
            container.appendChild(newGroup);

            // 为新输入框添加自动完成功能
            const newInput = newGroup.querySelector('.target-input');
            new Autocomplete(newInput);
        }

        // 移除目标输入框
        function removeTargetInput(button) {
            const container = document.getElementById('targetInputs');
            if (container.children.length > 1) {
                button.parentElement.remove();
            }
        }

        // 获取所有目标
        function getTargets() {
            const inputs = document.querySelectorAll('.target-input');
            return Array.from(inputs).map(input => input.value.trim()).filter(value => value);
        }

        // 可视化数据
        function visualizeData() {
            const targets = getTargets();
            const depth = parseInt(document.getElementById('depthInput').value);

            // 添加按钮加载状态
            const btn = document.querySelector('.btn');
            const originalText = btn.textContent;
            
            // 移除加载状态的辅助函数
            const removeLoading = () => {
                btn.classList.remove('loading');
                btn.disabled = false;
                btn.textContent = originalText;
            };

            if (targets.length === 0) {
                showError(t('genealogy_enterTarget'));
                removeLoading();
                return;
            }

            btn.classList.add('loading');
            btn.disabled = true;

            // 检测重复数据
            const seen = new Set();
            const duplicates = [];
            targets.forEach(target => {
                if (seen.has(target)) {
                    if (!duplicates.includes(target)) {
                        duplicates.push(target);
                    }
                } else {
                    seen.add(target);
                }
            });

            // 如果有重复，显示警告提示但不阻止执行
            if (duplicates.length > 0) {
                showDuplicateWarning(duplicates);
            }

            // 对targets数组进行去重
            const uniqueTargets = [...new Set(targets)];

            const errorDiv = document.getElementById('error');
            errorDiv.style.display = 'none';

            // 检查所有目标是否存在于数据集中（data.jsonl）
            // 注意：adjacencyMap只包含有incoming edges的节点，叶子节点不在其中但仍然有效
            const invalidTargets = uniqueTargets.filter(target => !dataInfo[target]);
            if (invalidTargets.length > 0) {
                showError(t('genealogy_targetNotFound', {targets: invalidTargets.join(', ')}));
                removeLoading();
                return;
            }

            // 构建多个树
            currentRoots = [];
            const allTargetNodes = new Set(uniqueTargets);  // 所有目标数据集的集合

            // 第一步：收集所有节点，确定哪些节点应该被排除（作为其他目标的子节点出现）
            const allOriginalRoots = [];  // 保存所有原始target的root对象，用于Source Data Analysis
            uniqueTargets.forEach((target, index) => {
                const root = buildTree(target, depth, allTargetNodes);
                if (root) {  // 允许叶子节点（有或没有子节点）
                    root.targetName = target;
                    root.isPrimaryTarget = true;  // 标记这是主目标
                    root.color = targetColors[index % targetColors.length];
                    currentRoots.push(root);
                    allOriginalRoots.push(root);  // 保存所有原始root对象
                }
            });

            // 第二步：去重 - 移除那些已经作为其他目标子节点出现的节点
            // 但保留用户明确选择的目标数据集（在 allTargetNodes 中）
            const allChildNodeNames = new Set();
            currentRoots.forEach(root => {
                function collectChildren(node) {
                    node.children.forEach(child => {
                        allChildNodeNames.add(child.name);
                        collectChildren(child);
                    });
                }
                if (root.children.length > 0) {
                    collectChildren(root);
                }
            });

            // 过滤逻辑：如果一个目标已经在另一个目标的子节点中出现，则不作为独立根显示
            // 例如：如果用户选择了 A 和 B，且 B 是 A 的源，那么 B 只在 A 的子节点中出现，不作为独立根
            const filteredRoots = currentRoots.filter(root => !allChildNodeNames.has(root.name));

            // 保存原始目标列表，用于图例显示
            window.originalTargets = [...uniqueTargets];
            // 保存所有原始root对象，用于Source Data Analysis（包含所有用户选择的target）
            window.allOriginalRoots = allOriginalRoots;
            
            // 初始化启用状态（默认所有target都是启用的）
            window.enabledTargets = new Set(uniqueTargets);

            currentRoots = filteredRoots;

            // 标记所有节点的角色（用于颜色分配）
            // 注意：需要在所有目标数据集上标记，不仅仅是 currentRoots
            markNodeRoles(currentRoots, allTargetNodes);

            // 确保所有在 allTargetNodes 中的节点都被标记为 target，即使它们不在 currentRoots 中
            // 这可以确保在树中出现的目标节点（如 B 作为 A 的子节点）也显示目标颜色
            allTargetNodes.forEach(targetName => {
                function markInTree(node) {
                    if (node.name === targetName) {
                        node.nodeType = 'target';
                    }
                    node.children.forEach(markInTree);
                }
                currentRoots.forEach(root => markInTree(root));
            });

            if (currentRoots.length === 0) {
                showError(t('genealogy_noTreeBuilt'));
                removeLoading();
                return;
            }

            // 更新目标控制面板
            updateTargetControls();

            // 计算统计信息
            // 使用所有原始target的root对象来计算统计，确保所有用户选择的target都被包含
            const stats = calculateMultiStats(window.allOriginalRoots || currentRoots);
            updateStats(stats);

            // 统一使用树形布局
            drawMergedTree(currentRoots);
            
            // 移除加载状态（延迟一点以确保动画完成）
            setTimeout(() => {
                removeLoading();
            }, 300);
        }

        // 计算多树统计信息
        function calculateMultiStats(roots) {
            let totalNodes = 0, totalEdges = 0, maxDepth = 0;
            const uniqueNodes = new Set();

            roots.forEach(root => {
                const stats = calculateStats(root);
                totalNodes += stats.nodes;
                totalEdges += stats.edges;
                maxDepth = Math.max(maxDepth, stats.maxDepth);

                function collectNodes(node) {
                    uniqueNodes.add(node.name);
                    node.children.forEach(collectNodes);
                }
                collectNodes(root);
            });

            return {
                nodes: totalNodes,
                edges: totalEdges,
                maxDepth,
                uniqueNodes: uniqueNodes.size,
                targetCount: roots.length
            };
        }

        // 更新统计信息
        function updateStats(stats) {
            const statsDiv = document.getElementById('stats');
            statsDiv.style.display = 'grid';
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.nodes}</div>
                    <div class="stat-label">${t('genealogy_totalNodes')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.uniqueNodes || stats.nodes}</div>
                    <div class="stat-label">${t('genealogy_uniqueNodes')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.edges}</div>
                    <div class="stat-label">${t('genealogy_relations')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.targetCount || 1}</div>
                    <div class="stat-label">${t('genealogy_targets')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.maxDepth}</div>
                    <div class="stat-label">${t('genealogy_maxDepth')}</div>
                </div>
            `;
        }

        // 更新目标控制面板
        function updateTargetControls() {
            const controls = document.getElementById('targetControls');
            const targetList = document.getElementById('targetList');

            controls.style.display = 'block';
            targetList.innerHTML = '';

            // 初始化启用状态（如果还没有初始化）
            if (!window.enabledTargets) {
                window.enabledTargets = new Set();
                // 默认所有target都是启用的
                if (window.allOriginalRoots) {
                    window.allOriginalRoots.forEach(root => {
                        window.enabledTargets.add(root.targetName);
                    });
                }
            }

            // 显示所有原始target（包括被过滤掉的）
            const allTargets = window.allOriginalRoots || currentRoots;
            allTargets.forEach((root, index) => {
                const tag = document.createElement('div');
                tag.className = 'target-tag';
                const isEnabled = window.enabledTargets.has(root.targetName);
                // 转义targetName中的特殊字符，用于HTML属性
                const escapedTargetName = root.targetName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const targetId = `target-${index}-${root.targetName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                tag.innerHTML = `
                    <input type="checkbox" id="${targetId}" ${isEnabled ? 'checked' : ''} onchange="toggleTarget('${escapedTargetName}')">
                    <label for="${targetId}">${root.targetName}</label>
                `;
                tag.style.background = `linear-gradient(135deg, ${root.color} 0%, ${adjustColor(root.color, -20)} 100%)`;
                targetList.appendChild(tag);
            });
        }

        // 调整颜色亮度
        function adjustColor(color, amount) {
            const usePound = color[0] === '#';
            const col = usePound ? color.slice(1) : color;
            const num = parseInt(col, 16);
            let r = (num >> 16) + amount;
            let g = (num >> 8 & 0x00FF) + amount;
            let b = (num & 0x0000FF) + amount;
            r = r > 255 ? 255 : r < 0 ? 0 : r;
            g = g > 255 ? 255 : g < 0 ? 0 : g;
            b = b > 255 ? 255 : b < 0 ? 0 : b;
            return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
        }

        /**
         * 智能计算节点大小 - 基于下载量，使用对数缩放和分位数处理
         * @param {number} downloads - 下载量
         * @param {string} nodeType - 节点类型 ('target', 'intermediate', 'leaf')
         * @param {Object} sizeMap - 所有节点大小的预计算映射
         * @returns {number} 节点半径
         */
        function calculateNodeSize(downloads, nodeType, sizeMap) {
            // 如果没有下载量或下载量为 0，使用默认大小
            if (downloads === undefined || downloads === null || downloads === '' || downloads === 0) {
                return getDefaultSizeByType(nodeType);
            }

            const downloadsNum = parseInt(downloads);

            // 使用预计算的分位数映射
            if (sizeMap && sizeMap.has(downloadsNum)) {
                return sizeMap.get(downloadsNum);
            }

            // 备选方案：使用简单的对数缩放
            return fallbackSizeCalculation(downloadsNum, nodeType);
        }

        /**
         * 根据节点类型获取默认大小
         */
        function getDefaultSizeByType(nodeType) {
            switch (nodeType) {
                case 'target': return 20;
                case 'intermediate': return 16;
                case 'leaf': return 12;
                default: return 14;
            }
        }

        /**
         * 备选的大小计算方案（当没有预计算映射时使用）
         */
        function fallbackSizeCalculation(downloads, nodeType) {
            // 使用对数缩放处理巨大的差异
            const baseSize = getDefaultSizeByType(nodeType);
            const minSize = baseSize * 0.7;
            const maxSize = baseSize * 2.5;

            // 使用 log(1 + x) 来平滑处理大数值
            const logValue = Math.log1p(downloads);
            const maxLog = Math.log1p(100000); // 假设最大下载量为 10万

            // 标准化到 0-1 范围
            const normalized = Math.min(logValue / maxLog, 1);

            // 应用缓动函数，让差异更自然
            const eased = Math.pow(normalized, 0.6); // 使用幂函数缓和差异

            return minSize + (maxSize - minSize) * eased;
        }

        /**
         * 根据节点数量计算动态缩放因子
         * 节点少时放大，节点多时缩小，确保清晰展示
         * @param {number} nodeCount - 节点总数
         * @returns {number} 缩放因子
         */
        function calculateNodeSizeScale(nodeCount) {
            // 定义参考点：节点数量与缩放因子的映射关系
            // 使用分段函数，确保平滑过渡
            
            if (nodeCount <= 10) {
                // 10个节点以下：放大到1.8倍
                return 1.8;
            } else if (nodeCount <= 20) {
                // 10-20个节点：1.8到1.5倍线性过渡
                return 1.8 - (nodeCount - 10) * 0.03;
            } else if (nodeCount <= 50) {
                // 20-50个节点：1.5到1.2倍线性过渡
                return 1.5 - (nodeCount - 20) * 0.01;
            } else if (nodeCount <= 100) {
                // 50-100个节点：1.2到1.0倍线性过渡
                return 1.2 - (nodeCount - 50) * 0.004;
            } else if (nodeCount <= 200) {
                // 100-200个节点：1.0到0.8倍线性过渡
                return 1.0 - (nodeCount - 100) * 0.002;
            } else if (nodeCount <= 500) {
                // 200-500个节点：0.8到0.6倍线性过渡
                return 0.8 - (nodeCount - 200) * (0.2 / 300);
            } else {
                // 500个节点以上：0.6倍，但最小不低于0.4倍
                const scale = 0.6 - (nodeCount - 500) * 0.0002;
                return Math.max(0.4, scale);
            }
        }

        /**
         * 根据节点数量和密度计算布局间距缩放因子
         * @param {number} nodeCount - 节点总数
         * @param {number} maxDepth - 最大深度
         * @returns {number} 间距缩放因子
         */
        function calculateSeparationScale(nodeCount, maxDepth) {
            // 计算平均每层节点数
            const avgNodesPerLayer = nodeCount / Math.max(1, maxDepth);
            
            // 节点密度越高，需要的间距越大
            if (avgNodesPerLayer <= 5) {
                return 1.0; // 正常间距
            } else if (avgNodesPerLayer <= 10) {
                return 1.2; // 增加20%间距
            } else if (avgNodesPerLayer <= 20) {
                return 1.5; // 增加50%间距
            } else if (avgNodesPerLayer <= 50) {
                return 2.0; // 增加100%间距
            } else {
                // 非常密集时，使用对数缩放
                return 2.0 + Math.log10(avgNodesPerLayer / 50) * 0.5;
            }
        }

        /**
         * 预计算所有节点的大小映射 - 使用分位数方法确保合理的分布
         * @param {Array} allNodes - 所有节点数据
         * @returns {Map} 下载量到节点大小的映射
         */
        function precalculateNodeSizes(allNodes) {
            // 收集所有有效的下载量数据
            const downloads = allNodes
                .map(n => {
                    const info = dataInfo[n.name];
                    return info && info.downloads ? parseInt(info.downloads) : null;
                })
                .filter(d => d !== null && d !== undefined && d > 0);

            if (downloads.length === 0) {
                return null; // 没有下载量数据
            }

            // 排序下载量
            downloads.sort((a, b) => a - b);

            // 计算分位数
            const q25 = downloads[Math.floor(downloads.length * 0.25)];
            const q50 = downloads[Math.floor(downloads.length * 0.50)];
            const q75 = downloads[Math.floor(downloads.length * 0.75)];
            const q90 = downloads[Math.floor(downloads.length * 0.90)];
            const q95 = downloads[Math.floor(downloads.length * 0.95)];
            const max = downloads[downloads.length - 1];

            // 创建下载量到大小的映射
            const sizeMap = new Map();

            downloads.forEach(downloadsNum => {
                let multiplier;
                if (downloadsNum <= q25) {
                    // 25% 以下：0.8 - 1.0
                    const ratio = (downloadsNum - Math.min(...downloads)) / (q25 - Math.min(...downloads) || 1);
                    multiplier = 0.8 + ratio * 0.2;
                } else if (downloadsNum <= q50) {
                    // 25%-50%：1.0 - 1.3
                    const ratio = (downloadsNum - q25) / (q50 - q25 || 1);
                    multiplier = 1.0 + ratio * 0.3;
                } else if (downloadsNum <= q75) {
                    // 50%-75%：1.3 - 1.7
                    const ratio = (downloadsNum - q50) / (q75 - q50 || 1);
                    multiplier = 1.3 + ratio * 0.4;
                } else if (downloadsNum <= q90) {
                    // 75%-90%：1.7 - 2.0
                    const ratio = (downloadsNum - q75) / (q90 - q75 || 1);
                    multiplier = 1.7 + ratio * 0.3;
                } else if (downloadsNum <= q95) {
                    // 90%-95%：2.0 - 2.3
                    const ratio = (downloadsNum - q90) / (q95 - q90 || 1);
                    multiplier = 2.0 + ratio * 0.3;
                } else {
                    // 95% 以上：2.3 - 2.5（封顶，避免过大）
                    const ratio = (downloadsNum - q95) / (max - q95 || 1);
                    multiplier = 2.3 + ratio * 0.2;
                }

                sizeMap.set(downloadsNum, multiplier);
            });

            return sizeMap;
        }

        // 重新计算应该显示的根节点（基于当前启用的target）
        function recalculateVisibleRoots() {
            if (!window.enabledTargets || window.enabledTargets.size === 0) {
                return [];
            }
            
            // 获取当前深度设置
            const depthInput = document.getElementById('depthInput');
            const depth = depthInput ? parseInt(depthInput.value) || 3 : 3;
            
            // 只考虑已启用的target来构建树
            const enabledTargetsArray = Array.from(window.enabledTargets);
            // 使用所有原始target作为allTargetNodes，这样未勾选的target如果出现在树中也会被标记
            const allTargetNodes = new Set(window.originalTargets || enabledTargetsArray);
            
            // 重新构建所有已启用target的树
            const tempRoots = [];
            enabledTargetsArray.forEach((target, index) => {
                const root = buildTree(target, depth, allTargetNodes);
                if (root) {
                    root.targetName = target;
                    root.isPrimaryTarget = true;
                    // 从原始root中获取颜色
                    const originalRoot = window.allOriginalRoots.find(r => r.targetName === target);
                    root.color = originalRoot ? originalRoot.color : targetColors[index % targetColors.length];
                    tempRoots.push(root);
                }
            });
            
            // 找出哪些target是其他已启用target的组成部分
            const allChildNodeNames = new Set();
            tempRoots.forEach(root => {
                function collectChildren(node) {
                    node.children.forEach(child => {
                        allChildNodeNames.add(child.name);
                        collectChildren(child);
                    });
                }
                if (root.children.length > 0) {
                    collectChildren(root);
                }
            });
            
            // 只显示那些不是其他已启用target组成部分的target作为根节点
            const visibleRoots = tempRoots.filter(root => !allChildNodeNames.has(root.name));
            
            // 标记节点角色（使用所有原始target，这样未勾选的target如果出现在树中也会被正确标记）
            markNodeRoles(visibleRoots, allTargetNodes);
            
            // 确保所有在启用列表中的节点都被标记为target
            const enabledTargetNodes = new Set(enabledTargetsArray);
            enabledTargetNodes.forEach(targetName => {
                function markInTree(node) {
                    if (node.name === targetName) {
                        node.nodeType = 'target';
                    }
                    node.children.forEach(markInTree);
                }
                visibleRoots.forEach(root => markInTree(root));
            });
            
            return visibleRoots;
        }

        // 切换目标显示
        function toggleTarget(targetName) {
            // 切换target的启用状态
            if (!window.enabledTargets) {
                window.enabledTargets = new Set();
            }
            
            // 查找对应的checkbox（因为ID可能包含特殊字符）
            const allTargets = window.allOriginalRoots || currentRoots;
            let checkbox = null;
            allTargets.forEach((root, index) => {
                if (root.targetName === targetName) {
                    const targetId = `target-${index}-${root.targetName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                    checkbox = document.getElementById(targetId);
                }
            });
            
            if (!checkbox) return;
            
            if (checkbox.checked) {
                window.enabledTargets.add(targetName);
            } else {
                window.enabledTargets.delete(targetName);
            }

            // 重新计算应该显示的根节点
            const visibleRoots = recalculateVisibleRoots();
            
            // 更新currentRoots
            currentRoots = visibleRoots;

            // 重新绘制树
            if (visibleRoots.length === 0) {
                const container = d3.select('#visualization');
                container.selectAll('*').remove();
                const legend = document.getElementById('legend');
                if (legend) {
                    legend.style.display = 'none';
                }
                const infoPanel = document.getElementById('sourceInfoPanel');
                if (infoPanel) {
                    infoPanel.style.display = 'none';
                }
                const zoomControls = document.getElementById('zoomControls');
                if (zoomControls) {
                    zoomControls.style.display = 'none';
                }
                return;
            }

            // 更新统计信息（使用已启用的target的root对象）
            const enabledRoots = window.allOriginalRoots ? window.allOriginalRoots.filter(r => window.enabledTargets.has(r.targetName)) : visibleRoots;
            const stats = calculateMultiStats(enabledRoots);
            updateStats(stats);
            
            // 更新图例
            updateLegend(visibleRoots, stats.uniqueNodes || stats.nodes);
            
            // 重新绘制树
            drawMergedTree(visibleRoots);
        }

        // 绘制融合的树形布局
        function drawMergedTree(roots, containerSelector = '#visualization') {
            const container = d3.select(containerSelector);
            
            // 根据容器选择器确定对应的控件ID
            const isIndexPage = containerSelector === '#indexLineageVisualization';
            const zoomControlsId = isIndexPage ? 'indexLineageZoomControls' : 'zoomControls';
            const legendId = isIndexPage ? 'indexLineageLegend' : 'legend';
            
            // 中断所有正在进行的 transition，避免 "transition not found" 错误
            if (currentSvg) {
                try {
                    currentSvg.interrupt();
                    currentSvg.selectAll('*').interrupt();
                } catch (e) {
                    // 忽略错误，继续执行
                }
            }
            
            container.selectAll('*').remove();

            // 动态计算容器尺寸
            const containerRect = container.node().getBoundingClientRect();
            const width = containerRect.width || Math.max(1200, window.innerWidth - 40);
            const height = Math.max(700, window.innerHeight - 180);

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background', 'transparent');

            currentSvg = svg;
            currentZoom = setupZoom(svg);

            // 添加defs用于渐变和箭头
            const defs = svg.append('defs');

            // 添加背景渐变装饰
            const bgGradient = defs.append('radialGradient')
                .attr('id', 'bgGradient')
                .attr('cx', '50%')
                .attr('cy', '50%')
                .attr('r', '70%');
            
            bgGradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', 'rgba(0, 102, 255, 0.02)')
                .attr('stop-opacity', 1);
            
            bgGradient.append('stop')
                .attr('offset', '50%')
                .attr('stop-color', 'rgba(0, 212, 255, 0.01)')
                .attr('stop-opacity', 1);
            
            bgGradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', 'rgba(255, 255, 255, 0)')
                .attr('stop-opacity', 0);

            // 添加背景矩形
            svg.append('rect')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'url(#bgGradient)')
                .attr('pointer-events', 'none');
            
            // 创建箭头标记（从源数据指向目标数据，即从子节点指向父节点）
            // 在树形结构中：source是父节点（目标），target是子节点（源数据）
            // 数据流方向：从target（源数据）流向source（目标）
            const arrowMarker = defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 8)  // 箭头在终点（指向source）
                .attr('refY', 5)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')  // 正常箭头方向
                .attr('fill', 'rgba(0, 0, 0, 0.3)')
                .attr('opacity', 0.6);

            const g = svg.append('g');

            currentG = g;

            const zoomControlsEl = document.getElementById(zoomControlsId);
            if (zoomControlsEl) {
                zoomControlsEl.style.display = 'flex';
            }

            // 构建融合的DAG图
            const { nodes, links } = buildMergedDAG(roots);

            // 转换为层次结构
            function convertToHierarchy(data) {
                const convertNode = (n) => ({
                    name: n.name,
                    depth: n.depth,
                    isLeaf: n.isLeaf,
                    nodeType: n.nodeType,  // 传递节点类型信息
                    children: n.children && n.children.length > 0 ? n.children.map(convertNode) : undefined
                });
                return d3.hierarchy(convertNode(data));
            }

            // 如果有多个根，创建虚拟根节点
            let rootNode;
            if (roots.length === 1) {
                rootNode = convertToHierarchy(roots[0]);
            } else {
                const virtualRoot = {
                    name: 'virtual-root',
                    children: roots.map(r => ({
                        name: r.name,
                        children: r.children,
                        depth: 0,
                        isLeaf: false,
                        nodeType: r.nodeType || 'target'  // 确保复制 nodeType
                    }))
                };
                rootNode = convertToHierarchy(virtualRoot);
            }

            // 先用临时布局计算节点数量和深度，以便计算缩放因子
            const tempTreeLayout = d3.tree()
                .size([height - 80, width - 160])
                .separation((a, b) => 1.5); // 临时使用固定间距
            
            const tempTreeNodes = tempTreeLayout(rootNode);
            const tempNodesArray = tempTreeNodes.descendants();
            const actualNodes = tempNodesArray.filter(d => d.data.name !== 'virtual-root');
            const nodeCount = actualNodes.length;
            const maxDepthInTree = d3.max(tempNodesArray, d => d.depth) || 1;

            // 计算动态缩放因子
            const nodeSizeScale = calculateNodeSizeScale(nodeCount);
            const separationScale = calculateSeparationScale(nodeCount, maxDepthInTree);

            // 预计算所有节点的大小映射
            const sizeMap = precalculateNodeSizes(actualNodes.map(n => ({ name: n.data.name })));

            // 使用调整后的树布局（应用间距缩放）
            const treeLayout = d3.tree()
                .size([height - 80, width - 160])
                .separation((a, b) => {
                    const baseSeparation = 1.5;
                    const depthFactor = Math.max(0.8, 1.2 - (a.depth || 0) * 0.1);
                    const textLengthFactor = Math.max(1, (a.data.name.length + b.data.name.length) / 40);
                    // 应用间距缩放因子
                    return baseSeparation * depthFactor * textLengthFactor * separationScale;
                });

            // 使用调整后的布局重新计算
            const treeNodes = treeLayout(rootNode);
            const nodes_array = treeNodes.descendants();
            const links_array = treeNodes.links();

            // 分层布局
            const baseColumnGap = (width - 160) / (maxDepthInTree + 1);
            // 根据节点数量和间距缩放因子调整弧度幅度
            const maxArcAmplitude = Math.min(140 * separationScale, baseColumnGap * 0.5 * separationScale);

            const layerMap = d3.group(nodes_array, d => d.depth);
            layerMap.forEach((arr, depth) => {
                const nonLeaf = arr.filter(n => !n.data.isLeaf && n.data.name !== 'virtual-root');
                const leaf = arr.filter(n => n.data.isLeaf || n.data.name === 'virtual-root');
                const sortedLeavesTop = leaf.filter((_, i) => i % 2 === 0).sort((a, b) => a.x - b.x);
                const sortedLeavesBottom = leaf.filter((_, i) => i % 2 === 1).sort((a, b) => a.x - b.x);
                const sorted = [...sortedLeavesTop, ...nonLeaf, ...sortedLeavesBottom];

                const n = sorted.length;
                sorted.forEach((d, i) => {
                    const t = n === 1 ? 0 : (i - (n - 1) / 2) / ((n - 1) / 2);
                    const emphasisNonLeaf = d.data.name !== 'virtual-root' && !d.data.isLeaf ? 1.0 : 0.8;
                    const amplitude = maxArcAmplitude * emphasisNonLeaf;
                    const dx = amplitude * (1 - Math.abs(t)) ** 1.5;
                    d.screenX = d.y + dx;
                    d.screenY = d.x;
                });
            });

            // 为每个连接线创建唯一的渐变ID
            let gradientCounter = 0;
            const getGradientId = () => `linkGradient-${gradientCounter++}`;

            // 为每条连接线创建渐变
            links_array.forEach((link, index) => {
                const sourceNode = link.source;
                const targetNode = link.target;
                
                // 获取源节点和目标节点的颜色
                let sourceColor = 'rgba(0, 0, 0, 0.2)';
                let targetColor = 'rgba(0, 0, 0, 0.3)';
                
                if (sourceNode.data.nodeType === 'target') {
                    // 检查该target是否被勾选（启用）
                    const isEnabled = window.enabledTargets && window.enabledTargets.has(sourceNode.data.name);
                    if (isEnabled) {
                        const root = roots.find(r => r.targetName === sourceNode.data.name);
                        sourceColor = root ? root.color : nodeTypeColors.target.primary;
                    } else {
                        sourceColor = nodeTypeColors.intermediate.primary;
                    }
                } else if (sourceNode.data.nodeType === 'intermediate') {
                    sourceColor = nodeTypeColors.intermediate.primary;
                } else {
                    sourceColor = nodeTypeColors.leaf.primary;
                }
                
                if (targetNode.data.nodeType === 'target') {
                    // 检查该target是否被勾选（启用）
                    const isEnabled = window.enabledTargets && window.enabledTargets.has(targetNode.data.name);
                    if (isEnabled) {
                        const root = roots.find(r => r.targetName === targetNode.data.name);
                        targetColor = root ? root.color : nodeTypeColors.target.primary;
                    } else {
                        targetColor = nodeTypeColors.intermediate.primary;
                    }
                } else if (targetNode.data.nodeType === 'intermediate') {
                    targetColor = nodeTypeColors.intermediate.primary;
                } else {
                    targetColor = nodeTypeColors.leaf.primary;
                }
                
                // 创建线性渐变
                const gradientId = getGradientId();
                const gradient = defs.append('linearGradient')
                    .attr('id', gradientId)
                    .attr('gradientUnits', 'userSpaceOnUse')
                    .attr('x1', sourceNode.screenX)
                    .attr('y1', sourceNode.screenY)
                    .attr('x2', targetNode.screenX)
                    .attr('y2', targetNode.screenY);
                
                gradient.append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', sourceColor)
                    .attr('stop-opacity', 0.4);
                
                gradient.append('stop')
                    .attr('offset', '50%')
                    .attr('stop-color', targetColor)
                    .attr('stop-opacity', 0.5);
                
                gradient.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', targetColor)
                    .attr('stop-opacity', 0.3);
                
                link.gradientId = gradientId;
            });

            // 绘制连接线（使用贝塞尔曲线）
            const linkElements = g.selectAll('.link')
                .data(links_array)
                .enter().append('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', d => `url(#${d.gradientId})`)
                .attr('stroke-width', d => {
                    // 根据深度调整粗细
                    const depth = Math.min(d.source.depth, d.target.depth);
                    return 1.5 + (1 - depth * 0.1) * 1.5; // 1.5px - 3px
                })
                .attr('opacity', 0)  // 初始透明，用于动画
                .attr('marker-end', 'url(#arrowhead)')  // 箭头在终点，指向source（目标）
                .attr('data-source', d => d.source.data.name)
                .attr('data-target', d => d.target.data.name)
                .attr('d', d => {
                    // 使用贝塞尔曲线（二次贝塞尔曲线）
                    // 注意：在树形结构中，source是父节点（目标），target是子节点（源数据）
                    // 数据流从target（源数据）流向source（目标），所以路径从target到source
                    const dx = d.source.screenX - d.target.screenX;
                    const dy = d.source.screenY - d.target.screenY;
                    const midX = (d.target.screenX + d.source.screenX) / 2;
                    const midY = (d.target.screenY + d.source.screenY) / 2;
                    // 控制点偏移，使曲线更平滑
                    const curvature = 0.4;
                    const controlX = midX;
                    const controlY = midY - Math.abs(dx) * curvature;
                    // 路径从target（源数据）到source（目标），箭头在终点指向source
                    return `M${d.target.screenX},${d.target.screenY} Q${controlX},${controlY} ${d.source.screenX},${d.source.screenY}`;
                })
                .transition()
                .delay((d, i) => {
                    // 按深度延迟，浅层先显示
                    const depth = Math.min(d.source.depth, d.target.depth);
                    return depth * 50 + i * 5;
                })
                .duration(400)
                .attr('opacity', d => {
                    // 根据深度调整透明度
                    const depth = Math.min(d.source.depth, d.target.depth);
                    return 0.3 + (1 - depth * 0.1) * 0.3; // 0.3 - 0.6
                });

            // 为节点创建径向渐变（先创建所有渐变）
            let nodeGradientCounter = 0;
            const getNodeGradientId = (nodeType, color) => {
                const baseId = `nodeGradient-${nodeType}-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
                return baseId + (nodeGradientCounter++);
            };

            // 预计算所有节点的渐变
            nodes_array.filter(d => d.data.name !== 'virtual-root').forEach(d => {
                // 智能计算节点大小（基于下载量）
                const info = dataInfo[d.data.name];
                const downloads = info ? info.downloads : null;
                const baseSize = d.depth === 1 ? 20 : (d.data.isLeaf ? 12 : 16);

                // 使用智能大小计算算法
                d.size = calculateNodeSize(downloads, d.data.nodeType, sizeMap);

                // 确保大小在合理范围内
                d.size = Math.max(baseSize * 0.7, Math.min(d.size, baseSize * 2.5));

                // 为没有下载量的节点使用默认值
                if (!downloads || downloads === 0) {
                    d.size = baseSize;
                }

                // 应用基于节点数量的动态缩放因子
                d.size = d.size * nodeSizeScale;

                // 获取节点颜色
                let nodeColor = '';
                if (d.data.nodeType === 'target') {
                    // 检查该target是否被勾选（启用）
                    const isEnabled = window.enabledTargets && window.enabledTargets.has(d.data.name);
                    
                    if (isEnabled) {
                        // 如果勾选了，使用target的颜色
                        const root = roots.find(r => r.targetName === d.data.name);
                        if (root) {
                            nodeColor = root.color;
                        } else {
                            const originalTargets = window.originalTargets || [];
                            const targetIndex = originalTargets.indexOf(d.data.name);
                            nodeColor = targetIndex >= 0 ? targetColors[targetIndex % targetColors.length] : nodeTypeColors.target.primary;
                        }
                    } else {
                        // 如果未勾选，视为普通source data（intermediate）
                        nodeColor = nodeTypeColors.intermediate.primary;
                    }
                } else if (d.data.nodeType === 'intermediate') {
                    nodeColor = nodeTypeColors.intermediate.primary;
                } else {
                    nodeColor = nodeTypeColors.leaf.primary;
                }

                // 创建径向渐变
                const gradientId = getNodeGradientId(d.data.nodeType, nodeColor);
                const radialGradient = defs.append('radialGradient')
                    .attr('id', gradientId)
                    .attr('cx', '30%')
                    .attr('cy', '30%')
                    .attr('r', '70%');

                // 将颜色转换为RGB以便调整亮度
                const hexToRgb = (hex) => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                    } : null;
                };

                const rgb = hexToRgb(nodeColor);
                if (rgb) {
                    // 中心亮色（更亮30%）
                    const lightR = Math.min(255, Math.floor(rgb.r * 1.3));
                    const lightG = Math.min(255, Math.floor(rgb.g * 1.3));
                    const lightB = Math.min(255, Math.floor(rgb.b * 1.3));
                    const lightColor = `rgb(${lightR}, ${lightG}, ${lightB})`;

                    // 边缘暗色（更暗20%）
                    const darkR = Math.max(0, Math.floor(rgb.r * 0.8));
                    const darkG = Math.max(0, Math.floor(rgb.g * 0.8));
                    const darkB = Math.max(0, Math.floor(rgb.b * 0.8));
                    const darkColor = `rgb(${darkR}, ${darkG}, ${darkB})`;

                    radialGradient.append('stop')
                        .attr('offset', '0%')
                        .attr('stop-color', lightColor)
                        .attr('stop-opacity', 1);

                    radialGradient.append('stop')
                        .attr('offset', '70%')
                        .attr('stop-color', nodeColor)
                        .attr('stop-opacity', 1);

                    radialGradient.append('stop')
                        .attr('offset', '100%')
                        .attr('stop-color', darkColor)
                        .attr('stop-opacity', 1);
                } else {
                    // 如果无法解析颜色，使用原色
                    radialGradient.append('stop')
                        .attr('offset', '0%')
                        .attr('stop-color', nodeColor)
                        .attr('stop-opacity', 1);
                    radialGradient.append('stop')
                        .attr('offset', '100%')
                        .attr('stop-color', nodeColor)
                        .attr('stop-opacity', 0.8);
                }

                d.gradientId = gradientId;
            });

            // 创建拖拽行为
            const drag = d3.drag()
                .filter(function(event) {
                    // 允许拖拽，但阻止在节点上触发zoom
                    // 只允许左键拖拽，不允许Ctrl+拖拽或中键拖拽
                    return !event.ctrlKey && event.button === 0;
                })
                .on('start', function(event, d) {
                    // 阻止事件传播，防止触发SVG的zoom
                    if (event.sourceEvent) {
                        event.sourceEvent.stopPropagation();
                        event.sourceEvent.preventDefault();
                    }
                    
                    // 标记开始拖拽
                    d.wasDragged = false;
                    d.dragStartX = event.x;
                    d.dragStartY = event.y;
                    
                    // 获取当前zoom变换下的坐标
                    const [x, y] = d3.pointer(event, g.node());
                    
                    // 计算偏移量
                    d.dragOffsetX = d.screenX - x;
                    d.dragOffsetY = d.screenY - y;
                    
                    d3.select(this).raise().style('cursor', 'grabbing');
                })
                .on('drag', function(event, d) {
                    // 阻止事件传播
                    if (event.sourceEvent) {
                        event.sourceEvent.stopPropagation();
                        event.sourceEvent.preventDefault();
                    }
                    
                    // 标记正在拖拽
                    const dragDistance = Math.sqrt(
                        Math.pow(event.x - (d.dragStartX || event.x), 2) + 
                        Math.pow(event.y - (d.dragStartY || event.y), 2)
                    );
                    if (dragDistance > 3) {  // 如果移动距离超过3px，认为是拖拽
                        d.wasDragged = true;
                    }
                    
                    // 获取当前zoom变换下的坐标
                    const [x, y] = d3.pointer(event, g.node());
                    
                    // 更新节点位置
                    d.screenX = x + (d.dragOffsetX || 0);
                    d.screenY = y + (d.dragOffsetY || 0);
                    
                    // 更新节点位置和连接线
                    d3.select(this).attr('transform', `translate(${d.screenX},${d.screenY})`);
                    updateNodePositions();
                })
                .on('end', function(event, d) {
                    // 阻止事件传播
                    if (event.sourceEvent) {
                        event.sourceEvent.stopPropagation();
                    }
                    
                    d.dragOffsetX = null;
                    d.dragOffsetY = null;
                    d3.select(this).style('cursor', 'grab');
                });

            // 绘制节点
            const nodeElements = g.selectAll('.node')
                .data(nodes_array.filter(d => d.data.name !== 'virtual-root'))
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${d.screenX},${d.screenY})`)
                .attr('opacity', 0)  // 初始透明，用于动画
                .style('cursor', 'grab')  // 添加鼠标样式提示
                .call(drag);

            // 添加所有子元素
            nodeElements.append('circle')
                .attr('r', d => d.size)
                .attr('fill', d => `url(#${d.gradientId})`)
                .attr('stroke', d => {
                    // 检查target是否被勾选
                    const isTargetEnabled = d.data.nodeType === 'target' && window.enabledTargets && window.enabledTargets.has(d.data.name);
                    
                    // 目标节点（已勾选）：白色描边
                    if (isTargetEnabled) return '#ffffff';
                    // 叶子节点：橙色描边
                    if (d.data.nodeType === 'leaf') return nodeTypeColors.leaf.stroke;
                    // 中间节点或未勾选的target：白色描边
                    return 'rgba(255, 255, 255, 0.9)';
                })
                .attr('stroke-width', d => {
                    // 检查target是否被勾选
                    const isTargetEnabled = d.data.nodeType === 'target' && window.enabledTargets && window.enabledTargets.has(d.data.name);
                    
                    // 目标节点（已勾选）：3px
                    if (isTargetEnabled) return 3;
                    // 叶子节点：1.5px
                    if (d.data.nodeType === 'leaf') return 1.5;
                    // 中间节点或未勾选的target：2.5px
                    return 2.5;
                })
                .attr('filter', d => {
                    // 检查target是否被勾选
                    const isTargetEnabled = d.data.nodeType === 'target' && window.enabledTargets && window.enabledTargets.has(d.data.name);
                    
                    // 目标节点（已勾选）：多层目标颜色发光
                    if (isTargetEnabled) {
                        const root = roots.find(r => r.targetName === d.data.name);
                        let color;
                        if (root) {
                            color = root.color;
                        } else {
                            const originalTargets = window.originalTargets || [];
                            const targetIndex = originalTargets.indexOf(d.data.name);
                            color = targetIndex >= 0 ? targetColors[targetIndex % targetColors.length] : nodeTypeColors.target.primary;
                        }
                        // 多层阴影：内层强光 + 中层扩散 + 外层环境光
                        return `drop-shadow(0 0 4px ${color}60) drop-shadow(0 0 8px ${color}40) drop-shadow(0 0 16px ${color}25) drop-shadow(0 0 24px ${color}15)`;
                    }
                    // 叶子节点：多层橙色发光
                    if (d.data.nodeType === 'leaf') {
                        return `drop-shadow(0 0 3px ${nodeTypeColors.leaf.glow}) drop-shadow(0 0 6px ${nodeTypeColors.leaf.glow}80) drop-shadow(0 0 12px ${nodeTypeColors.leaf.glow}50)`;
                    }
                    // 中间节点或未勾选的target：多层绿色发光
                    return `drop-shadow(0 0 4px ${nodeTypeColors.intermediate.glow}) drop-shadow(0 0 8px ${nodeTypeColors.intermediate.glow}80) drop-shadow(0 0 14px ${nodeTypeColors.intermediate.glow}50)`;
                });

            // 为文字添加背景框
            nodeElements.append('rect')
                .attr('class', 'text-bg')
                .attr('x', d => {
                    const text = d.data.name.length > (d.depth === 1 ? 35 : 30) 
                        ? d.data.name.substring(0, d.depth === 1 ? 35 : 30) + '...' 
                        : d.data.name;
                    const fontSize = d.depth === 1 ? 13 : 12;
                    const textWidth = text.length * fontSize * 0.6;
                    return -textWidth / 2 - 4;
                })
                .attr('y', d => {
                    const dy = d.depth === 1 ? 28 : (d.data.isLeaf ? 22 : 26);
                    return dy - 10;
                })
                .attr('width', d => {
                    const text = d.data.name.length > (d.depth === 1 ? 35 : 30) 
                        ? d.data.name.substring(0, d.depth === 1 ? 35 : 30) + '...' 
                        : d.data.name;
                    const fontSize = d.depth === 1 ? 13 : 12;
                    const textWidth = text.length * fontSize * 0.6;
                    return textWidth + 8;
                })
                .attr('height', d => {
                    return d.depth === 1 ? 18 : 16;
                })
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('fill', 'rgba(255, 255, 255, 0.85)')
                .attr('stroke', 'rgba(0, 0, 0, 0.08)')
                .attr('stroke-width', 0.5)
                .attr('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))');

            nodeElements.append('text')
                .attr('dy', d => {
                    if (d.depth === 1) return 28;
                    if (d.data.isLeaf) return 22;
                    return 26;
                })
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('font-size', d => {
                    if (d.depth === 1) return '13px';
                    if (d.data.isLeaf) return '12px';
                    return '12px';
                })
                .attr('fill', '#1d1d1f')  // 使用深灰色文字，更易读
                .attr('font-weight', d => {
                    if (d.depth === 1) return 700;
                    if (d.data.isLeaf) return 600;
                    return 600;
                })
                .attr('paint-order', 'stroke')
                .attr('stroke', 'none')  // 移除描边，因为已有背景框
                .attr('stroke-width', 0)
                .attr('style', 'text-rendering: geometricPrecision;')  // 优化文字渲染
                .text(d => {
                    const maxLength = d.depth === 1 ? 35 : 30;
                    return d.data.name.length > maxLength ? d.data.name.substring(0, maxLength) + '...' : d.data.name;
                });

            // 执行节点动画
            nodeElements
                .transition()
                .delay((d, i) => {
                    // 按深度延迟，浅层先显示
                    return d.depth * 80 + i * 10;
                })
                .duration(500)
                .attr('opacity', 1);

            nodeElements
                .on('mouseover', function(event, d) {
                    const tooltip = d3.select('#tooltip');

                    // 增强悬停效果
                    const circle = d3.select(this).select('circle');
                    if (circle && circle.size() > 0) {
                        try {
                            // 先中断之前的 transition（如果方法存在）
                            if (typeof circle.interrupt === 'function') {
                                circle.interrupt();
                            }
                            circle.transition()
                                .duration(200)
                                .attr('r', () => {
                                    // 根据 nodeType 决定放大倍数
                                    if (d.data.nodeType === 'target') return d.size * 1.25;
                                    if (d.data.nodeType === 'leaf') return d.size * 1.2;
                                    return d.size * 1.15;
                                })
                                .attr('stroke-width', () => {
                                    // 根据 nodeType 决定描边宽度
                                    if (d.data.nodeType === 'target') return 4;
                                    if (d.data.nodeType === 'leaf') return 2;
                                    return 3;
                                });
                        } catch (e) {
                            console.warn('Circle transition failed:', e);
                        }
                    }

                    // 路径高亮：高亮与当前节点相关的连接线
                    const nodeName = d.data.name;
                    // 重新获取 linkElements selection，避免使用闭包中可能失效的变量
                    const currentLinkElements = currentG ? currentG.selectAll('.link') : null;
                    if (currentLinkElements && currentLinkElements.size() > 0) {
                        try {
                            // 先中断之前的 transition
                            currentLinkElements.interrupt();
                            currentLinkElements
                                .transition()
                                .duration(200)
                                .attr('opacity', link => {
                            // 如果连接线与当前节点相关，保持或增强不透明度
                            if (link.source.data.name === nodeName || link.target.data.name === nodeName) {
                                const depth = Math.min(link.source.depth, link.target.depth);
                                return Math.min(0.9, 0.5 + (1 - depth * 0.1) * 0.4);
                            }
                            // 其他连接线淡出
                            return 0.1;
                        })
                        .attr('stroke-width', link => {
                            // 相关连接线加粗
                            if (link.source.data.name === nodeName || link.target.data.name === nodeName) {
                                const depth = Math.min(link.source.depth, link.target.depth);
                                return (1.5 + (1 - depth * 0.1) * 1.5) * 1.5;
                            }
                            return 1.5 + (1 - Math.min(link.source.depth, link.target.depth) * 0.1) * 1.5;
                        });
                        } catch (e) {
                            console.warn('Link transition failed:', e);
                        }
                    }

                    // 其他节点淡出
                    // 重新获取 nodeElements selection，避免使用闭包中可能失效的变量
                    const currentNodeElements = currentG ? currentG.selectAll('.node') : null;
                    if (currentNodeElements && currentNodeElements.size() > 0) {
                        try {
                            // 先中断之前的 transition
                            currentNodeElements.interrupt();
                            currentNodeElements
                                .transition()
                                .duration(200)
                                .attr('opacity', node => {
                                    // 当前节点和直接连接的节点保持不透明
                                    if (node.data.name === nodeName) return 1;
                                    // 检查是否有连接线连接到当前节点
                                    const hasConnection = links_array.some(link => 
                                        (link.source.data.name === nodeName && link.target.data.name === node.data.name) ||
                                        (link.target.data.name === nodeName && link.source.data.name === node.data.name)
                                    );
                                    return hasConnection ? 1 : 0.3;
                                });
                        } catch (e) {
                            console.warn('Node transition failed:', e);
                        }
                    }

                    // 根据 nodeType 决定发光效果（悬停时增强）
                    if (d.data.nodeType === 'target') {
                        const root = roots.find(r => r.targetName === d.data.name);
                        let color;
                        if (root) {
                            color = root.color;
                        } else {
                            const originalTargets = window.originalTargets || [];
                            const targetIndex = originalTargets.indexOf(d.data.name);
                            color = targetIndex >= 0 ? targetColors[targetIndex % targetColors.length] : nodeTypeColors.target.primary;
                        }
                        // 悬停时增强发光效果
                        circle.attr('filter', `drop-shadow(0 0 6px ${color}80) drop-shadow(0 0 12px ${color}60) drop-shadow(0 0 20px ${color}40) drop-shadow(0 0 30px ${color}25)`);
                    } else if (d.data.nodeType === 'leaf') {
                        circle.attr('filter', `drop-shadow(0 0 5px ${nodeTypeColors.leaf.glow}) drop-shadow(0 0 10px ${nodeTypeColors.leaf.glow}90) drop-shadow(0 0 18px ${nodeTypeColors.leaf.glow}60)`);
                    } else {
                        circle.attr('filter', `drop-shadow(0 0 6px ${nodeTypeColors.intermediate.glow}) drop-shadow(0 0 12px ${nodeTypeColors.intermediate.glow}90) drop-shadow(0 0 20px ${nodeTypeColors.intermediate.glow}60)`);
                    }

                    // 显示工具提示
                    let content = `<strong>${d.data.name}</strong><br>`;

                    // 获取下载量信息
                    const info = dataInfo[d.data.name];
                    const downloads = info ? info.downloads : null;

                    if (downloads && downloads > 0) {
                        let downloadsText = '';
                        if (downloads >= 1000000) {
                            downloadsText = `${(downloads / 1000000).toFixed(1)}M`;
                        } else if (downloads >= 1000) {
                            downloadsText = `${(downloads / 1000).toFixed(1)}k`;
                        } else {
                            downloadsText = downloads.toLocaleString();
                        }
                        content += `<span style="font-size: 12px; opacity: 0.7;">📥 ${t('genealogy_downloadsTooltip')}${downloadsText}</span><br>`;
                    }

                    content += `<span style="font-size: 12px; opacity: 0.7;">${t('genealogy_depthLabel')}${d.depth}`;
                    if (d.data.nodeType === 'target') {
                        content += ` • ${t('genealogy_targetNodeType')}`;
                    } else if (d.data.nodeType === 'intermediate') {
                        content += ' • 中间数据集';
                    } else {
                        content += ' • 基础数据源';
                    }
                    content += '</span>';

                    tooltip.style('display', 'block')
                        .html(content)
                        .style('left', (event.pageX + 12) + 'px')
                        .style('top', (event.pageY - 12) + 'px')
                        .style('opacity', 0);
                    if (tooltip && tooltip.size() > 0) {
                        try {
                            // 先中断之前的 transition（如果方法存在）
                            if (typeof tooltip.interrupt === 'function') {
                                tooltip.interrupt();
                            }
                            tooltip.transition()
                                .duration(200)
                                .style('opacity', 1);
                        } catch (e) {
                            console.warn('Tooltip transition failed:', e);
                            tooltip.style('opacity', 1);
                        }
                    }

                    d3.select(this).raise();
                })
                .on('mouseout', function(event, d) {
                    const tooltip = d3.select('#tooltip');

                    // 恢复原始状态
                    const circle = d3.select(this).select('circle');
                    if (circle && circle.size() > 0) {
                        try {
                            // 先中断之前的 transition（如果方法存在）
                            if (typeof circle.interrupt === 'function') {
                                circle.interrupt();
                            }
                            circle.transition()
                                .duration(200)
                                .attr('r', d.size)
                                .attr('stroke-width', () => {
                                    // 根据 nodeType 决定描边宽度
                                    if (d.data.nodeType === 'target') return 3;
                                    if (d.data.nodeType === 'leaf') return 1.5;
                                    return 2.5;
                                })
                                .attr('filter', () => {
                                    // 根据 nodeType 决定发光效果（恢复原始多层阴影）
                                    if (d.data.nodeType === 'target') {
                                        const root = roots.find(r => r.targetName === d.data.name);
                                        let color;
                                        if (root) {
                                            color = root.color;
                                        } else {
                                            const originalTargets = window.originalTargets || [];
                                            const targetIndex = originalTargets.indexOf(d.data.name);
                                            color = targetIndex >= 0 ? targetColors[targetIndex % targetColors.length] : nodeTypeColors.target.primary;
                                        }
                                        return `drop-shadow(0 0 4px ${color}60) drop-shadow(0 0 8px ${color}40) drop-shadow(0 0 16px ${color}25) drop-shadow(0 0 24px ${color}15)`;
                                    }
                                    if (d.data.nodeType === 'leaf') {
                                        return `drop-shadow(0 0 3px ${nodeTypeColors.leaf.glow}) drop-shadow(0 0 6px ${nodeTypeColors.leaf.glow}80) drop-shadow(0 0 12px ${nodeTypeColors.leaf.glow}50)`;
                                    }
                                    return `drop-shadow(0 0 4px ${nodeTypeColors.intermediate.glow}) drop-shadow(0 0 8px ${nodeTypeColors.intermediate.glow}80) drop-shadow(0 0 14px ${nodeTypeColors.intermediate.glow}50)`;
                                });
                        } catch (e) {
                            console.warn('Circle transition failed:', e);
                        }
                    }

                    // 恢复所有连接线的原始状态
                    // 重新获取 linkElements selection，避免使用闭包中可能失效的变量
                    const currentLinkElements = currentG ? currentG.selectAll('.link') : null;
                    if (currentLinkElements && currentLinkElements.size() > 0) {
                        try {
                            // 先中断之前的 transition
                            currentLinkElements.interrupt();
                            currentLinkElements
                                .transition()
                                .duration(200)
                                .attr('opacity', link => {
                                    const depth = Math.min(link.source.depth, link.target.depth);
                                    return 0.3 + (1 - depth * 0.1) * 0.3;
                                })
                                .attr('stroke-width', link => {
                                    const depth = Math.min(link.source.depth, link.target.depth);
                                    return 1.5 + (1 - depth * 0.1) * 1.5;
                                });
                        } catch (e) {
                            console.warn('Link transition failed:', e);
                        }
                    }

                    // 恢复所有节点的原始状态
                    // 重新获取 nodeElements selection，避免使用闭包中可能失效的变量
                    const currentNodeElements = currentG ? currentG.selectAll('.node') : null;
                    if (currentNodeElements && currentNodeElements.size() > 0) {
                        try {
                            // 先中断之前的 transition
                            currentNodeElements.interrupt();
                            currentNodeElements
                                .transition()
                                .duration(200)
                                .attr('opacity', 1);
                        } catch (e) {
                            console.warn('Node transition failed:', e);
                        }
                    }

                    if (tooltip && tooltip.size() > 0) {
                        try {
                            // 先中断之前的 transition（如果方法存在）
                            if (typeof tooltip.interrupt === 'function') {
                                tooltip.interrupt();
                            }
                            tooltip.transition()
                                .duration(200)
                                .style('opacity', 0)
                                .on('end', () => tooltip.style('display', 'none'));
                        } catch (e) {
                            console.warn('Tooltip transition failed:', e);
                            tooltip.style('display', 'none');
                        }
                    }
                })
                .on('click', function(event, d) {
                    // 只有在没有拖拽的情况下才显示卡片（避免拖拽后触发点击）
                    if (!d.wasDragged) {
                    showDatasetCard(d.data.name, event);
                    }
                    d.wasDragged = false;
                });


            function updateNodePositions() {
                // 更新连接线为曲线路径（从target到source）
                linkElements.each(function(d) {
                    const link = d3.select(this);
                    
                    // 更新连接线路径
                    const dx = d.source.screenX - d.target.screenX;
                    const dy = d.source.screenY - d.target.screenY;
                    const midX = (d.target.screenX + d.source.screenX) / 2;
                    const midY = (d.target.screenY + d.source.screenY) / 2;
                    const curvature = 0.4;
                    const controlX = midX;
                    const controlY = midY - Math.abs(dx) * curvature;
                    // 路径从target（源数据）到source（目标）
                    const path = `M${d.target.screenX},${d.target.screenY} Q${controlX},${controlY} ${d.source.screenX},${d.source.screenY}`;
                    link.attr('d', path);
                    
                    // 更新渐变位置（如果使用userSpaceOnUse，需要更新渐变坐标）
                    if (d.gradientId) {
                        const gradient = defs.select(`#${d.gradientId}`);
                        if (!gradient.empty()) {
                            gradient
                                .attr('x1', d.target.screenX)
                                .attr('y1', d.target.screenY)
                                .attr('x2', d.source.screenX)
                                .attr('y2', d.source.screenY);
                        }
                    }
                });
                
                // 更新节点位置
                nodeElements.attr('transform', d => `translate(${d.screenX},${d.screenY})`);
            }

            // 自动缩放以适应所有节点
            autoFitToView();

            updateLegend(roots, nodes_array.filter(d => d.data.name !== 'virtual-root').length);

            // 自动缩放函数：确保所有节点都在视野中
            function autoFitToView() {
                // 计算所有节点的边界框
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                nodes_array.forEach(d => {
                    // 计算节点实际占用空间（考虑文字）
                    const textLength = d.data.name.length;
                    const textOffset = textLength > 30 ? 120 : 100;
                    const radius = d.size || 16;

                    minX = Math.min(minX, d.screenX - textOffset);
                    maxX = Math.max(maxX, d.screenX + textOffset);
                    minY = Math.min(minY, d.screenY - radius - 20);
                    maxY = Math.max(maxY, d.screenY + radius + 40);
                });

                // 添加边距（与treeLayout的边距保持一致）
                const padding = 80;
                minX = 40;
                maxX = width - 200;
                minY -= padding;
                minY = Math.max(40, minY);
                maxY += padding;
                maxY = Math.min(height - 120, maxY);

                // 计算内容尺寸
                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;

                // 计算可用的 SVG 尺寸
                const availableWidth = width - 80;
                const availableHeight = height - 80;

                // 计算缩放比例（确保内容适应窗口，最大为1，最小为0.1）
                const scaleX = availableWidth / contentWidth;
                const scaleY = availableHeight / contentHeight;
                const scale = Math.max(0.1, Math.min(scaleX, scaleY, 1));

                // 计算居中偏移
                const scaledContentWidth = contentWidth * scale;
                const scaledContentHeight = contentHeight * scale;
                const translateX = (width - scaledContentWidth) / 2 - minX * scale;
                const translateY = (height - scaledContentHeight) / 2 - minY * scale;

                // 应用变换
                const transform = d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(scale);

                // 应用到SVG
                if (svg && svg.node() && currentZoom) {
                    try {
                        svg.transition()
                            .duration(750)
                            .call(currentZoom.transform, transform);
                    } catch (e) {
                        // 如果 transition 失败，直接应用 transform
                        console.warn('Transform transition failed, applying directly:', e);
                        currentZoom.transform(svg, transform);
                    }
                }
            }
        }

        // 构建融合的DAG图
        function buildMergedDAG(roots) {
            const nodeMap = new Map();
            const linkSet = new Set();

            roots.forEach(root => {
                function traverse(node, depth = 0) {
                    const nodeKey = node.name;

                    if (!nodeMap.has(nodeKey)) {
                        nodeMap.set(nodeKey, {
                            name: node.name,
                            depth: depth,
                            isLeaf: node.isLeaf,
                            sourceTargets: []
                        });
                    }

                    const nodeData = nodeMap.get(nodeKey);
                    if (!nodeData.sourceTargets.includes(root.targetName)) {
                        nodeData.sourceTargets.push(root.targetName);
                    }

                    node.children.forEach(child => {
                        const childKey = child.name;
                        linkSet.add(`${nodeKey}->${childKey}`);
                        traverse(child, depth + 1);
                    });
                }

                traverse(root, 0);
            });

            const nodes = Array.from(nodeMap.values()).map((data, i) => ({
                id: data.name,
                name: data.name,
                depth: data.depth,
                isLeaf: data.isLeaf,
                sourceTargets: data.sourceTargets
            }));

            const links = Array.from(linkSet).map(linkStr => {
                const [source, target] = linkStr.split('->');
                const sourceNode = nodes.find(n => n.id === source);
                const targetNode = nodes.find(n => n.id === target);
                return { source: sourceNode, target: targetNode };
            }).filter(l => l.source && l.target);

            return { nodes, links };
        }

        // 更新图例
        function updateLegend(roots, nodeCount, legendSelector = '#legend') {
            const legend = document.querySelector(legendSelector);
            if (!legend) return;
            legend.style.display = 'block';

            let html = `<div style="font-weight: 600; margin-bottom: 12px; color: #1d1d1f; font-size: 14px;">${t('genealogy_legendTitle')}</div>`;

            html += '<div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.06);">';
            html += `<div class="legend-item">
                <div class="legend-color" style="background: ${nodeTypeColors.intermediate.primary}; box-shadow: 0 0 8px ${nodeTypeColors.intermediate.glow};"></div>
                <span style="font-size: 13px;">${t('genealogy_intermediateDataset')}</span>
            </div>`;
            html += `<div class="legend-item">
                <div class="legend-color" style="background: ${nodeTypeColors.leaf.primary}; border: 2px solid ${nodeTypeColors.leaf.stroke};"></div>
                <span style="font-size: 13px;">${t('genealogy_baseDataSource')}</span>
            </div>`;
            html += '</div>';

            html += `<div style="font-size: 13px; color: #86868b; margin-bottom: 8px; font-weight: 500;">${t('genealogy_targetDatasetsLabel')}</div>`;
            // 只显示已启用的target
            const enabledTargets = window.enabledTargets ? Array.from(window.enabledTargets) : (window.originalTargets || roots.map(r => r.targetName));
            enabledTargets.forEach((targetName, index) => {
                // 查找对应的 root 节点以获取颜色
                const root = roots.find(r => r.targetName === targetName);
                // 如果找不到，从allOriginalRoots中查找
                const originalRoot = !root && window.allOriginalRoots ? window.allOriginalRoots.find(r => r.targetName === targetName) : null;
                const color = root ? root.color : (originalRoot ? originalRoot.color : targetColors[index % targetColors.length]);
                html += `<div class="legend-item">
                    <div class="legend-color" style="background: ${color}; box-shadow: 0 0 8px ${color}40;"></div>
                    <span style="font-size: 13px;">${targetName}</span>
                </div>`;
            });

            html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.06); font-size: 12px; color: #86868b;">
                <span style="font-weight: 500;">${t('genealogy_currentDisplay')}</span> ${nodeCount}${t('genealogy_nodes')}
            </div>`;

            legend.innerHTML = html;
            
            // 更新图例后，定位信息面板
            positionSourceInfoPanel();
            
            // 更新信息面板内容
            updateSourceInfoPanel(roots);
        }

        // 定位信息面板（使其位于图例下方）
        function positionSourceInfoPanel() {
            const legend = document.getElementById('legend');
            const infoPanel = document.getElementById('sourceInfoPanel');
            
            if (!legend || !infoPanel) return;
            
            // 如果图例隐藏，也隐藏信息面板
            if (legend.style.display === 'none' || window.getComputedStyle(legend).display === 'none') {
                infoPanel.style.display = 'none';
                return;
            }
            
            // 等待DOM更新完成
            setTimeout(() => {
                const legendRect = legend.getBoundingClientRect();
                const containerRect = legend.parentElement.getBoundingClientRect();
                
                // 计算信息面板的位置（图例下方，留12px间距）
                const top = legendRect.bottom - containerRect.top + 12;
                
                infoPanel.style.top = `${top}px`;
                
                // 确保信息面板不会超出容器底部
                const containerHeight = containerRect.height;
                const infoPanelHeight = infoPanel.offsetHeight;
                if (top + infoPanelHeight > containerHeight - 20) {
                    // 如果超出，调整位置或限制高度
                    const maxHeight = containerHeight - top - 20;
                    if (maxHeight > 100) {
                        infoPanel.style.maxHeight = `${maxHeight}px`;
                        infoPanel.style.overflowY = 'auto';
                    }
                }
            }, 100);
        }

        // 计算target的最大深度（不受当前设置的深度限制）
        function calculateMaxDepth(targetName) {
            const visitedInPath = new Set(); // 用于检测当前路径中的循环
            let maxDepth = 0;
            
            function traverse(name, depth) {
                // 更新最大深度
                maxDepth = Math.max(maxDepth, depth);
                
                // 检测循环：如果当前节点已经在当前路径中，跳过
                if (visitedInPath.has(name)) {
                    return;
                }
                
                visitedInPath.add(name);
                
                const sources = window.adjacencyMap[name] || [];
                sources.forEach(edge => {
                    const sourceInfo = dataInfo[edge.source];
                    // 只考虑存在于Hugging Face的数据集
                    if (sourceInfo && sourceInfo.exists_on_hf) {
                        traverse(edge.source, depth + 1);
                    }
                });
                
                // 回溯：从当前路径中移除当前节点
                visitedInPath.delete(name);
            }
            
            traverse(targetName, 0);
            return maxDepth;
        }
        
        // 获取target的深度为1的组成数据个数（直接组成数据）
        function getDirectSourceCount(targetName) {
            const sources = window.adjacencyMap[targetName] || [];
            // 只统计存在于Hugging Face的数据集
            return sources.filter(edge => {
                const sourceInfo = dataInfo[edge.source];
                return sourceInfo && sourceInfo.exists_on_hf;
            }).length;
        }
        
        // 根据当前深度获取target的所有source data（叶子节点）
        function getSourceDataAtDepth(targetName, maxDepth) {
            const sourceSet = new Set();
            const visited = new Set();
            
            function traverse(name, depth) {
                // 如果已经访问过，跳过（防止循环）
                if (visited.has(name)) {
                    return;
                }
                
                // 如果超过最大深度，不再继续
                if (depth > maxDepth) {
                    return;
                }
                
                visited.add(name);
                
                const sources = window.adjacencyMap[name] || [];
                
                // 检查是否有有效的源数据（存在于 Hugging Face 的）
                const validSources = sources.filter(edge => {
                    const sourceInfo = dataInfo[edge.source];
                    return sourceInfo && sourceInfo.exists_on_hf;
                });
                
                // 如果没有有效的源数据，说明是叶子节点
                if (validSources.length === 0) {
                    const sourceInfo = dataInfo[name];
                    // 只添加存在于HF的节点，且不是target本身（depth > 0）
                    if (sourceInfo && sourceInfo.exists_on_hf && depth > 0) {
                        sourceSet.add(name);
                    }
                    return;
                }
                
                // 如果达到最大深度，当前节点也算作source data（即使它还有源数据）
                if (depth >= maxDepth) {
                    const sourceInfo = dataInfo[name];
                    // 只添加存在于HF的节点，且不是target本身（depth > 0）
                    if (sourceInfo && sourceInfo.exists_on_hf && depth > 0) {
                        sourceSet.add(name);
                    }
                    return;
                }
                
                // 继续遍历源数据
                validSources.forEach(edge => {
                    traverse(edge.source, depth + 1);
                });
            }
            
            traverse(targetName, 0);
            return Array.from(sourceSet);
        }
        
        // 计算多个target的source data交集
        function calculateIntersection(roots, maxDepth) {
            if (!roots || roots.length < 2) {
                return { count: 0, sources: [] };
            }
            
            // 获取每个target的source data
            const sourceSets = roots.map(root => {
                const sources = getSourceDataAtDepth(root.targetName, maxDepth);
                return new Set(sources);
            });
            
            // 计算交集
            if (sourceSets.length === 0) {
                return { count: 0, sources: [] };
            }
            
            // 从第一个集合开始，逐步求交集
            let intersection = new Set(sourceSets[0]);
            for (let i = 1; i < sourceSets.length; i++) {
                intersection = new Set([...intersection].filter(x => sourceSets[i].has(x)));
            }
            
            const intersectionArray = Array.from(intersection).sort();
            return {
                count: intersectionArray.length,
                sources: intersectionArray
            };
        }
        
        // 计算多个target的source data并集
        function calculateUnion(roots, maxDepth) {
            if (!roots || roots.length === 0) {
                return { count: 0, sources: [] };
            }
            
            const unionSet = new Set();
            
            roots.forEach(root => {
                const sources = getSourceDataAtDepth(root.targetName, maxDepth);
                sources.forEach(source => unionSet.add(source));
            });
            
            const unionArray = Array.from(unionSet).sort();
            return {
                count: unionArray.length,
                sources: unionArray
            };
        }

        // 更新数据源信息面板
        function updateSourceInfoPanel(roots) {
            const infoPanel = document.getElementById('sourceInfoPanel');
            if (!infoPanel) return;
            
            // 只使用已启用的target的root对象
            let rootsToAnalyze = [];
            if (window.enabledTargets && window.enabledTargets.size > 0 && window.allOriginalRoots) {
                // 过滤出已启用的target的root对象
                rootsToAnalyze = window.allOriginalRoots.filter(r => window.enabledTargets.has(r.targetName));
            } else {
                // 如果没有启用状态信息，使用传入的roots
                rootsToAnalyze = roots || [];
            }
            
            // 始终显示信息面板，无论是一个还是多个target
            if (!rootsToAnalyze || rootsToAnalyze.length === 0) {
                infoPanel.style.display = 'none';
                window.sourceInfoPanelVisible = false;
                return;
            }
            
            // 显示信息面板
            infoPanel.style.display = 'block';
            
            // 获取当前深度设置
            const depthInput = document.getElementById('depthInput');
            const currentDepth = depthInput ? parseInt(depthInput.value) || 3 : 3;
            
            // 计算交集和并集（使用所有原始target）
            const intersection = calculateIntersection(rootsToAnalyze, currentDepth);
            const union = calculateUnion(rootsToAnalyze, currentDepth);
            
            // 收集当前图中所有节点的名称
            const allNodeNames = new Set();
            function collectNodeNames(node) {
                allNodeNames.add(node.name);
                node.children.forEach(collectNodeNames);
            }
            rootsToAnalyze.forEach(root => collectNodeNames(root));
            
            // 统计数据类别，并记录每个类别/数据类型对应的数据列表
            const categoryStats = new Map();
            const dataTypeStats = new Map();
            const categoryToDatasets = new Map(); // 类别 -> 数据集列表
            const dataTypeToDatasets = new Map(); // 数据类型 -> 数据集列表
            
            allNodeNames.forEach(nodeName => {
                const info = dataInfo[nodeName];
                if (info) {
                    // 统计类别（categories）
                    if (info.categories && Array.isArray(info.categories) && info.categories.length > 0) {
                        info.categories.forEach(cat => {
                            categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
                            if (!categoryToDatasets.has(cat)) {
                                categoryToDatasets.set(cat, []);
                            }
                            categoryToDatasets.get(cat).push(nodeName);
                        });
                    }
                    // 统计数据类型（data_type）
                    if (info.data_type) {
                        dataTypeStats.set(info.data_type, (dataTypeStats.get(info.data_type) || 0) + 1);
                        if (!dataTypeToDatasets.has(info.data_type)) {
                            dataTypeToDatasets.set(info.data_type, []);
                        }
                        dataTypeToDatasets.get(info.data_type).push(nodeName);
                    }
                }
            });
            
            // 保存到全局变量，供点击事件使用
            window.categoryToDatasets = categoryToDatasets;
            window.dataTypeToDatasets = dataTypeToDatasets;
            
            // 构建信息面板内容
            let html = '<div class="source-info-header">' + t('genealogy_sourceDataAnalysis') + '</div>';
            
            // 每个target的详细信息部分
            html += '<div class="source-info-section">';
            html += '<div class="source-info-title">' + t('genealogy_targetDataDetails') + '</div>';
            html += '<div class="source-info-content">';
            
            rootsToAnalyze.forEach((root, index) => {
                const targetName = root.targetName;
                const maxDepth = calculateMaxDepth(targetName);
                const directSourceCount = getDirectSourceCount(targetName);
                const targetInfo = dataInfo[targetName];
                const isOnHF = targetInfo && targetInfo.exists_on_hf;
                
                html += '<div class="source-info-item" style="margin-bottom: 12px; padding: 12px; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border-left: 3px solid ' + root.color + ';">';
                
                // 数据名称（如果是超链接）
                if (isOnHF) {
                    html += '<div style="font-weight: 600; margin-bottom: 8px; color: #1d1d1f; font-size: 13px;">';
                    html += `<a href="https://huggingface.co/datasets/${targetName}" target="_blank" rel="noopener noreferrer" style="color: #007aff; text-decoration: none; border-bottom: 1px solid rgba(0, 122, 255, 0.3); transition: all 0.2s; cursor: pointer;" title="${t('genealogy_clickToVisitHF')}">${targetName} ↗</a>`;
                    html += '</div>';
                } else {
                    html += '<div style="font-weight: 600; margin-bottom: 8px; color: #1d1d1f; font-size: 13px;">' + targetName + '</div>';
                }
                
                html += '<div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px;">';
                html += '<div style="display: flex; flex-direction: column; gap: 4px;">';
                html += `<span style="font-size: 11px; color: #86868b; font-weight: 500;">${t('genealogy_maxDepth')}</span>`;
                html += '<span style="font-size: 14px; color: #1d1d1f; font-weight: 600;">' + maxDepth + '</span>';
                html += '</div>';
                html += '<div style="display: flex; flex-direction: column; gap: 4px;">';
                html += '<span style="font-size: 11px; color: #86868b; font-weight: 500;">' + t('genealogy_directSources') + '</span>';
                html += '<span style="font-size: 14px; color: #1d1d1f; font-weight: 600;">' + directSourceCount + '</span>';
                html += '</div>';
                html += '</div>';
                
                // Source Data特点总结部分（异步加载）
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.06);">';
                html += `<div style="font-size: 11px; color: #86868b; font-weight: 500; margin-bottom: 6px;">${t('genealogy_dataCharacteristics')}</div>`;
                html += `<div id="summary-${targetName.replace(/[^a-zA-Z0-9]/g, '-')}" style="font-size: 12px; color: #1d1d1f; line-height: 1.6; min-height: 20px;">`;
                html += `<span class="loading-spinner"></span><span style="color: #86868b;">${t('genealogy_analyzing')}</span>`;
                html += '</div>';
                html += '</div>';
                
                html += '</div>';
            });
            
            html += '</div>';
            html += '</div>';
            
            // 交集数据源部分
            html += '<div class="source-info-section">';
            html += `<div class="source-info-title">${t('genealogy_commonSources')}`;
            if (rootsToAnalyze.length >= 2) {
                html += ` <span style="font-size: 11px; color: #86868b; font-weight: normal;">${t('genealogy_depthLimit', {depth: currentDepth})}</span>`;
            }
            html += '</div>';
            html += '<div class="source-info-content">';
            
            if (rootsToAnalyze.length < 2) {
                html += `<div class="source-info-empty">${t('genealogy_needTwoTargets')}</div>`;
            } else if (intersection.count === 0) {
                html += `<div class="source-info-empty">${t('genealogy_noCommonSources')}</div>`;
            } else {
                html += `<div style="margin-bottom: 8px; font-size: 12px; color: #86868b;">${t('genealogy_commonSourceCount', {count: intersection.count})}</div>`;
                html += '<div class="source-info-list">';
                intersection.sources.forEach(sourceName => {
                    const sourceInfo = dataInfo[sourceName];
                    const isOnHF = sourceInfo && sourceInfo.exists_on_hf;
                    html += '<div class="source-info-item" style="padding: 8px 12px; margin-bottom: 6px; background: rgba(0, 0, 0, 0.02); border-radius: 6px; border-left: 2px solid #007aff;">';
                    if (isOnHF) {
                        html += `<a href="https://huggingface.co/datasets/${sourceName}" target="_blank" rel="noopener noreferrer" style="color: #007aff; text-decoration: none; font-size: 12px; font-weight: 500;">${sourceName} ↗</a>`;
                    } else {
                        html += `<span style="font-size: 12px; font-weight: 500; color: #1d1d1f;">${sourceName}</span>`;
                    }
                    html += '</div>';
                });
                html += '</div>';
            }
            
            html += '</div>';
            html += '</div>';
            
            // 数据类别统计部分
            html += '<div class="source-info-section">';
            html += `<div class="source-info-title">${t('genealogy_categoryStats')}</div>`;
            html += '<div class="source-info-content">';
            
            if (categoryStats.size === 0 && dataTypeStats.size === 0) {
                html += `<div class="source-info-empty">${t('genealogy_noCategoryInfo')}</div>`;
            } else {
                // 显示数据类型统计
                if (dataTypeStats.size > 0) {
                    html += '<div style="margin-bottom: 12px;">';
                    html += `<div style="font-size: 12px; color: #86868b; font-weight: 500; margin-bottom: 8px;">${t('genealogy_dataTypeStats')}</div>`;
                    const sortedDataTypes = Array.from(dataTypeStats.entries()).sort((a, b) => b[1] - a[1]);
                    sortedDataTypes.forEach(([dataType, count]) => {
                        const escapedDataType = dataType.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        html += '<div class="source-info-item" style="padding: 8px 12px; margin-bottom: 6px; background: rgba(0, 0, 0, 0.02); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;" onclick="showCategoryCard(\'dataType\', \'' + escapedDataType + '\', event)" onmouseover="this.style.background=\'rgba(0, 122, 255, 0.08)\'" onmouseout="this.style.background=\'rgba(0, 0, 0, 0.02)\'">';
                        html += `<span style="font-size: 12px; font-weight: 500; color: #007aff;">${dataType}</span>`;
                        html += `<span style="font-size: 12px; color: #86868b; background: rgba(0, 0, 0, 0.05); padding: 2px 8px; border-radius: 12px;">${count}</span>`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                // 显示类别统计
                if (categoryStats.size > 0) {
                    html += '<div>';
                    html += `<div style="font-size: 12px; color: #86868b; font-weight: 500; margin-bottom: 8px;">${t('genealogy_categoryStatsLabel')}</div>`;
                    const sortedCategories = Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1]);
                    sortedCategories.forEach(([category, count]) => {
                        const escapedCategory = category.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        html += '<div class="source-info-item" style="padding: 8px 12px; margin-bottom: 6px; background: rgba(0, 0, 0, 0.02); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;" onclick="showCategoryCard(\'category\', \'' + escapedCategory + '\', event)" onmouseover="this.style.background=\'rgba(0, 122, 255, 0.08)\'" onmouseout="this.style.background=\'rgba(0, 0, 0, 0.02)\'">';
                        html += `<span style="font-size: 12px; font-weight: 500; color: #007aff;">${category}</span>`;
                        html += `<span style="font-size: 12px; color: #86868b; background: rgba(0, 0, 0, 0.05); padding: 2px 8px; border-radius: 12px;">${count}</span>`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
            }
            
            html += '</div>';
            html += '</div>';
            
            infoPanel.innerHTML = html;
            
            // 设置可见性标志
            window.sourceInfoPanelVisible = true;
            
            // 重新定位（因为内容高度可能变化）
            positionSourceInfoPanel();
            
            // 异步加载每个target的source data总结（不阻塞其他内容显示）
            rootsToAnalyze.forEach((root) => {
                const targetName = root.targetName;
                // 使用setTimeout确保DOM已更新，然后异步加载总结
                setTimeout(() => {
                    loadSourceSummary(targetName);
                }, 100);
            });
        }
        
        // 全局变量：跟踪API是否可用
        let apiServerAvailable = false;
        let apiCheckPromise = null;

        // 检查API服务器是否可用（带缓存，避免重复检查）
        async function checkApiServerHealth() {
            // 如果已经检查过，直接返回结果
            if (apiCheckPromise !== null) {
                return apiCheckPromise;
            }

            // 创建检查Promise并缓存
            apiCheckPromise = (async () => {
                try {
                    // 使用AbortController实现超时
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
                    
                    const response = await fetch('http://localhost:8003/api/health', {
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const result = await response.json();
                        apiServerAvailable = result.llm_initialized === true;
                        return apiServerAvailable;
                    } else {
                        apiServerAvailable = false;
                        return false;
                    }
                } catch (error) {
                    // API服务器不可用或未启动
                    apiServerAvailable = false;
                    return false;
                }
            })();

            return apiCheckPromise;
        }

        // 加载source data总结（异步，不阻塞）
        async function loadSourceSummary(targetName) {
            const summaryElementId = `summary-${targetName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const summaryElement = document.getElementById(summaryElementId);
            
            if (!summaryElement) {
                return;
            }
            
            // 先检查API服务器是否可用
            const isApiAvailable = await checkApiServerHealth();
            if (!isApiAvailable) {
                // API不可用，不显示总结或显示提示
                summaryElement.innerHTML = `<span style="color: #86868b;">${t('genealogy_llmDisabled')}</span>`;
                return;
            }
            
            try {
                // 获取直接source data列表
                const sources = window.adjacencyMap[targetName] || [];
                const sourceDataList = sources.map(edge => ({
                    name: edge.source,
                    relationship: edge.relationship,
                    confidence: edge.confidence
                }));
                
                if (sourceDataList.length === 0) {
                    summaryElement.innerHTML = `<span style="color: #86868b;">${t('genealogy_noSourceData')}</span>`;
                    return;
                }
                
                // 构建source info map（只包含存在于Hugging Face的数据集）
                const sourceInfoMap = {};
                sourceDataList.forEach(source => {
                    const info = dataInfo[source.name];
                    // 只包含存在于Hugging Face的数据集
                    if (info && info.exists_on_hf) {
                        sourceInfoMap[source.name] = {
                            summary: info.summary || '',
                            categories: info.categories || [],
                            data_type: info.data_type || ''
                        };
                    }
                });
                
                // 如果没有有效的source data，直接返回
                if (Object.keys(sourceInfoMap).length === 0) {
                    summaryElement.innerHTML = `<span style="color: #86868b;">${t('genealogy_noValidSourceData')}</span>`;
                    return;
                }
                
                // 获取target data的描述信息
                const targetInfo = dataInfo[targetName] || {};
                const targetInfoData = {
                    summary: targetInfo.summary || '',
                    categories: targetInfo.categories || [],
                    data_type: targetInfo.data_type || ''
                };
                
                // 调用API（异步，不阻塞）
                const response = await fetch('http://localhost:8003/api/summarize-sources', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        target_name: targetName,
                        target_info: targetInfoData,
                        source_data_list: sourceDataList,
                        source_info_map: sourceInfoMap,
                        language: currentLanguage // 传递当前语言
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.summary) {
                    summaryElement.innerHTML = `<span style="color: #1d1d1f;">${result.summary}</span>`;
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
                
            } catch (error) {
                console.error(`Error loading summary for ${targetName}:`, error);
                // 检查是否是API服务器未运行
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    summaryElement.innerHTML = `<span style="color: #86868b;">${t('genealogy_apiUnavailable')}</span>`;
                } else {
                    summaryElement.innerHTML = `<span style="color: #ff3b30;">${t('genealogy_summaryFailed')}</span>`;
                }
            }
        }

        // 缩放功能
        function setupZoom(svg) {
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .filter(function(event) {
                    // 允许滚轮缩放和双击缩放
                    if (event.type === 'wheel' || event.type === 'dblclick') {
                        return true;
                    }
                    // 如果点击的是节点或其子元素，不触发zoom（允许拖拽节点）
                    const target = event.target;
                    if (target && (target.closest('.node') || target.tagName === 'circle' || target.tagName === 'text' || target.classList.contains('text-bg'))) {
                        return false;
                    }
                    // 其他情况允许zoom（比如在空白区域拖拽）
                    return true;
                })
                .on('zoom', (event) => {
                    currentG.attr('transform', event.transform);
                });

            svg.call(zoom);
            return zoom;
        }

        function zoomIn() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(300)
                        .call(currentZoom.scaleBy, 1.3);
                } catch (e) {
                    console.warn('Zoom in failed:', e);
                }
            }
        }

        function zoomOut() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(300)
                        .call(currentZoom.scaleBy, 0.7);
                } catch (e) {
                    console.warn('Zoom out failed:', e);
                }
            }
        }

        function resetZoom() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(750)
                        .call(currentZoom.transform, d3.zoomIdentity);
                } catch (e) {
                    console.warn('Reset zoom failed:', e);
                }
            }
        }

        // 显示重复数据警告弹窗
        function showDuplicateWarning(duplicates) {
            const modal = document.getElementById('duplicateModal');
            const modalBody = document.getElementById('duplicateModalBody');
            
            // 构建重复数据列表
            const duplicateList = duplicates.map(d => 
                `<div class="duplicate-item">• ${d}</div>`
            ).join('');
            
            modalBody.innerHTML = `
                <div style="margin-bottom: 12px;">
                    ${t('genealogy_duplicateText')}
                        </div>
                <div class="duplicate-list">
                    ${duplicateList}
                    </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0, 0, 0, 0.06); font-size: 14px; color: #6c757d;">
                    ${t('genealogy_duplicateAutoRemove')}
                </div>
            `;
            
            // 显示弹窗
            modal.classList.add('show');
        }

        // 关闭重复数据弹窗
        function closeDuplicateModal() {
            const modal = document.getElementById('duplicateModal');
            modal.classList.remove('show');
        }

        // 显示错误/成功信息
        function showError(message, isSuccess = false, type = 'error') {
            const errorDiv = document.getElementById('error');
            if (!errorDiv) return;

            // 如果是成功信息，隐藏错误卡片
            if (isSuccess) {
                errorDiv.style.display = 'none';
                return;
            }

            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${type === 'error' ? '❌' : 'ℹ️'}</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">${type === 'error' ? t('genealogy_errorTitle') : t('genealogy_infoTitle')}</div>
                        <div>${message}</div>
                    </div>
                </div>
            `;
            errorDiv.style.display = 'block';

            // 自动隐藏成功消息
            if (type === 'success') {
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 3000);
            }
        }

        // 显示数据集详细信息卡片
        function showDatasetCard(datasetName, event) {
            const info = dataInfo[datasetName];
            const card = document.getElementById('datasetCard');
            const cardOverlay = document.getElementById('cardOverlay');
            const cardTitle = document.getElementById('cardTitle');
            const cardContent = document.getElementById('cardContent');

            if (!info) {
                alert(t('genealogy_datasetNotFound'));
                return;
            }

            lastShownDataset = datasetName;

            // 设置标题（如果存在于 Hugging Face，则为可点击链接）
            if (info.exists_on_hf) {
                cardTitle.innerHTML = `<a href="https://huggingface.co/datasets/${info.name}" target="_blank" rel="noopener noreferrer"
                    style="color: inherit; text-decoration: none; border-bottom: 1px solid rgba(0, 102, 255, 0.3); transition: all 0.2s; cursor: pointer;"
                    title="${t('genealogy_clickToVisitHF')}">${info.name} ↗</a>`;
            } else {
                cardTitle.innerHTML = `<span title="${t('genealogy_notOnHFTitle')}">${info.name}</span>`;
            }

            let content = '';

            content += `<div class="dataset-info">
                <span class="info-label">${t('genealogy_yearLabel')}</span>
                <span class="info-value">${info.year || t('genealogy_unknown')}</span>
            </div>`;

            content += `<div class="dataset-info">
                <span class="info-label">${t('genealogy_dataTypeLabel')}</span>
                <span class="info-value">${info.data_type ? info.data_type : t('genealogy_unknown')}</span>
            </div>`;

            content += `<div class="dataset-info" style="grid-template-columns: auto 1fr; display: grid;">
                <span class="info-label">${t('genealogy_summaryLabel')}</span>
                <div class="info-value" style="line-height: 1.6;">${info.summary ? info.summary : t('genealogy_noSummary')}</div>
            </div>`;

            content += `<div class="dataset-info">
                <span class="info-label">${t('genealogy_categoriesLabel')}</span>
                <div class="info-value">`;

            if (info.categories && info.categories.length > 0) {
                content += '<div class="categories">';
                info.categories.forEach(cat => {
                    content += `<span class="category-tag">${cat}</span>`;
                });
                content += '</div>';
            } else {
                content += t('genealogy_unclassified');
            }

            content += `</div></div>`;

            const sources = window.adjacencyMap[datasetName] || [];
            // 判断节点类型
            const originalTargets = window.originalTargets || [];
            const isTarget = originalTargets.includes(datasetName);
            // 检查是否有有效的源数据（存在于 Hugging Face 的）
            const hasValidSources = sources.some(edge => {
                const sourceInfo = dataInfo[edge.source];
                return sourceInfo && sourceInfo.exists_on_hf;
            });
            const isLeaf = !hasValidSources;
            
            // 获取节点实际颜色（与绘制节点时使用的逻辑一致）
            let nodeTypeColor = '';
            if (isTarget) {
                // 目标数据集：从 currentRoots 中查找对应的颜色
                const root = currentRoots.find(r => r.targetName === datasetName);
                if (root) {
                    nodeTypeColor = root.color;
                } else {
                    // 如果找不到，从 originalTargets 中获取索引
                    const targetIndex = originalTargets.indexOf(datasetName);
                    nodeTypeColor = targetIndex >= 0 ? targetColors[targetIndex % targetColors.length] : nodeTypeColors.target.primary;
                }
            } else if (isLeaf) {
                // 叶子节点：使用预定义的橙色
                nodeTypeColor = nodeTypeColors.leaf.primary;
            } else {
                // 中间数据集：使用预定义的绿色
                nodeTypeColor = nodeTypeColors.intermediate.primary;
            }
            
            if (sources.length > 0) {
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_sourceDataLabel', {count: sources.length})}</span>
                    <div class="info-value">`;

                sources.forEach((edge) => {
                    const sourceInfo = dataInfo[edge.source];
                    const isOnHF = sourceInfo && sourceInfo.exists_on_hf;
                    content += `<div class="source-item" style="${!isOnHF ? 'background: linear-gradient(135deg, rgba(255, 59, 48, 0.03) 0%, rgba(255, 59, 48, 0.01) 100%); border-color: rgba(255, 59, 48, 0.1);' : ''}">
                        <div class="source-name">${edge.source} ${!isOnHF ? `<span style="color: #ff3b30; font-size: 12px; font-weight: 500;">${t('genealogy_notOnHF')}</span>` : ''}</div>
                        <div class="source-meta">
                            <span class="meta-tag meta-tag-relationship">${t('genealogy_relationshipLabel')}${edge.relationship || 'unknown'}</span>
                            <span class="meta-tag meta-tag-confidence">${t('genealogy_confidenceLabel')}${((edge.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                    </div>`;
                });

                content += `</div></div>`;
            }
            
            // 显示节点类型（使用节点实际颜色）
            if (isTarget) {
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_nodeTypeLabel')}</span>
                    <span class="info-value" style="color: ${nodeTypeColor};">${t('genealogy_targetNodeType')}</span>
                </div>`;
            } else if (isLeaf) {
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_nodeTypeLabel')}</span>
                    <span class="info-value" style="color: ${nodeTypeColor};">${t('genealogy_leafNodeType')}</span>
                </div>`;
            } else {
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_nodeTypeLabel')}</span>
                    <span class="info-value" style="color: ${nodeTypeColor};">${t('genealogy_intermediateNodeType')}</span>
                </div>`;
            }

            content += `<div class="dataset-info">
                <span class="info-label">${t('genealogy_hfLabel')}</span>
                <span class="info-value">${info.exists_on_hf ? t('genealogy_hfAvailable') : t('genealogy_hfUnavailable')}</span>
            </div>`;

            // 显示下载量信息
            const downloads = info.downloads;
            if (downloads !== undefined && downloads !== null && downloads !== '') {
                const downloadsNum = parseInt(downloads);
                let downloadsText = '';
                if (downloadsNum >= 1000000) {
                    downloadsText = `${(downloadsNum / 1000000).toFixed(1)}M`;
                } else if (downloadsNum >= 1000) {
                    downloadsText = `${(downloadsNum / 1000).toFixed(1)}k`;
                } else {
                    downloadsText = downloadsNum.toLocaleString();
                }
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_downloadsLabel')}</span>
                    <span class="info-value" style="color: #0066ff; font-weight: 600;">
                        📥 ${downloadsText} (${downloadsNum.toLocaleString()})
                    </span>
                </div>`;
            } else {
                content += `<div class="dataset-info">
                    <span class="info-label">${t('genealogy_downloadsLabel')}</span>
                    <span class="info-value" style="color: #8e8e93;">N/A</span>
                </div>`;
            }

            cardContent.innerHTML = content;

            // 使用 requestAnimationFrame 确保 transform 已经应用
            requestAnimationFrame(() => {
                card.classList.add('show');
                cardOverlay.classList.add('show');
            });

            if (event) {
                event.stopPropagation();
            }
        }

        // 显示类别/数据类型卡片
        function showCategoryCard(type, name, event) {
            const card = document.getElementById('datasetCard');
            const cardOverlay = document.getElementById('cardOverlay');
            const cardTitle = document.getElementById('cardTitle');
            const cardContent = document.getElementById('cardContent');

            // 获取该类别/数据类型对应的数据集列表
            let datasets = [];
            if (type === 'category' && window.categoryToDatasets) {
                datasets = window.categoryToDatasets.get(name) || [];
            } else if (type === 'dataType' && window.dataTypeToDatasets) {
                datasets = window.dataTypeToDatasets.get(name) || [];
            }

            if (datasets.length === 0) {
                alert('未找到该类别/类型的数据');
                return;
            }

            // 设置标题
            const typeLabel = type === 'category' ? '数据类别' : '数据类型';
            cardTitle.innerHTML = `<span>${typeLabel}: ${name}</span>`;

            // 构建内容
            let content = '';
            content += `<div class="dataset-info">
                <span class="info-label">数据数量：</span>
                <span class="info-value">${datasets.length}</span>
            </div>`;

            content += `<div class="dataset-info" style="grid-template-columns: auto 1fr; display: grid;">
                <span class="info-label">数据列表：</span>
                <div class="info-value" style="line-height: 1.8;">`;

            datasets.forEach(datasetName => {
                const info = dataInfo[datasetName];
                const isOnHF = info && info.exists_on_hf;
                
                if (isOnHF) {
                    content += `<div style="margin-bottom: 6px;">
                        <a href="https://huggingface.co/datasets/${datasetName}" target="_blank" rel="noopener noreferrer"
                            style="color: #007aff; text-decoration: none; border-bottom: 1px solid rgba(0, 122, 255, 0.3); transition: all 0.2s; cursor: pointer; font-size: 13px;"
                            title="${t('genealogy_clickToVisitHF')}">${datasetName} ↗</a>
                    </div>`;
                } else {
                    content += `<div style="margin-bottom: 6px; font-size: 13px; color: #1d1d1f;">${datasetName}</div>`;
                }
            });

            content += `</div></div>`;

            cardContent.innerHTML = content;

            // 重置卡片位置为居中（与showDatasetCard保持一致）
            card.style.left = '50%';
            card.style.top = '50%';
            card.style.transform = 'translate(-50%, -50%)';

            // 显示卡片
            requestAnimationFrame(() => {
                card.classList.add('show');
                cardOverlay.classList.add('show');
            });

            if (event) {
                event.stopPropagation();
            }
        }

        // 关闭数据集卡片
        function closeDatasetCard() {
            const card = document.getElementById('datasetCard');
            const cardOverlay = document.getElementById('cardOverlay');
            card.classList.remove('show');
            cardOverlay.classList.remove('show');
        }

        // 添加ESC键关闭卡片
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeDatasetCard();
            }
        });

        // 在 DOM 加载完成时立即确保 center-card 位置正确
        document.addEventListener('DOMContentLoaded', function() {
            const centerCard = document.querySelector('.center-card');
            if (centerCard) {
                // 使用 position: fixed 和视口中心，确保真正居中
                // 强制浏览器立即应用 transform，避免闪烁
                requestAnimationFrame(() => {
                    // 确保使用视口中心坐标，并使用 setProperty 设置 !important
                    centerCard.style.setProperty('left', '50%', 'important');
                    centerCard.style.setProperty('top', '50%', 'important');
                    centerCard.style.setProperty('transform', 'translate(-50%, -50%) translateZ(0)', 'important');
                    centerCard.style.setProperty('-webkit-transform', 'translate(-50%, -50%) translateZ(0)', 'important');
                });
            }
        });

        // 从URL参数获取数据集ID
        function getUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const datasetId = urlParams.get("id");
            return { datasetId };
        }

        // 加载id2name映射文件并查找target名称
        async function loadTargetFromId(datasetId) {
            try {
                const response = await fetch('./data/lineage/id2name.jsonl');
                if (!response.ok) {
                    throw new Error('Failed to load lineage/id2name.jsonl');
                }
                
                const text = await response.text();
                const lines = text.trim().split('\n').filter(l => l.trim());
                
                // 查找匹配的id
                for (const line of lines) {
                    try {
                        const mapping = JSON.parse(line);
                        // 支持多种可能的字段名：id, dataset_id, ID等
                        const id = mapping.id || mapping.dataset_id || mapping.ID;
                        if (id && id.toString() === datasetId.toString()) {
                            // 支持多种可能的字段名：name, dataset_name, target等
                            const targetName = mapping.name || mapping.dataset_name || mapping.target;
                            if (targetName) {
                                return targetName;
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse line in lineage/id2name.jsonl:', line, e);
                    }
                }
                
                return null;
            } catch (error) {
                console.error('Error loading lineage/id2name.jsonl:', error);
                return null;
            }
        }

        // 自动加载并展示指定target的数据血缘
        async function autoLoadTargetFromUrl() {
            const { datasetId } = getUrlParams();
            
            // 如果没有id参数，保持现有功能不变
            if (!datasetId) {
                return;
            }
            
            // 等待数据加载完成
            if (!dataInfo || Object.keys(dataInfo).length === 0) {
                // 如果数据还没加载，等待loadGraphData完成
                const checkDataLoaded = setInterval(async () => {
                    if (dataInfo && Object.keys(dataInfo).length > 0) {
                        clearInterval(checkDataLoaded);
                        // 数据加载完成后，先检查id是否存在
                        const targetName = await loadTargetFromId(datasetId);
                        
                        // 如果id不存在，直接返回，不显示错误，让页面正常显示
                        if (!targetName) {
                            return;
                        }
                        
                        // id存在，执行自动加载
                        loadAndVisualizeTarget(datasetId, true); // 传入 silent 参数
                    }
                }, 100);
                
                // 设置超时，避免无限等待
                setTimeout(() => {
                    clearInterval(checkDataLoaded);
                }, 10000);
            } else {
                // 数据已加载，先检查id是否存在
                const targetName = await loadTargetFromId(datasetId);
                
                // 如果id不存在，直接返回，不显示错误，让页面正常显示
                if (!targetName) {
                    return;
                }
                
                // id存在，执行自动加载
                loadAndVisualizeTarget(datasetId, true); // 传入 silent 参数
            }
        }

        // 加载target并触发可视化
        async function loadAndVisualizeTarget(datasetId, silent = false) {
            try {
                // 从lineage/id2name.jsonl查找target名称
                const targetName = await loadTargetFromId(datasetId);
                
                if (!targetName) {
                    // 如果 silent 为 true，不显示错误，直接返回
                    if (silent) {
                        return;
                    }
                    showError(t('genealogy_targetNotFound', {targets: `ID: ${datasetId}`}));
                    return;
                }
                
                // 验证target是否存在于数据集中
                if (!dataInfo[targetName]) {
                    // 如果 silent 为 true，不显示错误，直接返回
                    if (silent) {
                        return;
                    }
                    showError(t('genealogy_targetNotFound', {targets: targetName}));
                    return;
                }
                
                // 填充到第一个输入框
                const firstInput = document.querySelector('.target-input');
                if (firstInput) {
                    firstInput.value = targetName;
                    // 触发change事件，确保自动完成功能正常工作
                    firstInput.dispatchEvent(new Event('change'));
                }
                
                // 等待一小段时间确保输入框已更新，然后触发可视化
                setTimeout(() => {
                    visualizeData();
                }, 300);
                
            } catch (error) {
                console.error('Error loading target from ID:', error);
                showError(t('genealogy_loadFailed') + error.message);
            }
        }

        // 初始化首页的数据血缘可视化
        async function initIndexLineageVisualization() {
            const container = document.getElementById('indexLineageVisualization');
            if (!container) return;

            const loadingDiv = document.getElementById('indexLineageLoading');
            const errorDiv = document.getElementById('indexLineageError');
            
            // 确保 loadingDiv 和 errorDiv 存在
            if (!loadingDiv || !errorDiv) {
                console.warn('Loading or error div not found for index lineage visualization');
                return;
            }
            
            try {
                if (loadingDiv) loadingDiv.style.display = 'block';
                if (errorDiv) errorDiv.style.display = 'none';

                // 确保数据已加载
                if (!dataInfo || Object.keys(dataInfo).length === 0) {
                    await loadGraphData();
                }

                // 从lineage/id2name.jsonl查找id=87对应的target名称
                const targetName = await loadTargetFromId('91');
                
                if (!targetName) {
                    errorDiv.textContent = t('genealogy_targetNotFound', {targets: 'ID: 87'});
                    errorDiv.style.display = 'block';
                    loadingDiv.style.display = 'none';
                    return;
                }

                // 验证target是否存在于数据集中
                if (!dataInfo[targetName]) {
                    errorDiv.textContent = t('genealogy_targetNotFound', {targets: targetName});
                    errorDiv.style.display = 'block';
                    loadingDiv.style.display = 'none';
                    return;
                }

                // 构建树（使用深度3，适合首页展示）
                const depth = 3;
                const allTargetNodes = new Set([targetName]);
                const root = buildTree(targetName, depth, allTargetNodes);
                
                if (!root) {
                    errorDiv.textContent = t('genealogy_noTreeBuilt');
                    errorDiv.style.display = 'block';
                    loadingDiv.style.display = 'none';
                    return;
                }

                // 设置root属性
                root.targetName = targetName;
                root.isPrimaryTarget = true;
                root.color = targetColors[0];
                
                // 标记节点角色
                markNodeRoles([root], allTargetNodes);
                
                // 确保目标节点被标记为target
                function markInTree(node) {
                    if (node.name === targetName) {
                        node.nodeType = 'target';
                    }
                    node.children.forEach(markInTree);
                }
                markInTree(root);

                // 保存到全局变量（用于图例等）
                window.originalTargets = [targetName];
                window.allOriginalRoots = [root];
                window.enabledTargets = new Set([targetName]);

                // 绘制树形布局到首页容器
                drawMergedTree([root], '#indexLineageVisualization');
                
                // 计算节点数量用于图例
                const stats = calculateStats(root);
                const nodeCount = stats.nodes;
                
                // 显示缩放控件和图例
                const zoomControls = document.getElementById('indexLineageZoomControls');
                const legend = document.getElementById('indexLineageLegend');
                if (zoomControls) zoomControls.style.display = 'flex';
                if (legend) {
                    updateLegend([root], nodeCount, '#indexLineageLegend');
                }

                loadingDiv.style.display = 'none';
            } catch (error) {
                console.error('Error initializing index lineage visualization:', error);
                errorDiv.textContent = t('genealogy_loadFailed') + error.message;
                errorDiv.style.display = 'block';
                loadingDiv.style.display = 'none';
            }
        }

        // 首页专用的缩放函数
        function indexLineageZoomIn() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(300)
                        .call(currentZoom.scaleBy, 1.3);
                } catch (e) {
                    console.warn('Zoom in failed:', e);
                }
            }
        }

        function indexLineageZoomOut() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(300)
                        .call(currentZoom.scaleBy, 0.7);
                } catch (e) {
                    console.warn('Zoom out failed:', e);
                }
            }
        }

        function indexLineageResetZoom() {
            if (currentZoom && currentSvg && currentSvg.node()) {
                try {
                    currentSvg.transition()
                        .duration(750)
                        .call(currentZoom.transform, d3.zoomIdentity);
                } catch (e) {
                    console.warn('Reset zoom failed:', e);
                }
            }
        }

        // 暴露到全局作用域
        window.indexLineageZoomIn = indexLineageZoomIn;
        window.indexLineageZoomOut = indexLineageZoomOut;
        window.indexLineageResetZoom = indexLineageResetZoom;

        window.addEventListener('load', function() {
            // 初始化首页背景可视化（不依赖数据加载）
            initHomeVisualization();
            
            // 仅当存在应用页面相关元素时才加载完整图数据
            if (document.getElementById('appPage')) {
                loadGraphData().then(() => {
                    // 数据加载完成后，检查是否需要自动加载target
                    autoLoadTargetFromUrl();
                }).catch(() => {
                    // 即使加载失败，也尝试自动加载（可能lineage/id2name.jsonl可以正常加载）
                    autoLoadTargetFromUrl();
                });
            }
            
            // 初始化首页数据血缘可视化（需要等待数据加载）
            if (document.getElementById('indexLineageVisualization')) {
                // 确保数据已加载后再初始化可视化
                if (dataInfo && Object.keys(dataInfo).length > 0) {
                    // 数据已加载，直接初始化
                    initIndexLineageVisualization();
                } else {
                    // 数据未加载，先加载数据再初始化
                    loadGraphData().then(() => {
                        initIndexLineageVisualization();
                    }).catch((error) => {
                        console.error('Failed to load graph data for index visualization:', error);
                        const errorDiv = document.getElementById('indexLineageError');
                        if (errorDiv) {
                            errorDiv.textContent = t('genealogy_loadFailed') + error.message;
                            errorDiv.style.display = 'block';
                        }
                        const loadingDiv = document.getElementById('indexLineageLoading');
                        if (loadingDiv) loadingDiv.style.display = 'none';
                    });
                }
                
                // 监听首页的语言切换事件（通过监听 localStorage 变化）
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = function(key, value) {
                    originalSetItem.apply(this, arguments);
                    if (key === 'oda_lang' && window.updateLanguage) {
                        // 延迟一点确保语言已更新
                        setTimeout(() => {
                            window.updateLanguage();
                        }, 100);
                    }
                };
                
                // 也监听 storage 事件（跨标签页）
                window.addEventListener('storage', function(e) {
                    if (e.key === 'oda_lang' && window.updateLanguage) {
                        setTimeout(() => {
                            window.updateLanguage();
                        }, 100);
                    }
                });
            }

            // 为第一个输入框添加自动完成功能
            const firstInput = document.querySelector('.target-input');
            if (firstInput) {
                new Autocomplete(firstInput);
            }

            document.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && e.target.classList.contains('target-input')) {
                    visualizeData();
                }
            });

            // 窗口大小改变时重新定位信息面板和中心卡片
            let resizeTimer;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    positionSourceInfoPanel();
                    // 确保 center-card 在窗口大小改变后仍然居中
                    const centerCard = document.querySelector('.center-card');
                    if (centerCard) {
                        centerCard.style.setProperty('left', '50%', 'important');
                        centerCard.style.setProperty('top', '50%', 'important');
                        centerCard.style.setProperty('transform', 'translate(-50%, -50%) translateZ(0)', 'important');
                        centerCard.style.setProperty('-webkit-transform', 'translate(-50%, -50%) translateZ(0)', 'important');
                    }
                }, 250);
            });
        });

        // 将需要在 HTML onclick 中使用的函数暴露到全局作用域
        window.visualizeData = visualizeData;
        window.zoomIn = zoomIn;
        window.zoomOut = zoomOut;
        window.resetZoom = resetZoom;
        window.toggleTarget = toggleTarget;
        window.closeDuplicateModal = closeDuplicateModal;
        window.closeDatasetCard = closeDatasetCard;
        window.addTargetInput = addTargetInput;
        window.removeTargetInput = removeTargetInput;
        window.showDatasetCard = showDatasetCard;
