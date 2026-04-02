#!/bin/bash
#
# 数据血缘分析 - 运行脚本
#
# 使用前请配置环境变量（替换为你自己的值）:
#
#   export OPENAI_BASE_URL="https://your-api-proxy.com/v1"
#   export OPENAI_API_KEY="sk-your-api-key"
#   export HUGGINGFACE_API_TOKEN="hf_your-token"   # 可选
#

set -e

if [[ -z "${OPENAI_BASE_URL:-}" ]]; then
    echo "Error: OPENAI_BASE_URL is not set"
    exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "Error: OPENAI_API_KEY is not set"
    exit 1
fi

# =============================================================================
# 默认配置
# =============================================================================
DEFAULT_MODEL="gpt-5.4"

# Per-agent models (override with env or args)
MODEL_SOURCING="${MODEL_SOURCING:-$DEFAULT_MODEL}"      # SourcingAgent: link extraction from README
MODEL_TRACING="${MODEL_TRACING:-$DEFAULT_MODEL}"        # TracingAgent: trace from README/blog/GitHub
MODEL_PAPER="${MODEL_PAPER:-$DEFAULT_MODEL}"            # PaperAgent: paper content analysis
MODEL_CLASSIFICATION="${MODEL_CLASSIFICATION:-$DEFAULT_MODEL}"  # ClassificationAgent: dataset classification
MODEL_AGGREGATION="${MODEL_AGGREGATION:-$DEFAULT_MODEL}"        # AggregationAgent: infer missing dataset names
MODEL_DATASET_BUILDER="${MODEL_DATASET_BUILDER:-$DEFAULT_MODEL}"  # DatasetBuilder: README summary, data type

# OUTPUT_DIR default set after SCRIPT_DIR (so output goes to data_lineage/output by default)
MAX_DEPTH="${MAX_DEPTH:--1}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
MULTIMODAL="${MULTIMODAL:-true}"

# ============================================================================= 
# Parse Arguments
# =============================================================================
DATASET_FILE=""
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --model)
            DEFAULT_MODEL="$2"
            MODEL_SOURCING="$2"
            MODEL_TRACING="$2"
            MODEL_PAPER="$2"
            MODEL_CLASSIFICATION="$2"
            MODEL_AGGREGATION="$2"
            MODEL_DATASET_BUILDER="$2"
            shift 2
            ;;
        --model-sourcing)
            MODEL_SOURCING="$2"
            shift 2
            ;;
        --model-tracing)
            MODEL_TRACING="$2"
            shift 2
            ;;
        --model-paper)
            MODEL_PAPER="$2"
            shift 2
            ;;
        --model-classification)
            MODEL_CLASSIFICATION="$2"
            shift 2
            ;;
        --model-aggregation)
            MODEL_AGGREGATION="$2"
            shift 2
            ;;
        --model-dataset-builder)
            MODEL_DATASET_BUILDER="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --max-depth)
            MAX_DEPTH="$2"
            shift 2
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --multimodal)
            MULTIMODAL="$2"
            shift 2
            ;;
        --no-load-existing)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        --blog-analysis)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        --no-blog-analysis)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        --paper-analysis)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        --no-paper-analysis)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        --pdf-crop)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        -h|--help)
            echo "Usage: $0 <dataset_file> [options]"
            echo ""
            echo "Positional:"
            echo "  dataset_file          File with dataset names (one per line)"
            echo ""
            echo "Model (each agent can use a different model):"
            echo "  --model NAME          Default model for all agents (default: gpt-5.2)"
            echo "  --model-sourcing      SourcingAgent: extract links from README"
            echo "  --model-tracing       TracingAgent: trace datasets from README/blog/GitHub"
            echo "  --model-paper         PaperAgent: analyze paper content"
            echo "  --model-classification ClassificationAgent: classify dataset type"
            echo "  --model-aggregation   AggregationAgent: infer missing dataset names"
            echo "  --model-dataset-builder DatasetBuilder: README summary, data type"
            echo ""
            echo "Other:"
            echo "  --output-dir DIR      Output directory (default: ./output)"
            echo "  --max-depth N         Recursion depth, -1=unlimited (default: -1, trace to bottom)"
            echo "  --log-level LEVEL     DEBUG|INFO|WARNING|ERROR (default: INFO)"
            echo "  --multimodal BOOL     Use multimodal classification prompt (true/false, default: false)"
            echo "  --no-load-existing    Start fresh, do not load existing results"
            echo "  --blog-analysis       Enable blog analysis (default: on)"
            echo "  --no-blog-analysis    Disable blog analysis"
            echo "  --paper-analysis      Enable paper analysis (default: on)"
            echo "  --no-paper-analysis   Disable paper analysis"
            echo "  --pdf-crop            Crop PDF by TOC (intro~conclusion); default: off, use full PDF"
            echo ""
            echo "Environment (请替换为你自己的值):"
            echo "  OPENAI_BASE_URL         API 中转地址 (必填)"
            echo "  OPENAI_API_KEY          API Key (必填)"
            echo "  HUGGINGFACE_API_TOKEN   HF Token (可选)"
            exit 0
            ;;
        -*)
            EXTRA_ARGS+=("$1")
            if [[ "$1" == *=* ]] || [[ $# -eq 1 ]]; then
                shift
            else
                EXTRA_ARGS+=("$2")
                shift 2
            fi
            ;;
        *)
            if [[ -z "$DATASET_FILE" ]]; then
                DATASET_FILE="$1"
            else
                EXTRA_ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

if [[ -z "$DATASET_FILE" ]]; then
    DATASET_FILE="datasets.txt"
fi

if [[ ! -f "$DATASET_FILE" ]]; then
    echo "Error: dataset file not found: $DATASET_FILE"
    exit 1
fi

# Resolve to absolute path (before cd)
DATASET_FILE="$(realpath "$DATASET_FILE")"

# =============================================================================
# Run
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$SCRIPT_DIR/output}"
# Run from parent dir so "python -m data_lineage.main" works
cd "$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "Data Lineage Analysis"
echo "=============================================="
echo "Dataset file: $DATASET_FILE"
echo "Output dir:   $OUTPUT_DIR"
echo "Max depth:    $MAX_DEPTH"
echo "Multimodal:   $MULTIMODAL"
echo ""
echo "Model configuration:"
echo "  sourcing:        $MODEL_SOURCING"
echo "  tracing:         $MODEL_TRACING"
echo "  paper:           $MODEL_PAPER"
echo "  classification:  $MODEL_CLASSIFICATION"
echo "  aggregation:     $MODEL_AGGREGATION"
echo "  dataset_builder: $MODEL_DATASET_BUILDER"
echo "=============================================="

python -m data_lineage.main "$DATASET_FILE" \
    --output-dir "$OUTPUT_DIR" \
    --max-depth "$MAX_DEPTH" \
    --log-level "$LOG_LEVEL" \
    --multimodal "$MULTIMODAL" \
    --model "$DEFAULT_MODEL" \
    --model-sourcing "$MODEL_SOURCING" \
    --model-tracing "$MODEL_TRACING" \
    --model-paper "$MODEL_PAPER" \
    --model-classification "$MODEL_CLASSIFICATION" \
    --model-aggregation "$MODEL_AGGREGATION" \
    --model-dataset-builder "$MODEL_DATASET_BUILDER" \
    "${EXTRA_ARGS[@]}"
