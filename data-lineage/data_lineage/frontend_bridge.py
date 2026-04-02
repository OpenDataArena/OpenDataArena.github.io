import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

from .main import create_llms, setup_logging, validate_environment
from .models import DataLineageState, DatasetExistence
from .workflow import DataLineageWorkflow

logger = logging.getLogger(__name__)

HF_DATASET_PATTERN = re.compile(r"^[^/\s]+/[^/\s]+$")


class LineageBridgeError(Exception):
    """Base exception for frontend bridge."""


class DatasetFormatError(LineageBridgeError):
    """Raised when dataset name is not in org/name format."""


class DatasetNotFoundError(LineageBridgeError):
    """Raised when dataset does not exist on Hugging Face."""


def _build_model_config(model_config: Optional[Dict[str, str]]) -> Dict[str, str]:
    if model_config is None:
        model_config = {}
    default_model = model_config.get("default", "gpt-4o-mini")
    return {
        "sourcing": model_config.get("sourcing", default_model),
        "tracing": model_config.get("tracing", default_model),
        "paper": model_config.get("paper", default_model),
        "classification": model_config.get("classification", default_model),
        "aggregation": model_config.get("aggregation", default_model),
        "dataset_builder": model_config.get("dataset_builder", default_model),
    }


def _normalize_dataset_name(dataset_name: str) -> str:
    normalized = (dataset_name or "").strip()
    if not HF_DATASET_PATTERN.match(normalized):
        raise DatasetFormatError(f"Invalid dataset format: {dataset_name}")
    return normalized


def process_single_dataset(
    dataset_name: str,
    output_dir: str,
    max_depth: Optional[int] = 6,
    model_config: Optional[Dict[str, str]] = None,
    base_url: Optional[str] = None,
    log_level: str = "INFO",
    load_existing: bool = True,
    api_token: Optional[str] = None,
    enable_blog_analysis: bool = True,
    enable_paper_analysis: bool = True,
    enable_multimodal: bool = False,
) -> Dict[str, Any]:
    """
    Process one HF dataset and append results to graph/data jsonl files.
    Returns a structured status dict for API handlers.
    """
    normalized_name = _normalize_dataset_name(dataset_name)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    graph_file = output_path / "graph.jsonl"
    data_file = output_path / "data.jsonl"
    log_file = output_path / "data_lineage.log"

    setup_logging(log_level, str(log_file))
    if not validate_environment():
        raise RuntimeError("Environment validation failed for data_lineage")

    full_config = _build_model_config(model_config)
    llms = create_llms(full_config, base_url=base_url)
    workflow = DataLineageWorkflow(
        llms=llms,
        max_depth=max_depth,
        api_token=api_token or os.getenv("HUGGINGFACE_API_TOKEN"),
        enable_blog_analysis=enable_blog_analysis,
        enable_paper_analysis=enable_paper_analysis,
        enable_multimodal=enable_multimodal,
    )

    shared_state = DataLineageState(
        load_existing=load_existing,
        graph_file=str(graph_file),
        data_file=str(data_file),
    )

    if shared_state.is_processed(normalized_name):
        return {
            "status": "cached",
            "dataset": normalized_name,
            "message": "Dataset already processed",
        }

    existence = workflow.validator.verify_existence(normalized_name)
    if existence == DatasetExistence.NOT_FOUND:
        raise DatasetNotFoundError(f"Dataset not found on Hugging Face: {normalized_name}")

    result_state = workflow.run_single_dataset_with_shared_state(
        dataset_name=normalized_name,
        shared_state=shared_state,
        graph_file=str(graph_file),
        data_file=str(data_file),
    )

    result = "processed" if result_state.is_processed(normalized_name) else "uncertain"
    return {
        "status": result,
        "dataset": normalized_name,
        "message": (
            "Dataset processed"
            if result == "processed"
            else "Dataset processing completed with uncertain state"
        ),
    }
