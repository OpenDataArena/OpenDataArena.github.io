const { createApp, ref, computed, onMounted } = Vue

const app = createApp({
    setup() {
        // 数据状态
        const rawData = ref({})
        const currentModel = ref('llama')
        const searchQuery = ref('')
        const selectedDomains = ref([]) // 数组支持多选
        const selectedType = ref('') // 改回单选
        const showDomainDropdown = ref(false) // 控制数据领域下拉框显示
        const showTypeDropdown = ref(false) // 控制榜单领域下拉框显示
        const loading = ref(true)
        const error = ref(null)

        // 新增：用于列高亮的状态
        const highlightedColumn = ref(null) // 主表格高亮列
        const highlightedDetailedColumn = ref(null) // 详细表格高亮列

        // 模型配置
        const models = ref([
            { id: 'llama', name: 'LLaMA Family', icon: 'fas fa-robot' },
            { id: 'qwen', name: 'Qwen Family', icon: 'fas fa-microchip' }
        ])

        // 加载数据
        const loadData = async () => {
            try {
                loading.value = true
                const response = await fetch('./processed_leaderboard_data.json')
                if (!response.ok) {
                    throw new Error('Failed to load data')
                }
                const data = await response.json()
                rawData.value = data
                error.value = null
            } catch (err) {
                console.error('Error loading data:', err)
                error.value = '数据加载失败，请检查数据文件是否存在'
                // 使用模拟数据作为备用
                rawData.value = {
                    llama: generateMockData('LLaMA'),
                    qwen: generateMockData('Qwen')
                }
            } finally {
                loading.value = false
            }
        }

        // 生成模拟数据
        const generateMockData = (prefix) => {
            const datasets = []
            const domains = ['general', 'math', 'code', 'reasoning']
            
            for (let i = 1; i <= 20; i++) {
                const general_avg = Math.random() * 80 + 20
                const math_avg = Math.random() * 70 + 15
                const code_avg = Math.random() * 75 + 20
                const reasoning_avg = Math.random() * 65 + 25
                const overall_avg = (general_avg + math_avg + code_avg + reasoning_avg) / 4

                datasets.push({
                    id: i,
                    name: `${prefix}_Dataset_${i}`,
                    domain: domains[Math.floor(Math.random() * domains.length)],
                    general_avg: Math.round(general_avg * 100) / 100,
                    math_avg: Math.round(math_avg * 100) / 100,
                    code_avg: Math.round(code_avg * 100) / 100,
                    reasoning_avg: Math.round(reasoning_avg * 100) / 100,
                    overall_avg: Math.round(overall_avg * 100) / 100
                })
            }
            return datasets
        }

        // 计算属性：当前数据
        const currentData = computed(() => {
            return rawData.value[currentModel.value] || []
        })

        // 计算属性：排序后的数据
        const sortedData = computed(() => {
            if (!currentData.value.length) return []
            
            const baseModel = currentData.value.find(item => item.name === 'base');
            const otherModels = currentData.value.filter(item => item.name !== 'base');

            const sortedOtherModels = [...otherModels].sort((a, b) => {
                let scoreA = a[sortColumn.value] || 0
                let scoreB = b[sortColumn.value] || 0
                
                // 如果是名字列，使用字符串比较
                if (sortColumn.value === 'name') {
                    scoreA = a.name || ''
                    scoreB = b.name || ''
                    return sortDirection.value === 'asc' ? 
                        scoreA.localeCompare(scoreB) : 
                        scoreB.localeCompare(scoreA)
                }
                
                // 数值比较
                return sortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
            });

            return baseModel ? [baseModel, ...sortedOtherModels] : sortedOtherModels;
        })

        // 计算属性：可用的领域列表
        const availableDomains = computed(() => {
            if (!currentData.value.length) return []
            const domains = [...new Set(currentData.value.map(item => item.domain).filter(Boolean))]
            return domains.sort()
        })
        
        // 计算属性：有序的领域列表（确保general、math、code、reasoning顺序）
        const orderedDomains = computed(() => {
            const domains = availableDomains.value
            const orderedDomainsPriority = ['general', 'math', 'code', 'reasoning']
            
            // 先添加按照优先级排序的常见领域
            const result = []
            orderedDomainsPriority.forEach(domain => {
                if (domains.includes(domain)) {
                    result.push(domain)
                }
            })
            
            // 再添加其他领域
            domains.forEach(domain => {
                if (!orderedDomainsPriority.includes(domain)) {
                    result.push(domain)
                }
            })
            
            return result
        })

        // 计算属性：过滤后的数据（主表格）
        const filteredData = computed(() => {
            let dataToFilter = sortedData.value; // 使用已经将base置顶的数据
            let baseModel = null;
            if (dataToFilter.length > 0 && dataToFilter[0].name === 'base') {
                baseModel = dataToFilter[0];
                dataToFilter = dataToFilter.slice(1);
            }

            let filtered = dataToFilter;

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据领域多选过滤
            if (selectedDomains.value.length > 0) {
                filtered = filtered.filter(dataset => 
                    selectedDomains.value.includes(dataset.domain)
                )
            }
            
            return baseModel ? [baseModel, ...filtered] : filtered;
        })

        // 计算属性：未排序的过滤数据（用于排名计算）
        const filteredDataForRanking = computed(() => {
            let filtered = currentData.value.filter(item => item.name !== 'base'); // 排除 base

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据领域多选过滤
            if (selectedDomains.value.length > 0) {
                filtered = filtered.filter(dataset => 
                    selectedDomains.value.includes(dataset.domain)
                )
            }

            return filtered
        })

        // 计算属性：详细表格的未排序过滤数据（用于排名计算）
        const detailedFilteredDataForRanking = computed(() => {
            if (!selectedType.value) return []
            
            let filtered = currentData.value.filter(item => item.name !== 'base'); // 排除 base

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据领域多选过滤
            if (selectedDomains.value.length > 0) {
                filtered = filtered.filter(dataset => 
                    selectedDomains.value.includes(dataset.domain)
                )
            }

            return filtered
        })

        // 计算属性：详细表格的过滤数据
        const detailedFilteredData = computed(() => {
            if (!selectedType.value) return []
            
            const baseModel = currentData.value.find(item => item.name === 'base');
            let otherModels = currentData.value.filter(item => item.name !== 'base');
            
            // 使用选中的类型作为详细视图的展示
            const primaryType = selectedType.value
            let filtered = [...otherModels]
            
            // 排序逻辑
            filtered.sort((a, b) => {
                if (detailedSortColumn.value) {
                    // 如果是特定任务的排序
                    if (detailedSortColumn.value.includes('_')) {
                        // 更安全的分解方式：从任务头信息中查找匹配
                        const taskHeaders = getTaskHeaders(primaryType)
                        const header = taskHeaders.find(h => h.taskName + '_' + h.metricName === detailedSortColumn.value)
                        if (header) {
                            const scoreA = getTaskScore(a, primaryType, header.taskName, header.metricName, true) || 0
                            const scoreB = getTaskScore(b, primaryType, header.taskName, header.metricName, true) || 0
                            return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                        }
                    } else if (detailedSortColumn.value === 'name') {
                        // 按名字排序
                        return detailedSortDirection.value === 'asc' ? 
                            a.name.localeCompare(b.name) : 
                            b.name.localeCompare(a.name)
                    } else if (detailedSortColumn.value === 'domain') {
                        // 按领域排序
                        const domainA = a.domain || ''
                        const domainB = b.domain || ''
                        return detailedSortDirection.value === 'asc' ? 
                            domainA.localeCompare(domainB) : 
                            domainB.localeCompare(domainA)
                    } else if (detailedSortColumn.value === 'average') {
                        // 按平均分排序
                        const scoreA = getTypeAverageValue(a, primaryType)
                        const scoreB = getTypeAverageValue(b, primaryType)
                        return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                    } else {
                        // 其他情况按平均分排序
                        const scoreA = getTypeAverageValue(a, primaryType)
                        const scoreB = getTypeAverageValue(b, primaryType)
                        return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                    }
                } else {
                    // 默认按平均分降序排序
                    const scoreA = getTypeAverageValue(a, primaryType)
                    const scoreB = getTypeAverageValue(b, primaryType)
                    return scoreB - scoreA
                }
            })

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据领域多选过滤
            if (selectedDomains.value.length > 0) {
                filtered = filtered.filter(dataset => 
                    selectedDomains.value.includes(dataset.domain)
                )
            }

            return baseModel ? [baseModel, ...filtered] : filtered;
        })

        // 计算属性：当前模型信息
        const currentModelInfo = computed(() => {
            return models.value.find(m => m.id === currentModel.value) || models.value[0]
        })

        // 方法：切换模型
        const switchModel = (modelId) => {
            currentModel.value = modelId
        }

        // 方法：重置筛选
        const resetFilters = () => {
            searchQuery.value = ''
            selectedDomains.value = []
            selectedType.value = ''
            showDomainDropdown.value = false
            showTypeDropdown.value = false
        }
        
        // 方法：移除所选领域
        const removeDomain = (domain) => {
            selectedDomains.value = selectedDomains.value.filter(d => d !== domain)
        }
        
        // 方法：选择类型（单选）
        const selectType = (type) => {
            selectedType.value = type
            showTypeDropdown.value = false
        }
        
        // 方法：清除类型选择
        const clearType = () => {
            selectedType.value = ''
            showTypeDropdown.value = false
        }
        
        // 方法：切换数据领域下拉框显示
        const toggleDomainDropdown = () => {
            showDomainDropdown.value = !showDomainDropdown.value
            showTypeDropdown.value = false // 关闭其他下拉框
        }
        
        // 方法：切换榜单领域下拉框显示
        const toggleTypeDropdown = () => {
            showTypeDropdown.value = !showTypeDropdown.value
            showDomainDropdown.value = false // 关闭其他下拉框
        }
        
        // 方法：切换数据领域选择（多选）
        const toggleDomain = (domain) => {
            const index = selectedDomains.value.indexOf(domain)
            if (index > -1) {
                selectedDomains.value.splice(index, 1)
            } else {
                selectedDomains.value.push(domain)
            }
        }
        
        // 方法：类型改变时的处理
        const onTypeChange = () => {
            // 当选择类型时，可以添加额外的逻辑
            console.log('Type changed to:', selectedType.value)
            // 如果选择了类型，滚动到详细表格
            if (selectedType.value) {
                setTimeout(() => {
                    const detailedContainer = document.querySelector('.detailed-leaderboard-container');
                    if (detailedContainer) {
                        detailedContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        }
        
        // 方法：获取类型对应的图标
        const getTypeIcon = (type) => {
            const typeIcons = {
                'general': 'fas fa-book',
                'math': 'fas fa-calculator',
                'code': 'fas fa-code',
                'reasoning': 'fas fa-brain'
            }
            
            return typeIcons[type.toLowerCase()] || 'fas fa-list-ol'
        }
        
        // 方法：获取领域对应的图标
        const getDomainIcon = (domain) => {
            const domainIcons = {
                'general': 'fas fa-book',
                'math': 'fas fa-calculator',
                'code': 'fas fa-code',
                'reasoning': 'fas fa-brain'
            }
            
            return domainIcons[domain.toLowerCase()] || 'fas fa-tag'
        }
        
        // 方法：获取领域的描述
        // 方法：获取领域的详细描述（用于工具提示）
        const getDomainDescription = (domain) => {
            const domainDescriptions = {
                'general': '通用领域能力，包括知识问答、常识、指令遵循等',
                'math': '数学能力，包括计算、推导、解题等',
                'code': '代码能力，包括代码生成、调试、理解等',
                'reasoning': '推理能力，包括逻辑推理、思维链等'
            }
            
            return domainDescriptions[domain.toLowerCase()] || domain
        }

        // 方法：格式化分数（四舍五入到一位小数）
        const formatScore = (score) => {
            if (typeof score === 'number') {
                return roundToOneDecimal(score).toFixed(1)
            }
            return '0.0'
        }

        // 方法：格式化分数并显示改进值 (主榜单)
        const formatScoreWithImprovement = (score, improvementValue) => {
            const formattedScore = formatScore(score)
            let diffText = null;
            let diffClass = '';

            if (typeof improvementValue === 'number') { // Always show if improvementValue is a number
                const diff = roundToOneDecimal(improvementValue);
                if (diff === 0) {
                    diffText = '0.0';
                    diffClass = 'score-diff-positive'; // Changed to positive for 0.0
                } else {
                    diffText = (diff > 0 ? '+' : '') + diff.toFixed(1);
                    diffClass = diff > 0 ? 'score-diff-positive' : 'score-diff-negative';
                }
            }
            
            return { 
                score: formattedScore, 
                diffText: diffText,
                diffClass: diffClass
            };
        }

        // 方法：四舍五入到一位小数
        const roundToOneDecimal = (score) => {
            if (typeof score === 'number') {
                return Math.round(score * 10) / 10
            }
            return 0
        }

        // 方法：获取分数等级类名
        const getScoreClass = (score) => {
            if (score >= 70) return 'score-high'
            if (score >= 50) return 'score-medium'
            return 'score-low'
        }

        // 方法：获取排名类名
        const getRankClass = (index) => {
            if (index === 0) return 'rank-1'
            if (index === 1) return 'rank-2'
            if (index === 2) return 'rank-3'
            return ''
        }

        // 方法：获取领域徽章类名
        const getDomainClass = (domain) => {
            return `domain-${domain}`
        }

        // 方法：获取类型显示名称
        const getTypeDisplayName = (type) => {
            const typeNames = {
                'general': 'General',
                'math': 'Math',
                'code': 'Code',
                'reasoning': 'Reasoning'
            }
            return typeNames[type] || type
        }

        // 方法：获取任务列表的表头
        const getTaskHeaders = (type) => {
            // 从实际数据中获取任务列表
            if (currentData.value.length > 0) {
                // Find the first non-base model with task_details to use as a template
                const modelForHeaders = currentData.value.find(item => item.name !== 'base' && item.task_details);

                if (modelForHeaders) {
                    const domainKey = type + '_tasks'
                    const tasks = modelForHeaders.task_details[domainKey] || []
                    const headers = []
                    
                    tasks.forEach(task => {
                        if (task.metrics && task.metrics.length > 1) {
                            // 如果有多个指标，为每个指标创建一个列
                            task.metrics.forEach(metric => {
                                headers.push({
                                    taskName: task.task_name,
                                    metricName: metric.metric,
                                    displayName: task.task_name,
                                    metricDisplayName: metric.metric
                                })
                            })
                        } else {
                            // 如果只有一个指标，也显示指标名称
                            headers.push({
                                taskName: task.task_name,
                                metricName: task.metrics[0]?.metric || 'accuracy',
                                displayName: task.task_name,
                                metricDisplayName: task.metrics[0]?.metric || 'accuracy'
                            })
                        }
                    })
                    
                    return headers
                }
            }
            
            // 如果没有数据或没有合适的模型来提取表头，返回空数组
            return []
        }

        // 方法：获取特定领域的任务列表
        const getTasksForDomain = (type) => {
            if (currentData.value.length > 0) {
                const firstModel = currentData.value[0]
                if (firstModel.task_details) {
                    const domainKey = type + '_tasks'
                    const tasks = firstModel.task_details[domainKey] || []
                    return tasks.map(task => task.task_name)
                }
            }
            return []
        }

        // 方法：获取特定任务的分数
        const getTaskScore = (dataset, type, taskNameFromHeader, metricNameFromHeader, raw = false) => {
            if (!dataset || !type || !taskNameFromHeader) {
                return raw ? 0 : { score: '0.0', diffText: null, diffClass: '' };
            }

            if (dataset.name === 'base') {
                const taskScoresKey = type + '_task_scores';
                if (dataset[taskScoresKey] && Array.isArray(dataset[taskScoresKey])) {
                    const headers = getTaskHeaders(type); // These headers are derived from a non-base model
                    let scoreIndex = -1;

                    // Find the index of the current task/metric in the dynamically generated headers
                    for (let i = 0; i < headers.length; i++) {
                        if (headers[i].taskName === taskNameFromHeader && headers[i].metricName === metricNameFromHeader) {
                            scoreIndex = i;
                            break;
                        }
                    }

                    if (scoreIndex !== -1 && scoreIndex < dataset[taskScoresKey].length) {
                        const scoreValue = dataset[taskScoresKey][scoreIndex];
                        if (raw) return scoreValue;
                        return {
                            score: formatScore(scoreValue), // Use existing formatScore
                            diffText: null, // Base model does not have improvement scores for sub-tasks
                            diffClass: ''
                        };
                    }
                }
                // Fallback if scores are not found or mapping fails
                return raw ? 0 : { score: '-', diffText: null, diffClass: '' };
            }

            // 1. 从 task_details 获取基础分数
            let scoreValue = 0;
            if (dataset.task_details) {
                const domainTasksKey = type + '_tasks';
                const tasksInDomain = dataset.task_details[domainTasksKey] || [];
                const currentTaskObject = tasksInDomain.find(t => t.task_name === taskNameFromHeader);
                if (currentTaskObject && currentTaskObject.metrics) {
                    const metricData = currentTaskObject.metrics.find(m => m.metric === metricNameFromHeader);
                    if (metricData) {
                        scoreValue = metricData.score;
                    }
                }
            }
            if (raw) return scoreValue;

            // 2. 使用 improvement[type + '_task_scores'] 数组确定 improvementValue
            let improvementValue = null;
            const improvementArrayKey = type + '_task_scores';
            // 生成当前数据集的指标序列，用于查找正确的索引
            const currentDatasetMetricSequence = [];
            if (dataset.task_details) {
                const domainKey = type + '_tasks';
                const tasksInCurrentDataset = dataset.task_details[domainKey] || [];
                tasksInCurrentDataset.forEach(task => {
                    if (task.metrics && task.metrics.length > 1) {
                        task.metrics.forEach(metricObj => {
                            currentDatasetMetricSequence.push({
                                taskName: task.task_name,
                                metricName: metricObj.metric
                            });
                        });
                    } else {
                        currentDatasetMetricSequence.push({
                            taskName: task.task_name,
                            metricName: (task.metrics && task.metrics[0]?.metric) || 'accuracy'
                        });
                    }
                });
            }
            const indexInCurrentDatasetScores = currentDatasetMetricSequence.findIndex(item =>
                item.taskName === taskNameFromHeader && item.metricName === metricNameFromHeader
            );
            if (
                dataset.improvement &&
                dataset.improvement[improvementArrayKey] &&
                indexInCurrentDatasetScores !== -1 &&
                dataset.improvement[improvementArrayKey].length > indexInCurrentDatasetScores
            ) {
                improvementValue = dataset.improvement[improvementArrayKey][indexInCurrentDatasetScores];
            }

            // 3. 格式化并返回
            const formattedScore = formatScore(scoreValue);
            let diffText = null;
            let diffClass = '';
            if (typeof improvementValue === 'number') { // Always show if improvementValue is a number
                const diff = roundToOneDecimal(improvementValue);
                if (diff === 0) {
                    diffText = '0.0';
                    diffClass = 'score-diff-positive'; // Changed to positive for 0.0
                } else {
                    diffText = (diff > 0 ? '+' : '') + diff.toFixed(1);
                    diffClass = diff > 0 ? 'score-diff-positive' : 'score-diff-negative';
                }
            }
            return {
                score: formattedScore,
                diffText: diffText,
                diffClass: diffClass
            };
        };

        // 方法：获取类型平均分
        const getTypeAverage = (dataset, type) => {
            const avgKey = type + '_avg';
            const scoreValue = dataset[avgKey] || 0;
            const improvementValue = dataset.improvement ? dataset.improvement[avgKey] : null; // 假设 improvement 在 dataset.improvement 对象中

            const formattedScore = formatScore(scoreValue);
            let diffText = null;
            let diffClass = '';

            if (typeof improvementValue === 'number') { // Always show if improvementValue is a number
                const diff = roundToOneDecimal(improvementValue);
                if (diff === 0) {
                    diffText = '0.0';
                    diffClass = 'score-diff-positive'; // Changed to positive for 0.0
                } else {
                    diffText = (diff > 0 ? '+' : '') + diff.toFixed(1);
                    diffClass = diff > 0 ? 'score-diff-positive' : 'score-diff-negative';
                }
            }

            return {
                score: formattedScore,
                diffText: diffText,
                diffClass: diffClass
            };
        }

        // 方法：获取类型平均分数值（用于排序）
        const getTypeAverageValue = (dataset, type) => {
            const avgKey = type + '_avg'
            return dataset[avgKey] || 0
        }

        // 方法：计算排名（考虑相同分数）
        const calculateRanks = (data, scoreKey, isDetailed = false, selectedType = null) => {
            let dataToRank = data.filter(item => item.name !== 'base'); // 排除 base
            let dataWithRoundedScores

            if (isDetailed && scoreKey && scoreKey !== 'name' && scoreKey !== 'domain') {
                if (scoreKey === 'average') {
                    // 详细表格的平均分排名
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType))
                    }))
                } else if (scoreKey.includes('_')) {
                    // 特定任务的排名
                    const taskHeaders = getTaskHeaders(selectedType)
                    const header = taskHeaders.find(h => h.taskName + '_' + h.metricName === scoreKey)
                    if (header) {
                        dataWithRoundedScores = data.map(item => ({
                            ...item,
                            roundedScore: roundToOneDecimal(getTaskScore(item, selectedType, header.taskName, header.metricName, true))
                        }))
                    } else {
                        // 默认使用平均分
                        dataWithRoundedScores = data.map(item => ({
                            ...item,
                            roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType))
                        }))
                    }
                } else {
                    // 默认使用平均分
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType))
                    }))
                }
            } else {
                // 主表格的排名逻辑
                dataWithRoundedScores = data.map(item => ({
                    ...item,
                    roundedScore: roundToOneDecimal(item[scoreKey] || 0)
                }))
            }

            // 按照四舍五入后的分数排序
            const sorted = [...dataWithRoundedScores].sort((a, b) => {
                if (scoreKey === 'name') {
                    return a.name.localeCompare(b.name)
                } else if (scoreKey === 'domain') {
                    return (a.domain || '').localeCompare(b.domain || '')
                }
                return b.roundedScore - a.roundedScore // 降序排列
            })

            // 计算排名
            const ranks = {}
            let currentRank = 1
            let previousScore = null

            sorted.forEach((item, index) => {
                if (scoreKey === 'name' || scoreKey === 'domain') {
                    ranks[item.id] = index + 1
                } else {
                    if (previousScore !== null && item.roundedScore !== previousScore) {
                        currentRank = index + 1
                    }
                    ranks[item.id] = currentRank
                    previousScore = item.roundedScore
                }
            })

            return ranks
        }

        // 方法：获取排名
        const getRank = (dataset, data, scoreKey, isDetailed = false, selectedType = null) => {
            if (dataset.name === 'base') return '-'; // base 不参与排名
            const ranks = calculateRanks(data.filter(item => item.name !== 'base'), scoreKey, isDetailed, selectedType)
            return ranks[dataset.id] || 1
        }

        // 排序状态
        const sortColumn = ref('overall_avg') // 当前排序列
        const sortDirection = ref('desc') // 排序方向：'asc' 或 'desc'
        const detailedSortColumn = ref('') // 详细表格的排序列
        const detailedSortDirection = ref('desc') // 详细表格的排序方向

        // 新增：支持 year 和 size 排序
        const sortBy = (column) => {
            if (column === 'year' || column === 'size') return; // 禁止 year/size 排序
            if (sortColumn.value === column) {
                sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
            } else {
                sortColumn.value = column
                sortDirection.value = 'desc'
            }
            if (column !== 'domain') {
                highlightColumn(column, false);
            }
        }
        const sortDetailedBy = (column) => {
            if (column === 'year' || column === 'size') return; // 禁止 year/size 排序
            if (detailedSortColumn.value === column) {
                detailedSortDirection.value = detailedSortDirection.value === 'asc' ? 'desc' : 'asc'
            } else {
                detailedSortColumn.value = column
                detailedSortDirection.value = 'desc'
            }
            if (column !== 'domain') {
                highlightColumn(column, true);
            }
        }

        // 方法：获取排序图标
        const getSortIcon = (column, isDetailed = false) => {
            const currentSortColumn = isDetailed ? detailedSortColumn.value : sortColumn.value
            const currentSortDirection = isDetailed ? detailedSortDirection.value : sortDirection.value
            
            if (currentSortColumn === column) {
                return currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'
            }
            return 'fas fa-sort'
        }

        // 方法：高亮列
        const highlightColumn = (columnKey, isDetailed = false) => {
            if (columnKey === 'domain') return; // 如果是domain列，则不进行高亮

            if (isDetailed) {
                highlightedDetailedColumn.value = columnKey;
            } else {
                highlightedColumn.value = columnKey;
            }
        };

        // 订阅弹窗逻辑
        function setupSubscribeModal() {
            const btn = document.getElementById('subscribe-btn');
            const modal = document.getElementById('subscribe-modal');
            const close = modal.querySelector('.close-modal');
            const form = document.getElementById('subscribe-form');
            const emailInput = document.getElementById('subscribe-email');
            const successMsg = document.getElementById('subscribe-success');
            const errorMsg = document.getElementById('subscribe-error');
            if (!btn || !modal || !close || !form) return;
            btn.onclick = () => { modal.classList.add('show'); successMsg.style.display = 'none'; errorMsg.style.display = 'none'; emailInput.value = ''; };
            close.onclick = () => { modal.classList.remove('show'); };
            window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
            form.onsubmit = async function(e) {
                e.preventDefault();
                successMsg.style.display = 'none';
                errorMsg.style.display = 'none';
                const email = emailInput.value.trim();
                if (!email) return;
                // Google Sheets API 端点（需替换为你的 Apps Script 部署地址）
                const endpoint = 'https://script.google.com/macros/s/AKfycbw0AQD1p9wet2wowaC1rxmjo-Aw-bpyRkTMMRq4KXgqvak84CD7BSgEmVfKYcPQHSPR/exec';
                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'email=' + encodeURIComponent(email)
                    });
                    if (res.ok) {
                        successMsg.style.display = 'block';
                        errorMsg.style.display = 'none';
                        emailInput.value = '';
                    } else {
                        throw new Error('Network error');
                    }
                } catch (err) {
                    errorMsg.style.display = 'block';
                    successMsg.style.display = 'none';
                }
            };
        }
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(setupSubscribeModal, 500);
        } else {
            document.addEventListener('DOMContentLoaded', () => setTimeout(setupSubscribeModal, 500));
        }

        // 挂载时加载数据
        onMounted(() => {
            loadData()
            
            // 添加全局点击事件来关闭下拉框
            document.addEventListener('click', (event) => {
                const multiselectContainers = document.querySelectorAll('.multiselect-container')
                let clickedInsideDropdown = false
                
                multiselectContainers.forEach(container => {
                    if (container.contains(event.target)) {
                        clickedInsideDropdown = true
                    }
                })
                
                if (!clickedInsideDropdown) {
                    showDomainDropdown.value = false
                    showTypeDropdown.value = false
                }
            })
        })

        return {
            // 响应式数据
            loading,
            error,
            currentModel,
            searchQuery,
            selectedDomains,
            selectedType,
            showDomainDropdown,
            showTypeDropdown,
            sortColumn,
            sortDirection,
            detailedSortColumn,
            detailedSortDirection,
            highlightedColumn, // 导出
            highlightedDetailedColumn, // 导出
            
            // 配置数据
            models,
            
            // 计算属性
            currentData,
            filteredData,
            filteredDataForRanking,
            detailedFilteredData,
            detailedFilteredDataForRanking,
            currentModelInfo,
            availableDomains,
            orderedDomains,
            
            // 方法
            switchModel,
            resetFilters,
            removeDomain,
            selectType,
            clearType,
            toggleDomainDropdown,
            toggleTypeDropdown,
            toggleDomain,
            onTypeChange,
            getDomainIcon,
            getTypeIcon,
            getDomainDescription,
            sortBy,
            sortDetailedBy,
            getSortIcon,
            formatScore,
            formatScoreWithImprovement,
            roundToOneDecimal,
            calculateRanks,
            getRank,
            getScoreClass,
            getRankClass,
            getDomainClass,
            getTypeDisplayName,
            getTaskHeaders,
            getTasksForDomain,
            getTaskScore,
            getTypeAverage,
            getTypeAverageValue,
            highlightColumn // 导出
        }
    }
})

app.mount('#app')