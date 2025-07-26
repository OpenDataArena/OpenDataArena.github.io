import json
import copy

def get_empty_evaluation_score():
    # 你可以直接用之前版本，如果已有这部分
    q_llm_judge_metrics = [
        "Clarity", "Coherence", "Completeness", "Complexity", "Correctness", "Meaningfulness", "OpenThoughts"
    ]
    q_judge_range = list(range(1, 11))
    q_model_eval = {
        "Deita_Complexity": [1, 2, 3, 4, 5, 6],
        "Thinking_Prob": [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    }

    qa_llm_judge_metrics = q_llm_judge_metrics + ["Relevance"]
    qa_judge_range = list(range(1, 11))
    qa_model_eval = {
        "Deita_Quality": [1, 2, 3, 4, 5, 6],
        "IFD": [-0.1, 0.2, 0.5, 0.8, 1.1, 1.4, 1.7],
        "Reward_Model": [-70, -40, -10, 20, 50, 80],
    }

    return {
        "Q_scores": {
            "LLM-as-Judge": {
                m: {
                    "distribution": [0.0] * 10,
                    "range": q_judge_range,
                    "mean": 0.0
                } for m in q_llm_judge_metrics
            },
            "Model-based Evaluation": {
                "Deita_Complexity": {
                    "distribution": [0.0] * 5,
                    "range": q_model_eval["Deita_Complexity"],
                    "mean": 0.0
                },
                "Thinking_Prob": {
                    "distribution": [0.0] * 5,
                    "range": q_model_eval["Thinking_Prob"],
                    "mean": 0.0
                }
            }
        },
        "QA_scores": {
            "LLM-as-Judge": {
                m: {
                    "distribution": [0.0] * 10,
                    "range": qa_judge_range,
                    "mean": 0.0
                } for m in qa_llm_judge_metrics
            },
            "Model-based Evaluation": {
                "Deita_Quality": {
                    "distribution": [0.0] * 5,
                    "range": qa_model_eval["Deita_Quality"],
                    "mean": 0.0
                },
                "IFD": {
                    "distribution": [0.0] * 6,
                    "range": qa_model_eval["IFD"],
                    "mean": 0.0
                },
                "Reward_Model": {
                    "distribution": [0.0] * 5,
                    "range": qa_model_eval["Reward_Model"],
                    "mean": 0.0
                }
            },
            "Heuristic": {
                "A_Length": {
                    "min": 0.0,
                    "avg": 0.0,
                    "max": 0.0
                }
            }
        }
    }

def main():
    with open('processed_leaderboard_data.json', 'r', encoding='utf-8') as f:
        leaderboard_data = json.load(f)
    with open('processed_score_data.json', 'r', encoding='utf-8') as f:
        score_data = json.load(f)

    # 统一用小写name作为key
    score_data_map = {name.lower(): score_data[name] for name in score_data}

    merged_data = copy.deepcopy(leaderboard_data)

    for model_key in merged_data:
        for item in merged_data[model_key]:
            dataset_name = item.get('name')
            if dataset_name is None:
                item['evaluation_score'] = get_empty_evaluation_score()
                continue
            key = dataset_name.lower()
            if key in score_data_map:
                item['evaluation_score'] = score_data_map[key]
            else:
                item['evaluation_score'] = get_empty_evaluation_score()

    with open('processed_merge_data.json', 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()