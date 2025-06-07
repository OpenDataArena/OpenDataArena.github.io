const { createApp, ref, computed, onMounted } = Vue

const app = createApp({
    setup() {
        // 数据状态
        const rawData = ref({})
        const currentModel = ref('llama')
        const searchQuery = ref('')
        const selectedDomain = ref('')
        const selectedType = ref('')
        const loading = ref(true)
        const error = ref(null)

        // 模型配置
        const models = ref([
            { id: 'llama', name: 'LLaMA 系列', icon: 'fas fa-robot' },
            { id: 'qwen', name: 'Qwen 系列', icon: 'fas fa-microchip' }
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
            
            return [...currentData.value].sort((a, b) => {
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
            })
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
            let filtered = sortedData.value

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 领域过滤
            if (selectedDomain.value) {
                filtered = filtered.filter(dataset => dataset.domain === selectedDomain.value)
            }

            return filtered
        })

        // 计算属性：详细表格的过滤数据
        const detailedFilteredData = computed(() => {
            if (!selectedType.value) return []
            
            let filtered = [...currentData.value]
            
            // 排序逻辑
            filtered.sort((a, b) => {
                if (detailedSortColumn.value) {
                    // 如果是特定任务的排序
                    if (detailedSortColumn.value.includes('_')) {
                        // 更安全的分解方式：从任务头信息中查找匹配
                        const taskHeaders = getTaskHeaders(selectedType.value)
                        const header = taskHeaders.find(h => h.taskName + '_' + h.metricName === detailedSortColumn.value)
                        if (header) {
                            const scoreA = getTaskScore(a, selectedType.value, header.taskName, header.metricName, true) || 0
                            const scoreB = getTaskScore(b, selectedType.value, header.taskName, header.metricName, true) || 0
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
                        const scoreA = getTypeAverageValue(a, selectedType.value)
                        const scoreB = getTypeAverageValue(b, selectedType.value)
                        return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                    } else {
                        // 其他情况按平均分排序
                        const scoreA = getTypeAverageValue(a, selectedType.value)
                        const scoreB = getTypeAverageValue(b, selectedType.value)
                        return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                    }
                } else {
                    // 默认按平均分降序排序
                    const scoreA = getTypeAverageValue(a, selectedType.value)
                    const scoreB = getTypeAverageValue(b, selectedType.value)
                    return scoreB - scoreA
                }
            })

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 领域过滤
            if (selectedDomain.value) {
                filtered = filtered.filter(dataset => dataset.domain === selectedDomain.value)
            }

            return filtered
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
            selectedDomain.value = ''
            selectedType.value = ''
        }
        
        // 方法：选择领域
        const selectDomain = (domain) => {
            selectedDomain.value = domain
        }
        
        // 方法：选择类型
        const selectType = (type) => {
            selectedType.value = type
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

        // 方法：格式化分数
        const formatScore = (score) => {
            if (typeof score === 'number') {
                return score.toFixed(1)
            }
            return '0.0'
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
                const firstModel = currentData.value[0]
                if (firstModel.task_details) {
                    const domainKey = type + '_tasks'
                    const tasks = firstModel.task_details[domainKey] || []
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
            
            // 如果没有数据，返回空数组
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
        const getTaskScore = (dataset, type, taskName, metricName = null, raw = false) => {
            // 直接从 task_details 中获取分数
            if (dataset.task_details) {
                const domainKey = type + '_tasks'
                const tasks = dataset.task_details[domainKey] || []
                const task = tasks.find(t => t.task_name === taskName)
                if (task && task.metrics && task.metrics.length > 0) {
                    if (metricName) {
                        // 如果指定了指标名称，找到对应的指标
                        const metric = task.metrics.find(m => m.metric === metricName)
                        if (metric) {
                            return raw ? metric.score : formatScore(metric.score)
                        }
                    } else {
                        // 如果没有指定指标名称，返回第一个指标的分数
                        return raw ? task.metrics[0].score : formatScore(task.metrics[0].score)
                    }
                }
            }
            return raw ? 0 : '0.0'
        }

        // 方法：获取类型平均分
        const getTypeAverage = (dataset, type) => {
            const avgKey = type + '_avg'
            return formatScore(dataset[avgKey] || 0)
        }

        // 方法：获取类型平均分数值（用于排序）
        const getTypeAverageValue = (dataset, type) => {
            const avgKey = type + '_avg'
            return dataset[avgKey] || 0
        }

        // 排序状态
        const sortColumn = ref('overall_avg') // 当前排序列
        const sortDirection = ref('desc') // 排序方向：'asc' 或 'desc'
        const detailedSortColumn = ref('') // 详细表格的排序列
        const detailedSortDirection = ref('desc') // 详细表格的排序方向

        // 方法：排序功能
        const sortBy = (column) => {
            if (sortColumn.value === column) {
                // 如果已经是当前排序列，切换排序方向
                sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
            } else {
                // 如果是新的排序列，设置为降序
                sortColumn.value = column
                sortDirection.value = 'desc'
            }
        }

        // 方法：详细表格排序功能
        const sortDetailedBy = (column) => {
            if (detailedSortColumn.value === column) {
                // 如果已经是当前排序列，切换排序方向
                detailedSortDirection.value = detailedSortDirection.value === 'asc' ? 'desc' : 'asc'
            } else {
                // 如果是新的排序列，设置为降序
                detailedSortColumn.value = column
                detailedSortDirection.value = 'desc'
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

        // 挂载时加载数据
        onMounted(() => {
            loadData()
        })

        return {
            // 响应式数据
            loading,
            error,
            currentModel,
            searchQuery,
            selectedDomain,
            selectedType,
            
            // 配置数据
            models,
            
            // 计算属性
            filteredData,
            detailedFilteredData,
            currentModelInfo,
            availableDomains,
            orderedDomains,
            
            // 方法
            switchModel,
            resetFilters,
            selectDomain,
            selectType,
            getDomainIcon,
            getDomainDescription,
            sortBy,
            sortDetailedBy,
            getSortIcon,
            formatScore,
            getScoreClass,
            getRankClass,
            getDomainClass,
            getTypeDisplayName,
            getTaskHeaders,
            getTasksForDomain,
            getTaskScore,
            getTypeAverage,
            getTypeAverageValue
        }
    }
})

app.mount('#app')
