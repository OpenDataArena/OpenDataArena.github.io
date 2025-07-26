import json
import os
from collections import defaultdict, Counter
from tqdm import tqdm

def init_stat(metric_range):
    # distribution长度等于metric_range长度（离散分布，比如OpenThoughts），否则为len(range)-1（连续分布）
    return {
        "distribution": [0.0 for _ in range(len(metric_range))] if metric_range == list(range(0,11)) else [0.0 for _ in range(len(metric_range)-1 if isinstance(metric_range[0], float) else len(metric_range))],
        "range": list(metric_range),
        "mean": 0.0
    }

def get_bin_indices(value, bins):
    for i in range(len(bins)-1):
        if bins[i] <= value < bins[i+1] or (i == len(bins)-2 and value == bins[-1]):
            return i
    return None


def safe_num_list(data, as_int=False):
    nums = []
    for v in data:
        if v is None:
            continue
        try:
            if as_int:
                nums.append(int(float(v)))
            else:
                nums.append(float(v))
        except Exception:
            continue
    return nums

# 只统计0~10的int值（OpenThoughts专用）
def safe_num_list_openthoughts(data):
    nums = []
    for v in data:
        if v is None:
            continue
        try:
            iv = int(float(v))
            if 0 <= iv <= 10:
                nums.append(iv)
        except Exception:
            continue
    return nums

def normalize_mean(mean, min_val, max_val):
    if max_val == min_val:
        return 0.0
    norm = (mean - min_val) / (max_val - min_val)
    return round(max(0.0, min(1.0, norm)), 1)  # Clamp to [0,1], 1 decimal

def calc_distribution(data, metric_range):
    # OpenThoughts是离散的整数分布，其他支持float分箱
    as_int = isinstance(metric_range[0], int)
    if metric_range == list(range(0,11)):
        # OpenThoughts特殊处理，仅统计0~10的int
        nums = safe_num_list_openthoughts(data)
        if not nums:
            return [0.0] * 11, 0.0
        counter = Counter(nums)
        dist = []
        total = len(nums)
        for v in range(0, 11):
            dist.append(round(counter.get(v, 0) / total * 100, 1))
        mean = round(sum(nums) / total, 1)
        return dist, mean
    nums = safe_num_list(data, as_int=as_int)
    if not nums:
        return [0.0] * (len(metric_range)-1 if not as_int else len(metric_range)), 0.0
    if as_int:
        counter = Counter(nums)
        dist = []
        total = len(nums)
        for v in metric_range:
            dist.append(round(counter.get(v, 0) / total * 100, 1))
        mean = round(sum(nums) / total, 1)
    else:
        counts = [0]*(len(metric_range)-1)
        total = len(nums)
        for v in nums:
            idx = get_bin_indices(v, metric_range)
            if idx is not None:
                counts[idx] += 1
        dist = [round(x/total*100, 1) for x in counts]
        mean = round(sum(nums)/total, 1)
    return dist, mean

def calc_min_avg_max(data):
    nums = safe_num_list(data, as_int=True)
    if not nums:
        return 0.0, 0.0, 0.0
    return float(min(nums)), round(sum(nums)/len(nums), 1), float(max(nums))

def process_file(file_path, save_path):
    Q_judge_metrics = ["Clarity", "Coherence", "Completeness", "Complexity", "Correctness", "Meaningfulness"]
    Q_judge_range = list(range(1, 11))
    OPEN_THOUGHTS_RANGE = list(range(0, 11))
    Q_model_metrics = [("Deita_Complexity", [1,2,3,4,5,6]), ("Thinking_Prob", [0.0,0.2,0.4,0.6,0.8,1.0])]
    QA_judge_metrics = ["Clarity", "Coherence", "Completeness", "Complexity", "Correctness", "Meaningfulness", "Relevance"]
    QA_judge_range = Q_judge_range
    QA_model_metrics = [
        ("Deita_Quality", [1,2,3,4,5,6]),
        ("IFD", [-0.1,0.2,0.5,0.8,1.1,1.4,1.7]),
        ("Reward_Model", [-70,-40,-10,20,50,80]),
    ]
    stats = defaultdict(lambda: {
        "Q_scores": {
            "LLM-as-Judge": {m: init_stat(Q_judge_range) for m in Q_judge_metrics} | {"OpenThoughts": init_stat(OPEN_THOUGHTS_RANGE)},
            "Model-based Evaluation": {
                "Deita_Complexity": init_stat([1,2,3,4,5,6]),
                "Thinking_Prob": init_stat([0.0,0.2,0.4,0.6,0.8,1.0]),
            }
        },
        "QA_scores": {
            "LLM-as-Judge": {m: init_stat(QA_judge_range) for m in QA_judge_metrics},
            "Model-based Evaluation": {
                "IFD": init_stat([-0.1,0.2,0.5,0.8,1.1,1.4,1.7]),
                "Deita_Quality": init_stat([1,2,3,4,5,6]),
                "Reward_Model": init_stat([-70,-40,-10,20,50,80]),
            },
            "Heuristic": {
                "A_Length": {"min": 0.0, "avg": 0.0, "max": 0.0}
            }
        }
    })
    tmp = defaultdict(lambda: {
        "Q_scores": {m: [] for m in Q_judge_metrics + ["OpenThoughts", "Deita_Complexity", "Thinking_Prob"]},
        "QA_scores": {m: [] for m in QA_judge_metrics + ["IFD", "Deita_Quality", "Reward_Model", "A_Length"]}
    })

    with open(file_path, 'r', encoding='utf-8') as f:
        total_lines = sum(1 for _ in f)
    with open(file_path, 'r', encoding='utf-8') as f, tqdm(total=total_lines, desc="Processing") as pbar:
        for line in f:
            pbar.update(1)
            obj = json.loads(line)
            dataset = obj.get("source", "unknown")
            # ----------- add this block -------------
            if dataset == "Magpie-Reasoning-V2-250K-CoT-QwQ-math":
                dataset = "Magpie-Reasoning-V2-250K-CoT-QwQ"
            elif dataset == "R1-Distill-SFT-math":
                dataset = "R1-Distill-SFT"
            # ----------------------------------------
            q = obj.get("Q_scores", {})
            qa = obj.get("QA_scores", {})
            for m in Q_judge_metrics:
                tmp[dataset]["Q_scores"][m].extend(q.get(m, []))
            tmp[dataset]["Q_scores"]["OpenThoughts"].extend(q.get("OpenThoughts", []))
            tmp[dataset]["Q_scores"]["Deita_Complexity"].extend(q.get("Deita_Complexity", []))
            tmp[dataset]["Q_scores"]["Thinking_Prob"].extend(q.get("Thinking_Prob", []))
            for m in QA_judge_metrics:
                tmp[dataset]["QA_scores"][m].extend(qa.get(m, []))
            tmp[dataset]["QA_scores"]["IFD"].extend(qa.get("IFD", []))
            tmp[dataset]["QA_scores"]["Deita_Quality"].extend(qa.get("Deita_Quality", []))
            tmp[dataset]["QA_scores"]["Reward_Model"].extend(qa.get("Reward_Model", []))
            tmp[dataset]["QA_scores"]["A_Length"].extend(qa.get("A_Length", []))
    for dataset in tmp:
        # Q_scores: LLM-as-Judge
        for m in Q_judge_metrics:
            dist, mean = calc_distribution(tmp[dataset]["Q_scores"][m], Q_judge_range)
            stats[dataset]["Q_scores"]["LLM-as-Judge"][m]["distribution"] = dist
            stats[dataset]["Q_scores"]["LLM-as-Judge"][m]["mean"] = mean
        # OpenThoughts单独处理
        dist, mean = calc_distribution(tmp[dataset]["Q_scores"]["OpenThoughts"], OPEN_THOUGHTS_RANGE)
        stats[dataset]["Q_scores"]["LLM-as-Judge"]["OpenThoughts"]["distribution"] = dist
        stats[dataset]["Q_scores"]["LLM-as-Judge"]["OpenThoughts"]["mean"] = mean
        # Q_scores: Model-based Evaluation
        dist, mean = calc_distribution(tmp[dataset]["Q_scores"]["Deita_Complexity"], [1,2,3,4,5,6])
        mean_norm = normalize_mean(mean, 1, 6)
        stats[dataset]["Q_scores"]["Model-based Evaluation"]["Deita_Complexity"]["distribution"] = dist
        stats[dataset]["Q_scores"]["Model-based Evaluation"]["Deita_Complexity"]["mean"] = mean_norm
        dist, mean = calc_distribution(tmp[dataset]["Q_scores"]["Thinking_Prob"], [0.0,0.2,0.4,0.6,0.8,1.0])
        mean_norm = normalize_mean(mean, 0, 1.0)
        stats[dataset]["Q_scores"]["Model-based Evaluation"]["Thinking_Prob"]["distribution"] = dist
        stats[dataset]["Q_scores"]["Model-based Evaluation"]["Thinking_Prob"]["mean"] = mean_norm
        # QA_scores: LLM-as-Judge
        for m in QA_judge_metrics:
            dist, mean = calc_distribution(tmp[dataset]["QA_scores"][m], QA_judge_range)
            stats[dataset]["QA_scores"]["LLM-as-Judge"][m]["distribution"] = dist
            stats[dataset]["QA_scores"]["LLM-as-Judge"][m]["mean"] = mean
        # QA_scores: Model-based Evaluation
        dist, mean = calc_distribution(tmp[dataset]["QA_scores"]["Deita_Quality"], [1,2,3,4,5,6])
        mean_norm = normalize_mean(mean, 1, 6)
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["Deita_Quality"]["distribution"] = dist
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["Deita_Quality"]["mean"] = mean_norm
        dist, mean = calc_distribution(tmp[dataset]["QA_scores"]["IFD"], [-0.1,0.2,0.5,0.8,1.1,1.4,1.7])
        mean_norm = normalize_mean(mean, -0.1, 1.7)
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["IFD"]["distribution"] = dist
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["IFD"]["mean"] = mean_norm
        dist, mean = calc_distribution(tmp[dataset]["QA_scores"]["Reward_Model"], [-70,-40,-10,20,50,80])
        mean_norm = normalize_mean(mean, -70, 80)
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["Reward_Model"]["distribution"] = dist
        stats[dataset]["QA_scores"]["Model-based Evaluation"]["Reward_Model"]["mean"] = mean_norm
        # Heuristic
        min_, avg_, max_ = calc_min_avg_max(tmp[dataset]["QA_scores"]["A_Length"])
        stats[dataset]["QA_scores"]["Heuristic"]["A_Length"] = {
            "min": min_,
            "avg": avg_,
            "max": max_,
        }

    # Replace underscores with spaces in metric keys under Model-based Evaluation
    for dataset in stats:
        # For Q_scores "Model-based Evaluation"
        q_model_eval = stats[dataset]["Q_scores"].get("Model-based Evaluation", {})
        if q_model_eval:
            new_q_model_eval = {}
            for k, v in q_model_eval.items():
                new_key = k.replace("_", " ")
                new_q_model_eval[new_key] = v
            stats[dataset]["Q_scores"]["Model-based Evaluation"] = new_q_model_eval
        # For QA_scores "Model-based Evaluation"
        qa_model_eval = stats[dataset]["QA_scores"].get("Model-based Evaluation", {})
        if qa_model_eval:
            new_qa_model_eval = {}
            for k, v in qa_model_eval.items():
                new_key = k.replace("_", " ")
                new_qa_model_eval[new_key] = v
            stats[dataset]["QA_scores"]["Model-based Evaluation"] = new_qa_model_eval

    with open(save_path, 'w', encoding='utf-8') as out:
        json.dump(stats, out, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    process_file('collected_scores.jsonl', 'processed_score_data.json')