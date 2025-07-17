import pandas as pd
import json
import numpy as np

def parse_excel_advanced():
    try:        
        # 只处理llama和qwen工作表
        sheets_to_process = ['llama', 'qwen']
        processed_data = {}

        # 读取dataset sheet，构建名称到属性的映射
        df_dataset = pd.read_excel('new.xlsx', sheet_name='dataset', header=None)
        dataset_attr_map = {}
        for idx in range(3, len(df_dataset)):
            name = df_dataset.iloc[idx, 1] if idx < len(df_dataset) else None
            if pd.notna(name):
                name_str = str(name).strip()
                affiliation = df_dataset.iloc[idx, 2] if idx < len(df_dataset) else None
                year = df_dataset.iloc[idx, 3] if idx < len(df_dataset) else None
                size = df_dataset.iloc[idx, 4] if idx < len(df_dataset) else None
                size_precise = df_dataset.iloc[idx, 5] if idx < len(df_dataset) else None
                link = df_dataset.iloc[idx, 6] if idx < len(df_dataset) else None
                dataset_attr_map[name_str] = {
                    'affiliation': str(affiliation).strip() if pd.notna(affiliation) else '',
                    'year': str(year).strip() if pd.notna(year) else '',
                    'size': str(size).strip() if pd.notna(size) else '',
                    'size_precise': str(size_precise).strip() if pd.notna(size_precise) else '',
                    'link': str(link).strip() if pd.notna(link) else ''
                }

        for sheet_name in sheets_to_process:
            print(f"\n--- 处理工作表: {sheet_name} ---")
            
            # 读取原始数据，不跳过任何行
            df_raw = pd.read_excel('new.xlsx', sheet_name=sheet_name, header=None)
            
            print(f"工作表大小: {df_raw.shape}")
            
            # 检测领域分布
            domain_ranges = detect_domain_ranges(df_raw)
            print(f"领域分布: {domain_ranges}")
            
            # 自动检测各领域的列布局
            column_layout = detect_column_layout(df_raw)
            
            # 提取列范围
            general_cols = column_layout['general_cols']
            math_cols = column_layout['math_cols']
            code_cols = column_layout['code_cols']
            reasoning_cols = column_layout['reasoning_cols']
            
            print(f"General列范围: {general_cols}")
            print(f"Math列范围: {math_cols}")
            print(f"Code列范围: {code_cols}")
            print(f"Reasoning列范围: {reasoning_cols}")

            # ========== 修正：提取base行为单行 ==========
            base_row_idx = 387  # 第388行对应索引387（0-based）
            if base_row_idx < len(df_raw):
                base_row = df_raw.iloc[base_row_idx]
                print(f"找到base行: 第{base_row_idx+1}行")
            else:
                print("警告: 未找到base行")
                base_row = None
            # 提前定义 base_info
            base_info = None
            if base_row is not None:
                # 提取base行的各领域分数
                def extract_base_task_scores(row, col_indices):
                    """从base行提取各列的分数，值为0参与计算，空值不参与计算"""
                    task_scores = []
                    for col_idx in col_indices:
                        if col_idx < len(row):
                            val = row.iloc[col_idx]
                            if pd.notna(val):  # 只有非空值才添加（包括0）
                                try:
                                    task_scores.append(float(val))
                                except (ValueError, TypeError):
                                    # 无法转换为数字的值跳过
                                    pass
                    return task_scores
                base_general_task_scores = extract_base_task_scores(base_row, general_cols)
                base_math_task_scores = extract_base_task_scores(base_row, math_cols)
                base_code_task_scores = extract_base_task_scores(base_row, code_cols)
                base_reasoning_task_scores = extract_base_task_scores(base_row, reasoning_cols)
                # 计算base行的各领域平均分（包括0值）
                base_general_avg = np.mean(base_general_task_scores) if base_general_task_scores else 0
                base_math_avg = np.mean(base_math_task_scores) if base_math_task_scores else 0
                base_code_avg = np.mean(base_code_task_scores) if base_code_task_scores else 0
                base_reasoning_avg = np.mean(base_reasoning_task_scores) if base_reasoning_task_scores else 0
                base_valid_averages = [avg for avg in [base_general_avg, base_math_avg, base_code_avg, base_reasoning_avg] if avg > 0]
                base_overall_avg = np.mean(base_valid_averages) if base_valid_averages else 0
                print(f"Base行分数 - General: {base_general_avg:.2f}, Math: {base_math_avg:.2f}, Code: {base_code_avg:.2f}, Reasoning: {base_reasoning_avg:.2f}, Overall: {base_overall_avg:.2f}")
                
                # 根据工作表名称设置base模型名称
                if sheet_name == 'llama':
                    base_name = 'meta-llama/Llama-3.1-8B'
                elif sheet_name == 'qwen':
                    base_name = 'Qwen/Qwen2.5-7B'
                else:
                    base_name = 'base'  # 默认名称
                
                # 构建base_info对象
                base_info = {
                    'id': 0,
                    'name': base_name,
                    'domain': 'base',
                    'general_avg': round(base_general_avg, 2),
                    'math_avg': round(base_math_avg, 2),
                    'code_avg': round(base_code_avg, 2),
                    'reasoning_avg': round(base_reasoning_avg, 2),
                    'overall_avg': round(base_overall_avg, 2),
                    'overall_efficiency': 0,  # base模型无数据量信息，设为0
                    'general_efficiency': 0,
                    'math_efficiency': 0,
                    'code_efficiency': 0,
                    'reasoning_efficiency': 0,
                    'general_task_scores': base_general_task_scores,
                    'math_task_scores': base_math_task_scores,
                    'code_task_scores': base_code_task_scores,
                    'reasoning_task_scores': base_reasoning_task_scores
                }
            else:
                base_general_task_scores = [0] * len(general_cols)
                base_math_task_scores = [0] * len(math_cols)
                base_code_task_scores = [0] * len(code_cols)
                base_reasoning_task_scores = [0] * len(reasoning_cols)
                base_general_avg = base_math_avg = base_code_avg = base_reasoning_avg = base_overall_avg = 0
                
                # 根据工作表名称设置base模型名称
                if sheet_name == 'llama':
                    base_name = 'meta-llama/Llama-3.1-8B'
                elif sheet_name == 'qwen':
                    base_name = 'Qwen/Qwen2.5-7B'
                else:
                    base_name = 'base'  # 默认名称
                
                base_info = {
                    'id': 0,
                    'name': base_name,
                    'domain': 'base',
                    'general_avg': 0,
                    'math_avg': 0,
                    'code_avg': 0,
                    'reasoning_avg': 0,
                    'overall_avg': 0,
                    'overall_efficiency': 0,  # base模型无数据量信息，设为0
                    'general_efficiency': 0,
                    'math_efficiency': 0,
                    'code_efficiency': 0,
                    'reasoning_efficiency': 0,
                    'general_task_scores': base_general_task_scores,
                    'math_task_scores': base_math_task_scores,
                    'code_task_scores': base_code_task_scores,
                    'reasoning_task_scores': base_reasoning_task_scores
                }
            # 遍历每个数据集（每4行为一组）
            datasets = []
            dataset_start_row = 3  # B4对应索引3 (0-based)
            current_row = dataset_start_row
            dataset_id = 1
            
            while current_row < len(df_raw):
                # 获取数据集名称（B列）
                dataset_name_cell = df_raw.iloc[current_row, 1]  # B列，索引1
                
                if pd.notna(dataset_name_cell):
                    dataset_name = str(dataset_name_cell).strip()
                    
                    # 跳过表头或无效行
                    if (dataset_name.lower() in ['model', 'dataset', 'accuracy', 'general', 'math', 'code', 'reasoning', 'base', ''] or 
                        len(dataset_name) == 0):
                        current_row += 1
                        continue
                    
                    # 确定数据集所属的领域
                    dataset_domain = determine_dataset_domain(current_row, domain_ranges)
                    
                    print(f"\n处理数据集: {dataset_name} (行 {current_row+1}-{current_row+4}) [领域: {dataset_domain}]")
                    
                    # 提取该数据集的4行数据
                    dataset_rows = []
                    for i in range(4):
                        if current_row + i < len(df_raw):
                            dataset_rows.append(df_raw.iloc[current_row + i])
                    
                    if len(dataset_rows) < 4:
                        print(f"警告: 数据集 {dataset_name} 数据行不足4行")
                        break
                    
                    # 提取各领域数据
                    def extract_domain_scores(rows, col_indices):
                        """从指定行和列提取有效数值"""
                        scores = []
                        for row in rows:
                            for col_idx in col_indices:
                                if col_idx < len(row):
                                    val = row.iloc[col_idx]
                                    # 检查是否为有效数值
                                    if pd.notna(val):
                                        try:
                                            # 尝试转换为浮点数
                                            num_val = float(val)
                                            scores.append(num_val)
                                        except (ValueError, TypeError):
                                            # 跳过非数值
                                            continue
                        return scores
                    
                    def extract_task_scores(rows, col_indices):
                        """为每个小任务提取分数（按列计算平均值），空值不参与计算"""
                        task_scores = []
                        for col_idx in col_indices:
                            col_values = []
                            for row in rows:
                                if col_idx < len(row):
                                    val = row.iloc[col_idx]
                                    if pd.notna(val):  # 只有非空值才处理
                                        try:
                                            num_val = float(val)
                                            col_values.append(num_val)
                                        except (ValueError, TypeError):
                                            continue
                            # 如果该列有有效数据，计算平均值；否则返回None表示该任务无数据
                            if col_values:
                                task_scores.append(round(np.mean(col_values), 2))
                            else:
                                task_scores.append(None)  # 用None表示无数据
                        return task_scores
                    
                    # 提取各领域分数
                    general_scores = extract_domain_scores(dataset_rows, general_cols)
                    math_scores = extract_domain_scores(dataset_rows, math_cols)
                    code_scores = extract_domain_scores(dataset_rows, code_cols)
                    reasoning_scores = extract_domain_scores(dataset_rows, reasoning_cols)
                    
                    # 提取各领域小任务分数
                    general_task_scores = extract_task_scores(dataset_rows, general_cols)
                    math_task_scores = extract_task_scores(dataset_rows, math_cols)
                    code_task_scores = extract_task_scores(dataset_rows, code_cols)
                    reasoning_task_scores = extract_task_scores(dataset_rows, reasoning_cols)
                    
                    print(f"  General: {len(general_scores)} 个有效数据, {len(general_task_scores)} 个任务")
                    print(f"  Math: {len(math_scores)} 个有效数据, {len(math_task_scores)} 个任务")
                    print(f"  Code: {len(code_scores)} 个有效数据, {len(code_task_scores)} 个任务")
                    print(f"  Reasoning: {len(reasoning_scores)} 个有效数据, {len(reasoning_task_scores)} 个任务")
                    
                    # 计算平均分（只计算有数据的领域）
                    general_avg = np.mean(general_scores) if general_scores else 0
                    math_avg = np.mean(math_scores) if math_scores else 0
                    code_avg = np.mean(code_scores) if code_scores else 0
                    reasoning_avg = np.mean(reasoning_scores) if reasoning_scores else 0
                    
                    # 计算综合平均分（只包含有数据的领域）
                    valid_averages = [avg for avg in [general_avg, math_avg, code_avg, reasoning_avg] if avg > 0]
                    overall_avg = np.mean(valid_averages) if valid_averages else 0
                    
                    # 计算数据性价比分数
                    def calculate_efficiency_score(avg_score, size_precise_str):
                        """计算数据性价比分数：平均分数 / 数据量"""
                        if not size_precise_str or avg_score <= 0:
                            return 0
                        
                        try:
                            # 尝试解析数据量字符串
                            size_str = str(size_precise_str).strip().lower()
                            
                            # 处理常见的数字格式
                            if 'k' in size_str:
                                size = float(size_str.replace('k', '')) * 1000
                            elif 'm' in size_str:
                                size = float(size_str.replace('m', '')) * 1000000
                            elif 'b' in size_str:
                                size = float(size_str.replace('b', '')) * 1000000000
                            else:
                                # 尝试直接转换为数字
                                size = float(size_str)
                            
                            if size > 0:
                                efficiency = avg_score / size
                                return round(efficiency, 6)  # 保留6位小数
                            else:
                                return 0
                        except (ValueError, TypeError):
                            # 如果无法解析数据量，返回0
                            return 0
                    
                    # 计算各领域的数据性价比分数
                    overall_efficiency_absolute = calculate_efficiency_score(overall_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    general_efficiency_absolute = calculate_efficiency_score(general_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    math_efficiency_absolute = calculate_efficiency_score(math_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    code_efficiency_absolute = calculate_efficiency_score(code_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    reasoning_efficiency_absolute = calculate_efficiency_score(reasoning_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    
                    # 计算base模型在各领域的性价比分数（使用相同的数据量）
                    base_overall_efficiency_absolute = calculate_efficiency_score(base_overall_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    base_general_efficiency_absolute = calculate_efficiency_score(base_general_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    base_math_efficiency_absolute = calculate_efficiency_score(base_math_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    base_code_efficiency_absolute = calculate_efficiency_score(base_code_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    base_reasoning_efficiency_absolute = calculate_efficiency_score(base_reasoning_avg, dataset_attr_map.get(dataset_name, {}).get('size_precise', ''))
                    
                    # 计算相对于base模型的性价比涨跌
                    overall_efficiency = round(overall_efficiency_absolute - base_overall_efficiency_absolute, 6)
                    general_efficiency = round(general_efficiency_absolute - base_general_efficiency_absolute, 6)
                    math_efficiency = round(math_efficiency_absolute - base_math_efficiency_absolute, 6)
                    code_efficiency = round(code_efficiency_absolute - base_code_efficiency_absolute, 6)
                    reasoning_efficiency = round(reasoning_efficiency_absolute - base_reasoning_efficiency_absolute, 6)
                    
                    # 构建小任务详细信息
                    task_details = {}
                    
                    def organize_tasks_by_name(tasks, metrics, scores):
                        """将相同任务名称的不同指标组织在一起，跳过无数据的任务"""
                        organized_tasks = {}
                        for task_name, metric_name, score in zip(tasks, metrics, scores):
                            # 跳过无数据的任务（score为None）
                            if score is None:
                                continue
                            
                            if task_name not in organized_tasks:
                                organized_tasks[task_name] = {
                                    'task_name': task_name,
                                    'metrics': []
                                }
                            organized_tasks[task_name]['metrics'].append({
                                'metric': metric_name,
                                'score': score
                            })
                        return list(organized_tasks.values())
                    
                    # General领域小任务
                    if 'general_tasks' in column_layout and general_task_scores:
                        task_details['general_tasks'] = organize_tasks_by_name(
                            column_layout.get('general_tasks', []),
                            column_layout.get('general_metrics', []),
                            general_task_scores
                        )
                    
                    # Math领域小任务
                    if 'math_tasks' in column_layout and math_task_scores:
                        task_details['math_tasks'] = organize_tasks_by_name(
                            column_layout.get('math_tasks', []),
                            column_layout.get('math_metrics', []),
                            math_task_scores
                        )
                    
                    # Code领域小任务
                    if 'code_tasks' in column_layout and code_task_scores:
                        task_details['code_tasks'] = organize_tasks_by_name(
                            column_layout.get('code_tasks', []),
                            column_layout.get('code_metrics', []),
                            code_task_scores
                        )
                    
                    # Reasoning领域小任务
                    if 'reasoning_tasks' in column_layout and reasoning_task_scores:
                        task_details['reasoning_tasks'] = organize_tasks_by_name(
                            column_layout.get('reasoning_tasks', []),
                            column_layout.get('reasoning_metrics', []),
                            reasoning_task_scores
                        )
                    
                    # 计算提升/下降
                    def safe_list_subtract(list1, list2):
                        """安全的列表减法，处理长度不一致和None值的情况"""
                        result = []
                        min_len = min(len(list1), len(list2))
                        for i in range(min_len):
                            # 如果任一值为None，跳过该项
                            if list1[i] is None or list2[i] is None:
                                continue
                            result.append(round(list1[i] - list2[i], 2))
                        return result
                    
                    improvement = {
                        'general_avg': round(general_avg - base_general_avg, 2),
                        'math_avg': round(math_avg - base_math_avg, 2),
                        'code_avg': round(code_avg - base_code_avg, 2),
                        'reasoning_avg': round(reasoning_avg - base_reasoning_avg, 2),
                        'overall_avg': round(overall_avg - base_overall_avg, 2),
                        'overall_efficiency': overall_efficiency,  # 已经是相对于base模型的性价比涨跌
                        'general_efficiency': general_efficiency,
                        'math_efficiency': math_efficiency,
                        'code_efficiency': code_efficiency,
                        'reasoning_efficiency': reasoning_efficiency,
                        'general_task_scores': safe_list_subtract(general_task_scores, base_general_task_scores),
                        'math_task_scores': safe_list_subtract(math_task_scores, base_math_task_scores),
                        'code_task_scores': safe_list_subtract(code_task_scores, base_code_task_scores),
                        'reasoning_task_scores': safe_list_subtract(reasoning_task_scores, base_reasoning_task_scores)
                    }
                    
                    # 构建dataset_info时，增加属性
                    dataset_info = {
                        'id': dataset_id,
                        'name': dataset_name,
                        'domain': dataset_domain,  # 添加领域信息
                        'general_avg': round(general_avg, 2),
                        'math_avg': round(math_avg, 2),
                        'code_avg': round(code_avg, 2),
                        'reasoning_avg': round(reasoning_avg, 2),
                        'overall_avg': round(overall_avg, 2),
                        'overall_efficiency': overall_efficiency,  # 新增：数据性价比分数
                        'general_efficiency': general_efficiency,
                        'math_efficiency': math_efficiency,
                        'code_efficiency': code_efficiency,
                        'reasoning_efficiency': reasoning_efficiency,
                        'general_scores': general_scores,
                        'math_scores': math_scores,
                        'code_scores': code_scores,
                        'reasoning_scores': reasoning_scores,
                        'task_details': task_details,  # 新增：小任务详细信息
                        'improvement': improvement   # 新增：提升/下降
                    }
                    
                    # 合并属性
                    attr = dataset_attr_map.get(dataset_name, {})
                    dataset_info.update(attr)
                    
                    # 只添加有有效数据的数据集
                    if overall_avg > 0:
                        datasets.append(dataset_info)
                        dataset_id += 1
                        print(f"  ✅ 已添加: 综合 {overall_avg:.2f}")
                    else:
                        print(f"  ❌ 跳过: 无有效数据")
                    
                    # 移动到下一个数据集（跳过4行）
                    current_row += 4
                else:
                    # 如果B列为空，移动到下一行
                    current_row += 1
            
            # 在每个系列的datasets最前面插入base_info
            if base_info:
                datasets.insert(0, base_info)
            
            processed_data[sheet_name] = datasets
            print(f"\n{sheet_name} 工作表处理完成: {len(datasets)} 个数据集")
        
        # 保存处理后的数据
        with open('processed_leaderboard_data.json', 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, ensure_ascii=False, indent=2)
        
        print("\n处理后的数据已保存到 processed_leaderboard_data.json")
        
        # 显示示例数据
        for sheet_name, data in processed_data.items():
            print(f"\n{sheet_name} 示例数据 (前3个):")
            for i, item in enumerate(data[:3]):
                print(f"{i+1}. {item['name']} [{item['domain']}]: 综合 {item['overall_avg']} (性价比涨跌: {item.get('overall_efficiency', 0):+.6f}), General {item['general_avg']} (性价比: {item.get('general_efficiency', 0):+.6f}), Math {item['math_avg']} (性价比: {item.get('math_efficiency', 0):+.6f}), Code {item['code_avg']} (性价比: {item.get('code_efficiency', 0):+.6f}), Reasoning {item['reasoning_avg']} (性价比: {item.get('reasoning_efficiency', 0):+.6f})")
                
                # 显示小任务详情
                if 'task_details' in item:
                    task_details = item['task_details']
                    for domain in ['general_tasks', 'math_tasks', 'code_tasks', 'reasoning_tasks']:
                        if domain in task_details and task_details[domain]:
                            domain_name = domain.replace('_tasks', '').upper()
                            print(f"   {domain_name}小任务:")
                            for task in task_details[domain]:
                                task_name = task['task_name']
                                metrics = task['metrics']
                                if len(metrics) == 1:
                                    # 只有一个指标
                                    print(f"     • {task_name} ({metrics[0]['metric']}): {metrics[0]['score']}")
                                else:
                                    # 多个指标
                                    print(f"     • {task_name}:")
                                    for metric in metrics:
                                        print(f"       - {metric['metric']}: {metric['score']}")
            
            # 显示领域分布统计
            domain_count = {}
            for item in data:
                domain = item['domain']
                domain_count[domain] = domain_count.get(domain, 0) + 1
            print(f"  领域分布: {domain_count}")
        
        return processed_data
        
    except Exception as e:
        print(f"处理错误: {e}")
        import traceback
        traceback.print_exc()
        return None

def detect_column_layout(df_raw):
    """自动检测各领域的列布局和小任务信息"""
    print("\n--- 检测表头和列布局 ---")
    
    # 查找表头行（通常在前几行）
    header_keywords = ['general', 'math', 'code', 'reasoning', 'dataset', 'model']
    header_row = None
    
    for i in range(min(5, len(df_raw))):  # 检查前5行
        row = df_raw.iloc[i]
        row_text = ' '.join([str(cell).lower() for cell in row if pd.notna(cell)])
        if any(keyword in row_text for keyword in header_keywords):
            header_row = i
            print(f"找到表头行: {i+1}")
            print(f"表头内容: {[str(cell) for cell in row[:25] if pd.notna(cell)]}")
            break
    
    # 默认列配置（基于用户指定的列范围）
    default_config = {
        'general_cols': list(range(3, 7)),      # D,E,F,G
        'math_cols': list(range(7, 12)),        # H,I,J,K,L  
        'code_cols': list(range(12, 20)),       # M,N,O,P,Q,R,S,T
        'reasoning_cols': [20,21,22,23,24]   # U,V,W,X,Y
    }
    
    print("使用默认列配置:")
    print(f"  General: 列 {[chr(65+i) for i in default_config['general_cols']]} (索引 {default_config['general_cols']})")
    print(f"  Math: 列 {[chr(65+i) for i in default_config['math_cols']]} (索引 {default_config['math_cols']})")
    print(f"  Code: 列 {[chr(65+i) for i in default_config['code_cols']]} (索引 {default_config['code_cols']})")
    print(f"  Reasoning: 列 {[chr(65+i) for i in default_config['reasoning_cols']]} (索引 {default_config['reasoning_cols']})")
    
    # 提取小任务信息（第2行为任务名，第3行为指标名）
    task_info = extract_task_info(df_raw, default_config)
    default_config.update(task_info)
    
    return default_config

def extract_task_info(df_raw, column_config):
    """提取各领域小任务的名称和指标"""
    print("\n--- 提取小任务信息 ---")
    
    task_info = {}
    
    # 假设第2行（索引1）为任务名，第3行（索引2）为指标名
    if len(df_raw) > 2:
        task_name_row = df_raw.iloc[1]  # 第2行
        metric_name_row = df_raw.iloc[2]  # 第3行
        
        domains = ['general', 'math', 'code', 'reasoning']
        
        for domain in domains:
            col_key = f'{domain}_cols'
            if col_key in column_config:
                cols = column_config[col_key]
                
                # 提取任务名称和指标，处理合并单元格情况
                task_names = []
                metric_names = []
                current_task_name = None
                
                for col_idx in cols:
                    # 提取任务名称
                    if col_idx < len(task_name_row):
                        task_name = task_name_row.iloc[col_idx]
                        if pd.notna(task_name) and str(task_name).strip():
                            current_task_name = str(task_name).strip()
                            task_names.append(current_task_name)
                        else:
                            # 如果当前单元格为空，使用前一个任务名称
                            if current_task_name:
                                task_names.append(current_task_name)
                            else:
                                task_names.append(f"Task_{col_idx}")
                    else:
                        if current_task_name:
                            task_names.append(current_task_name)
                        else:
                            task_names.append(f"Task_{col_idx}")
                    
                    # 提取指标名称
                    if col_idx < len(metric_name_row):
                        metric_name = metric_name_row.iloc[col_idx]
                        if pd.notna(metric_name) and str(metric_name).strip():
                            metric_names.append(str(metric_name).strip())
                        else:
                            metric_names.append(f"Metric_{col_idx}")
                    else:
                        metric_names.append(f"Metric_{col_idx}")
                
                task_info[f'{domain}_tasks'] = task_names
                task_info[f'{domain}_metrics'] = metric_names
                
                print(f"  {domain.upper()}:")
                for i, (task, metric) in enumerate(zip(task_names, metric_names)):
                    col_letter = chr(65 + cols[i])
                    print(f"    {col_letter}: {task} ({metric})")
    
    return task_info

def detect_domain_ranges(df_raw):
    """检测各领域在Excel中的行范围"""
    domain_ranges = {}
    
    print("\n--- 检测领域分布 ---")
    
    # 查找A列中的领域标记
    domain_keywords = ['general', 'math', 'code', 'reasoning']
    domain_starts = {}
    
    for i in range(len(df_raw)):
        a_val = df_raw.iloc[i, 0]
        if pd.notna(a_val):
            a_str = str(a_val).strip().lower()
            if a_str in domain_keywords:
                domain_starts[a_str] = i
                print(f"找到领域 '{a_str}' 开始于行 {i+1}")
    
    # 计算每个领域的范围
    sorted_domains = sorted(domain_starts.items(), key=lambda x: x[1])
    
    for i, (domain, start_row) in enumerate(sorted_domains):
        if i < len(sorted_domains) - 1:
            # 不是最后一个领域，范围到下一个领域开始之前
            end_row = sorted_domains[i + 1][1] - 1
        else:
            # 最后一个领域，范围到文件末尾
            end_row = len(df_raw) - 1
        
        domain_ranges[domain] = (start_row, end_row)
        print(f"  {domain}: 行 {start_row+1} - {end_row+1}")
    
    return domain_ranges

def determine_dataset_domain(row_num, domain_ranges):
    """根据行号确定数据集所属的领域"""
    for domain, (start_row, end_row) in domain_ranges.items():
        if start_row <= row_num <= end_row:
            return domain
    return 'unknown'

if __name__ == "__main__":
    parse_excel_advanced()
