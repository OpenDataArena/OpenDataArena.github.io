// 为多选下拉框添加自定义交互
document.addEventListener('DOMContentLoaded', () => {
    // 确保Vue已经实例化并且DOM已经完全加载
    setTimeout(() => {
        setupDropdowns();
    }, 800);
    
    // 监听下拉框容器的点击
    function setupDropdowns() {
        console.log('Setting up dropdowns...');
        
        // 设置数据领域多选下拉框
        setupMultiSelect();
        
        // 设置榜单领域单选下拉框
        setupSingleSelect();
    }
    
    function setupMultiSelect() {
        const domainContainer = document.querySelector('#domain-select').parentNode;
        if (!domainContainer) {
            console.error('Domain select container not found');
            setTimeout(setupMultiSelect, 500);
            return;
        }
        
        const select = domainContainer.querySelector('select');
        const selectedOptions = domainContainer.querySelector('.selected-options');
        
        if (!select || !selectedOptions) {
            console.error('Missing select or selectedOptions elements in domain container');
            setTimeout(setupMultiSelect, 500);
            return;
        }
        
        console.log('Setting up domain multiselect');
        
        // 点击选项容器时显示原生下拉框
        selectedOptions.addEventListener('click', (event) => {
            // 如果点击的是删除图标，不触发下拉框
            if (event.target.classList.contains('fa-times')) return;
            
            const rect = selectedOptions.getBoundingClientRect();
            select.style.opacity = '1';
            select.style.visibility = 'visible';
            select.style.zIndex = '100';
            select.style.width = rect.width + 'px';
            select.style.height = 'auto';
            select.style.maxHeight = '200px';
            select.style.minHeight = '150px';
            select.style.left = '0';
            select.style.top = '0';
            select.focus();
            
            // 阻止事件冒泡
            event.stopPropagation();
            
            // 点击其他区域关闭下拉框
            const closeSelect = (e) => {
                if (!domainContainer.contains(e.target)) {
                    select.style.opacity = '0';
                    select.style.visibility = 'hidden';
                    select.style.zIndex = '1';
                    document.removeEventListener('click', closeSelect);
                }
            };
            
            // 延迟添加全局点击监听，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', closeSelect);
            }, 100);
        });
    }
    
    function setupSingleSelect() {
        const typeContainer = document.querySelector('#type-select').parentNode;
        if (!typeContainer) {
            console.error('Type select container not found');
            setTimeout(setupSingleSelect, 500);
            return;
        }
        
        const select = typeContainer.querySelector('select');
        const selectedOptions = typeContainer.querySelector('.selected-options');
        
        if (!select || !selectedOptions) {
            console.error('Missing select or selectedOptions elements in type container');
            setTimeout(setupSingleSelect, 500);
            return;
        }
        
        console.log('Setting up type single select');
        
        // 点击选项容器时显示原生下拉框
        selectedOptions.addEventListener('click', (event) => {
            // 如果点击的是删除图标，不触发下拉框
            if (event.target.classList.contains('fa-times')) return;
            
            const rect = selectedOptions.getBoundingClientRect();
            select.style.opacity = '1';
            select.style.visibility = 'visible';
            select.style.zIndex = '100';
            select.style.width = rect.width + 'px';
            select.style.height = 'auto';
            select.style.maxHeight = '200px';
            select.style.left = '0';
            select.style.top = '0';
            select.focus();
            
            // 阻止事件冒泡
            event.stopPropagation();
            
            // 点击其他区域关闭下拉框
            const closeSelect = (e) => {
                if (!typeContainer.contains(e.target)) {
                    select.style.opacity = '0';
                    select.style.visibility = 'hidden';
                    select.style.zIndex = '1';
                    document.removeEventListener('click', closeSelect);
                }
            };
            
            // 单选下拉框选择后立即隐藏
            select.addEventListener('change', () => {
                setTimeout(() => {
                    select.style.opacity = '0';
                    select.style.visibility = 'hidden';
                    select.style.zIndex = '1';
                }, 100);
            }, { once: true });
            
            // 延迟添加全局点击监听，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', closeSelect);
            }, 100);
        });
            
    }
    
    // 初始化下拉框样式
    function initializeDropdowns() {
        // 初始化数据领域多选下拉框
        const domainSelect = document.querySelector('#domain-select');
        if (domainSelect) {
            domainSelect.style.opacity = '0';
            domainSelect.style.visibility = 'hidden';
            domainSelect.style.zIndex = '1';
        }
        
        // 初始化榜单领域单选下拉框
        const typeSelect = document.querySelector('#type-select');
        if (typeSelect) {
            typeSelect.style.opacity = '0';
            typeSelect.style.visibility = 'hidden'; 
            typeSelect.style.zIndex = '1';
        }
    }
    
    // 页面加载完成后初始化下拉框样式
    setTimeout(initializeDropdowns, 100);
});
