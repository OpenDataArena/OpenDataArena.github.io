const { createApp, ref, computed, onMounted } = Vue

const app = createApp({
    setup() {
        // 数据状态
        const rawData = ref({})
        const currentModel = ref('llama')
        const searchQuery = ref('')
        const selectedTags = ref([]) // 数组支持多选
        const tagFilterMode = ref('include') // 'include' 或 'exclusive'
        const selectedType = ref('') // 改回单选
        const improvementType = ref('vs_base') // 新增：improvement类型选择
        const sizeRangeMin = ref(0) // 数据量区间最小值索引
        const sizeRangeMax = ref(7) // 数据量区间最大值索引
        const minSlider = ref(null) // 最小值滑动条引用
        const maxSlider = ref(null) // 最大值滑动条引用
        const showDomainDropdown = ref(false) // 控制数据领域下拉框显示
        const showTypeDropdown = ref(false) // 控制榜单领域下拉框显示
        const loading = ref(true)
        const error = ref(null)

        // 新增：用于列高亮的状态
        const highlightedColumn = ref(null) // 主表格高亮列
        const highlightedDetailedColumn = ref(null) // 详细表格高亮列

        // 排序状态
        const sortColumn = ref('overall_avg') // 当前排序列
        const sortDirection = ref('desc') // 排序方向：'asc' 或 'desc'
        const detailedSortColumn = ref('') // 详细表格的排序列
        const detailedSortDirection = ref('desc') // 详细表格的排序方向

        // 模型配置
        const models = ref([
            { id: 'llama', name: 'LLaMA Family', icon: 'fas fa-robot' },
            { id: 'qwen', name: 'Qwen Family', icon: 'fas fa-microchip' }
        ])

        // 数据量刻度配置（对数刻度）
        const sizeValues = ref([
            0, 1000, 10000, 50000, 100000, 500000, 1000000, Infinity
        ])
        
        const sizeSliderMax = ref(7) // 最大索引值

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

        // 解析size字符串为数值（用于区间筛选）
        const parseSizeToNumber = (sizeStr) => {
            if (!sizeStr || sizeStr === '-' || sizeStr === '') return 0
            
            // 移除空格并转为小写
            const size = sizeStr.toString().toLowerCase().trim()
            
            // 提取数字部分
            const match = size.match(/^([0-9.]+)\s*([a-z]*)$/)
            if (!match) return 0
            
            const number = parseFloat(match[1])
            const unit = match[2]
            
            // 根据单位转换为实际数值
            switch(unit) {
                case 'k':
                    return number * 1000
                case 'm':
                    return number * 1000000
                case 'b':
                    return number * 1000000000
                case '':
                case 'b': // 有些数据可能直接是数字
                    return number
                default:
                    return number
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
            
            const baseModel = currentData.value.find(item => isBaseModel(item));
            const instructModel = currentData.value.find(item => isInstructModel(item));
            const otherModels = currentData.value.filter(item => !isBaseModel(item) && !isInstructModel(item));

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
                
                // 如果是年份列，使用数值比较，年份相同时按平均分排序
                if (sortColumn.value === 'year') {
                    const yearA = parseInt(a.year) || 0
                    const yearB = parseInt(b.year) || 0
                    if (yearA === yearB) {
                        // 年份相同时，按平均分降序排序
                        const avgA = a.overall_avg || 0
                        const avgB = b.overall_avg || 0
                        return avgB - avgA
                    }
                    return sortDirection.value === 'asc' ? yearA - yearB : yearB - yearA
                }
                
                // 数值比较
                return sortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
            });

            // 构建结果数组：instruct模型 -> base模型 -> 其他模型
            const result = [];
            if (instructModel) result.push(instructModel);
            if (baseModel) result.push(baseModel);
            result.push(...sortedOtherModels);
            
            return result;
        })

        // 计算属性：可用的标签列表
        const availableTags = computed(() => {
            if (!currentData.value.length) return []
            const allTags = new Set()
            
            currentData.value
                .filter(item => !isBaseModel(item) && !isInstructModel(item)) // 排除 base 和 instruct 模型
                .forEach(item => {
                    // 只从tag字段解析标签
                    const tagStr = item.tag || ''
                    if (tagStr) {
                        // 假设标签用逗号分隔
                        const tags = tagStr.split(',').map(t => t.trim()).filter(t => t)
                        tags.forEach(tag => allTags.add(tag))
                    }
                })
            
            return Array.from(allTags).sort()
        })
        
        // 计算属性：有序的标签列表（确保general、math、code、science、reasoning顺序）
        const orderedTags = computed(() => {
            const tags = availableTags.value
            const orderedTagsPriority = ['general', 'math', 'code', 'science', 'reasoning']
            
            // 先添加按照优先级排序的常见标签
            const result = []
            orderedTagsPriority.forEach(tag => {
                if (tags.includes(tag)) {
                    result.push(tag)
                }
            })
            
            // 再添加其他标签
            tags.forEach(tag => {
                if (!orderedTagsPriority.includes(tag)) {
                    result.push(tag)
                }
            })
            
            return result
        })

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
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据标签多选过滤
            if (selectedTags.value.length > 0) {
                filtered = filtered.filter(dataset => {
                    // 获取数据集的标签
                    const datasetTags = getDatasetTags(dataset)
                    
                    if (tagFilterMode.value === 'exclusive') {
                        // 仅包含模式：数据集必须只包含选中的标签
                        return selectedTags.value.every(tag => datasetTags.includes(tag)) &&
                               datasetTags.every(tag => selectedTags.value.includes(tag))
                    } else {
                        // 包含模式：数据集必须包含至少一个选中的标签
                        return selectedTags.value.some(tag => datasetTags.includes(tag))
                    }
                })
            }

            // 数据量区间过滤
            if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
                filtered = filtered.filter(dataset => isInSizeRange(dataset))
            }
            
            // 构建结果数组：instruct模型 -> base模型 -> 过滤后的其他模型
            const result = [];
            if (instructModel) result.push(instructModel);
            if (baseModel) result.push(baseModel);
            result.push(...filtered);
            
            return result;
        })

        // 计算属性：未排序的过滤数据（用于排名计算）
        const filteredDataForRanking = computed(() => {
            let filtered = currentData.value.filter(item => !isBaseModel(item) && !isInstructModel(item)); // 排除 base 和 instruct

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据标签多选过滤
            if (selectedTags.value.length > 0) {
                filtered = filtered.filter(dataset => {
                    // 获取数据集的标签
                    const datasetTags = getDatasetTags(dataset)
                    
                    if (tagFilterMode.value === 'exclusive') {
                        // 仅包含模式：数据集必须只包含选中的标签
                        return selectedTags.value.every(tag => datasetTags.includes(tag)) &&
                               datasetTags.every(tag => selectedTags.value.includes(tag))
                    } else {
                        // 包含模式：数据集必须包含至少一个选中的标签
                        return selectedTags.value.some(tag => datasetTags.includes(tag))
                    }
                })
            }

            // 数据量区间过滤
            if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
                filtered = filtered.filter(dataset => isInSizeRange(dataset))
            }

            return filtered
        })

        // 计算属性：详细表格的未排序过滤数据（用于排名计算）
        const detailedFilteredDataForRanking = computed(() => {
            if (!selectedType.value) return []
            
            let filtered = currentData.value.filter(item => !isBaseModel(item) && !isInstructModel(item)); // 排除 base 和 instruct

            // 搜索过滤
            if (searchQuery.value) {
                filtered = filtered.filter(dataset => 
                    dataset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
                )
            }

            // 数据标签多选过滤
            if (selectedTags.value.length > 0) {
                filtered = filtered.filter(dataset => {
                    // 获取数据集的标签
                    const datasetTags = getDatasetTags(dataset)
                    
                    if (tagFilterMode.value === 'exclusive') {
                        // 仅包含模式：数据集必须只包含选中的标签
                        return selectedTags.value.every(tag => datasetTags.includes(tag)) &&
                               datasetTags.every(tag => selectedTags.value.includes(tag))
                    } else {
                        // 包含模式：数据集必须包含至少一个选中的标签
                        return selectedTags.value.some(tag => datasetTags.includes(tag))
                    }
                })
            }

            // 数据量区间过滤
            if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
                filtered = filtered.filter(dataset => isInSizeRange(dataset))
            }

            return filtered
        })

        // 计算属性：详细表格的过滤数据
        const detailedFilteredData = computed(() => {
            if (!selectedType.value) return []
            
            const baseModel = currentData.value.find(item => isBaseModel(item));
            const instructModel = currentData.value.find(item => isInstructModel(item));
            let otherModels = currentData.value.filter(item => !isBaseModel(item) && !isInstructModel(item));
            
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
                        // 按领域排序（保留向后兼容，但使用第一个标签）
                        const tagsA = getDatasetTags(a)
                        const tagsB = getDatasetTags(b)
                        const domainA = tagsA.length > 0 ? tagsA[0] : ''
                        const domainB = tagsB.length > 0 ? tagsB[0] : ''
                        return detailedSortDirection.value === 'asc' ? 
                            domainA.localeCompare(domainB) : 
                            domainB.localeCompare(domainA)
                    } else if (detailedSortColumn.value === 'year') {
                        // 按年份排序，年份相同时按该类型的平均分排序
                        const yearA = parseInt(a.year) || 0
                        const yearB = parseInt(b.year) || 0
                        if (yearA === yearB) {
                            // 年份相同时，按该类型的平均分降序排序
                            const avgA = getTypeAverageValue(a, primaryType)
                            const avgB = getTypeAverageValue(b, primaryType)
                            return avgB - avgA
                        }
                        return detailedSortDirection.value === 'asc' ? yearA - yearB : yearB - yearA
                    } else if (detailedSortColumn.value === 'average') {
                        // 按平均分排序
                        const scoreA = getTypeAverageValue(a, primaryType)
                        const scoreB = getTypeAverageValue(b, primaryType)
                        return detailedSortDirection.value === 'asc' ? scoreA - scoreB : scoreB - scoreA
                    } else if (detailedSortColumn.value === 'efficiency') {
                        // 按性价比排序
                        const efficiencyA = getTypeEfficiency(a, primaryType)
                        const efficiencyB = getTypeEfficiency(b, primaryType)
                        return detailedSortDirection.value === 'asc' ? efficiencyA - efficiencyB : efficiencyB - efficiencyA
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

            // 数据标签多选过滤
            if (selectedTags.value.length > 0) {
                filtered = filtered.filter(dataset => {
                    // 获取数据集的标签
                    const datasetTags = getDatasetTags(dataset)
                    
                    if (tagFilterMode.value === 'exclusive') {
                        // 仅包含模式：数据集必须只包含选中的标签
                        return selectedTags.value.every(tag => datasetTags.includes(tag)) &&
                               datasetTags.every(tag => selectedTags.value.includes(tag))
                    } else {
                        // 包含模式：数据集必须包含至少一个选中的标签
                        return selectedTags.value.some(tag => datasetTags.includes(tag))
                    }
                })
            }

            // 数据量区间过滤
            if (!(sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value)) {
                filtered = filtered.filter(dataset => isInSizeRange(dataset))
            }

            // 构建结果数组：instruct模型 -> base模型 -> 过滤后的其他模型
            const result = [];
            if (instructModel) result.push(instructModel);
            if (baseModel) result.push(baseModel);
            result.push(...filtered);
            
            return result;
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
            selectedTags.value = []
            selectedType.value = ''
            showDomainDropdown.value = false
            showTypeDropdown.value = false
        }
        
        // 方法：移除所选标签
        const removeTag = (tag) => {
            selectedTags.value = selectedTags.value.filter(t => t !== tag)
        }
        
        // 方法：移除所选领域 - 保留向后兼容
        const removeDomain = (domain) => {
            // 将domain转换为对应的tag并移除
            const domainToTagMap = {
                'general': 'general',
                'math': 'math', 
                'code': 'code',
                'reasoning': 'science' // reasoning映射到science
            }
            const tag = domainToTagMap[domain]
            if (tag) {
                selectedTags.value = selectedTags.value.filter(t => t !== tag)
            }
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

        // 方法：更新数据量区间最小值
        const updateSizeRangeMin = (event) => {
            const value = parseInt(event.target.value)
            // 只有当新值不超过右端点时才更新
            if (value <= sizeRangeMax.value) {
                sizeRangeMin.value = value
            } else {
                // 强制重置到有效值
                event.preventDefault()
                event.target.value = sizeRangeMin.value
                // 确保DOM同步
                setTimeout(() => {
                    if (minSlider.value) {
                        minSlider.value.value = sizeRangeMin.value
                    }
                }, 0)
            }
        }

        // 方法：更新数据量区间最大值
        const updateSizeRangeMax = (event) => {
            const value = parseInt(event.target.value)
            // 只有当新值不小于左端点时才更新
            if (value >= sizeRangeMin.value) {
                sizeRangeMax.value = value
            } else {
                // 强制重置到有效值
                event.preventDefault()
                event.target.value = sizeRangeMax.value
                // 确保DOM同步
                setTimeout(() => {
                    if (maxSlider.value) {
                        maxSlider.value.value = sizeRangeMax.value
                    }
                }, 0)
            }
        }

        // 方法：处理滑动条鼠标按下事件
        const onSliderMouseDown = (event) => {
            // 记录当前值，以便在需要时恢复
            const currentMinValue = sizeRangeMin.value
            const currentMaxValue = sizeRangeMax.value
            
            // 添加全局鼠标释放监听器
            const onMouseUp = () => {
                // 最终验证和修正
                if (minSlider.value) {
                    minSlider.value.value = sizeRangeMin.value
                }
                if (maxSlider.value) {
                    maxSlider.value.value = sizeRangeMax.value
                }
                document.removeEventListener('mouseup', onMouseUp)
                document.removeEventListener('touchend', onMouseUp)
            }
            
            document.addEventListener('mouseup', onMouseUp)
            document.addEventListener('touchend', onMouseUp)
        }

        // 方法：根据索引获取数据量数值
        const getSizeValueFromIndex = (index) => {
            return sizeValues.value[index] || 0
        }

        // 方法：格式化数据量标签
        const formatSizeLabel = (size) => {
            if (size === 0) return '0'
            if (size === Infinity || size >= 1000000) {
                if (size === Infinity) return '1M+'
                return (size / 1000000).toFixed(0) + 'M'
            }
            if (size >= 1000) return (size / 1000).toFixed(0) + 'K'
            return size.toString()
        }

        // 方法：获取滑动条范围样式
        const getRangeStyle = () => {
            const minPercent = (sizeRangeMin.value / 7) * 100
            const maxPercent = (sizeRangeMax.value / 7) * 100
            return {
                left: minPercent + '%',
                width: (maxPercent - minPercent) + '%'
            }
        }

        // 方法：检查数据集是否在选中的大小范围内
        const isInSizeRange = (dataset) => {
            const sizeNum = parseSizeToNumber(dataset.size)
            const minSize = getSizeValueFromIndex(sizeRangeMin.value)
            const maxSize = getSizeValueFromIndex(sizeRangeMax.value)
            
            // 如果是完整范围，不过滤
            if (sizeRangeMin.value === 0 && sizeRangeMax.value === sizeSliderMax.value) {
                return true
            }
            
            return sizeNum >= minSize && (maxSize === Infinity ? true : sizeNum <= maxSize)
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
        
        // 方法：获取数据集的标签列表
        const getDatasetTags = (dataset) => {
            const tags = []
            
            // 只从tag字段解析标签
            const tagStr = dataset.tag || ''
            if (tagStr) {
                // 假设标签用逗号分隔
                const parsedTags = tagStr.split(',').map(t => t.trim()).filter(t => t)
                tags.push(...parsedTags)
            }
            
            return tags
        }
        
        // 方法：切换标签选择（多选）
        const toggleTag = (tag) => {
            const index = selectedTags.value.indexOf(tag)
            if (index > -1) {
                selectedTags.value.splice(index, 1)
            } else {
                selectedTags.value.push(tag)
            }
        }
        
        // 方法：切换数据领域选择（多选）- 保留向后兼容
        const toggleDomain = (domain) => {
            // 将domain转换为对应的tag并切换
            const domainToTagMap = {
                'general': 'general',
                'math': 'math', 
                'code': 'code',
                'reasoning': 'science' // reasoning映射到science
            }
            const tag = domainToTagMap[domain]
            if (tag) {
                toggleTag(tag)
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
        
        // 方法：获取标签对应的图标
        const getTagIcon = (tag) => {
            const tagIcons = {
                'general': 'fas fa-book',
                'math': 'fas fa-calculator',
                'code': 'fas fa-code',
                'science': 'fas fa-flask',
                'reasoning': 'fas fa-brain'
            }
            
            return tagIcons[tag.toLowerCase()] || 'fas fa-tag'
        }
        
        // 方法：获取领域对应的图标 - 保留向后兼容
        const getDomainIcon = (domain) => {
            const domainIcons = {
                'general': 'fas fa-book',
                'math': 'fas fa-calculator',
                'code': 'fas fa-code',
                'reasoning': 'fas fa-brain'
            }
            
            return domainIcons[domain.toLowerCase()] || 'fas fa-tag'
        }
        
        // 方法：获取标签显示名称（首字母大写）
        const getTagDisplayName = (tag) => {
            if (!tag) return ''
            return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
        }
        
        // 方法：获取领域显示名称（首字母大写）- 保留向后兼容
        const getDomainDisplayName = (domain) => {
            if (!domain) return ''
            return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase()
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
        const formatScoreWithImprovement = (score, improvementValue, dataset = null, improvementType = 'vs_base') => {
            const formattedScore = formatScore(score)
            let diffText = null;
            let diffClass = '';

            // 如果dataset有新的improvement结构，使用新的结构
            if (dataset && dataset.improvement && dataset.improvement[improvementType]) {
                // 根据score类型确定使用哪个improvement值
                let actualImprovementValue = null;
                if (typeof score === 'number') {
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
                
                if (typeof actualImprovementValue === 'number') {
                    improvementValue = actualImprovementValue;
                }
            }

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

        // 方法：检查是否是base模型
        const isBaseModel = (dataset) => {
            return dataset.domain === 'base'
        }

        // 方法：检查是否是instruct模型
        const isInstructModel = (dataset) => {
            return dataset.domain === 'instruct'
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
                // Find the first model with task_details to use as a template (excluding base and instruct for consistency)
                const modelForHeaders = currentData.value.find(item => !isBaseModel(item) && !isInstructModel(item) && item.task_details);

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
        const getTaskScore = (dataset, type, taskNameFromHeader, metricNameFromHeader, raw = false, improvementType = 'vs_base') => {
            if (!dataset || !type || !taskNameFromHeader) {
                return raw ? 0 : { score: '0.0', diffText: null, diffClass: '' };
            }

            if (isBaseModel(dataset) || isInstructModel(dataset)) {
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
                            diffText: null, // Base and instruct models do not have improvement scores for sub-tasks
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
            
            // 支持新的improvement结构
            if (dataset.improvement) {
                let improvementArray = null;
                if (dataset.improvement[improvementType] && dataset.improvement[improvementType][improvementArrayKey]) {
                    // 新的结构：improvement.vs_base 或 improvement.vs_instruct
                    improvementArray = dataset.improvement[improvementType][improvementArrayKey];
                } else if (dataset.improvement[improvementArrayKey]) {
                    // 旧的结构：直接访问
                    improvementArray = dataset.improvement[improvementArrayKey];
                }
                
                if (improvementArray && indexInCurrentDatasetScores !== -1 && improvementArray.length > indexInCurrentDatasetScores) {
                    improvementValue = improvementArray[indexInCurrentDatasetScores];
                }
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
        const getTypeAverage = (dataset, type, improvementType = 'vs_base') => {
            const avgKey = type + '_avg';
            const scoreValue = dataset[avgKey] || 0;
            
            // 支持新的improvement结构
            let improvementValue = null;
            if (dataset.improvement) {
                if (dataset.improvement[improvementType]) {
                    // 新的结构：improvement.vs_base 或 improvement.vs_instruct
                    improvementValue = dataset.improvement[improvementType][avgKey];
                } else if (dataset.improvement[avgKey]) {
                    // 旧的结构：直接访问 improvement.general_avg 等
                    improvementValue = dataset.improvement[avgKey];
                }
            }

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

        // 方法：获取类型性价比分数
        const getTypeEfficiency = (dataset, type) => {
            const efficiencyKey = type + '_efficiency';
            return dataset[efficiencyKey] || 0;
        }

        // 方法：获取类型平均分数值（用于排序）
        const getTypeAverageValue = (dataset, type) => {
            const avgKey = type + '_avg'
            return dataset[avgKey] || 0
        }

        // 方法：计算排名（考虑相同分数）
        const calculateRanks = (data, scoreKey, isDetailed = false, selectedType = null, improvementType = 'vs_base') => {
            let dataToRank = data.filter(item => !isBaseModel(item)); // 排除 base
            let dataWithRoundedScores

            if (isDetailed && scoreKey && scoreKey !== 'name' && scoreKey !== 'domain') {
                if (scoreKey === 'average') {
                    // 详细表格的平均分排名
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: roundToOneDecimal(getTypeAverageValue(item, selectedType))
                    }))
                } else if (scoreKey === 'efficiency') {
                    // 详细表格的性价比排名
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: getTypeEfficiency(item, selectedType)
                    }))
                } else if (scoreKey.includes('_')) {
                    // 特定任务的排名
                    const taskHeaders = getTaskHeaders(selectedType)
                    const header = taskHeaders.find(h => h.taskName + '_' + h.metricName === scoreKey)
                    if (header) {
                        dataWithRoundedScores = data.map(item => ({
                            ...item,
                            roundedScore: roundToOneDecimal(getTaskScore(item, selectedType, header.taskName, header.metricName, true, improvementType))
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
                if (scoreKey.includes('_efficiency')) {
                    // 对于所有数据性价比列，直接使用原始值进行排序
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: item[scoreKey] || 0
                    }))
                } else {
                    dataWithRoundedScores = data.map(item => ({
                        ...item,
                        roundedScore: roundToOneDecimal(item[scoreKey] || 0)
                    }))
                }
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
        const getRank = (dataset, data, scoreKey, isDetailed = false, selectedType = null, improvementType = 'vs_base') => {
            if (isBaseModel(dataset)) return '-'; // base 不参与排名
            const ranks = calculateRanks(data.filter(item => !isBaseModel(item)), scoreKey, isDetailed, selectedType, improvementType)
            return ranks[dataset.id] || 1
        }

        // 新增：支持 year 和 size 排序
        const sortBy = (column) => {
            if (column === 'size') return; // 只禁止 size 排序，允许 year 排序
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
            if (column === 'size') return; // 只禁止 size 排序，允许 year 排序
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

        // 方法：格式化数据性价比分数
        const formatEfficiencyScore = (efficiency) => {
            if (typeof efficiency !== 'number' || efficiency === 0) {
                return '-';
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
            return (efficiency > 0 ? '+' : '') + efficiency.toFixed(precision);
        };

        // 方法：格式化数据性价比涨跌
        const formatEfficiencyDiff = (efficiencyDiff) => {
            if (typeof efficiencyDiff !== 'number') {
                return '';
            }
            if (efficiencyDiff === 0) {
                return '0.000000';
            }
            return (efficiencyDiff > 0 ? '+' : '') + efficiencyDiff.toFixed(6);
        };

        // 方法：获取数据性价比涨跌的CSS类
        const getEfficiencyDiffClass = (efficiencyDiff) => {
            if (typeof efficiencyDiff !== 'number') {
                return '';
            }
            if (efficiencyDiff === 0) {
                return 'score-diff-positive'; // 0值显示为绿色
            }
            return efficiencyDiff > 0 ? 'score-diff-positive' : 'score-diff-negative';
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
                // Google Sheets API 端点
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

        // 贡献者数据
        const contributors = ref([
            {
                id: 1,
                name: "Dr. Sarah Chen",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 2,
                name: "Prof. Michael Rodriguez",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 3,
                name: "Dr. Emily Johnson",
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 4,
                name: "Prof. David Kim",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 5,
                name: "Dr. Lisa Wang",
                avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 6,
                name: "Prof. James Wilson",
                avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 7,
                name: "Dr. Maria Garcia",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 8,
                name: "Prof. Robert Taylor",
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 9,
                name: "Dr. Anna Lee",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 10,
                name: "Prof. Thomas Brown",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 11,
                name: "Dr. Jennifer Davis",
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face"
            },
            {
                id: 12,
                name: "Prof. Christopher Miller",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face"
            }
        ])

        // 打开贡献指南页面
        const openContributionGuide = () => {
            const guideUrl = 'contribution-guide.html'
            window.open(guideUrl, '_blank')
        }

        // 打开反馈表单
        const openFeedbackForm = () => {
            console.log('Feedback button clicked!') // 调试信息
            const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSe2Mh4L3e-1TvlCl-Qfl_WasFk2dPO2mFcbmfMG4iF9IgKuIQ/viewform?usp=dialog'
            
            try {
                // 尝试打开新窗口
                const newWindow = window.open(googleFormUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
                
                // 检查是否被阻止
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    console.log('Popup blocked, trying alternative method')
                    // 如果弹窗被阻止，直接在当前窗口打开
                    window.location.href = googleFormUrl
                } else {
                    console.log('Popup opened successfully')
                }
            } catch (error) {
                console.error('Error opening feedback form:', error)
                // 备用方案：直接跳转
                window.location.href = googleFormUrl
            }
        }

        // 选择比较基准的函数
        const selectBaseline = (dataset) => {
            if (dataset.domain === 'base') {
                improvementType.value = 'vs_base'
            } else if (dataset.domain === 'instruct') {
                improvementType.value = 'vs_instruct'
            }
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
            selectedTags,
            tagFilterMode,
            selectedType,
            improvementType,
            sizeRangeMin,
            sizeRangeMax,
            minSlider,
            maxSlider,
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
            sizeValues,
            sizeSliderMax,
            
            // 计算属性
            currentData,
            filteredData,
            filteredDataForRanking,
            detailedFilteredData,
            detailedFilteredDataForRanking,
            currentModelInfo,
            availableTags,
            orderedTags,
            
            // 方法
            isBaseModel,
            isInstructModel,
            switchModel,
            resetFilters,
            removeTag,
            removeDomain,
            selectType,
            clearType,
            updateSizeRangeMin,
            updateSizeRangeMax,
            onSliderMouseDown,
            getSizeValueFromIndex,
            formatSizeLabel,
            getRangeStyle,
            isInSizeRange,
            toggleDomainDropdown,
            toggleTypeDropdown,
            toggleTag,
            toggleDomain,
            getDatasetTags,
            onTypeChange,
            getTagIcon,
            getTagDisplayName,
            getDomainIcon,
            getDomainDisplayName,
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
            getTypeEfficiency,
            getTypeAverageValue,
            highlightColumn, // 导出
            formatEfficiencyScore,
            formatEfficiencyDiff,
            getEfficiencyDiffClass,
            openFeedbackForm, // 反馈功能
            contributors, // 贡献者数据
            openContributionGuide, // 打开贡献指南
            selectBaseline // 选择比较基准
        }
    }
})

app.mount('#app')