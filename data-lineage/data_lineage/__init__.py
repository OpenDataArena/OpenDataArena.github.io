from .workflow import DataLineageWorkflow
from .models import DataLineageState, DatasetInfo, DataLineage, DataCategory
from .frontend_bridge import (
    LineageBridgeError,
    DatasetFormatError,
    DatasetNotFoundError,
    process_single_dataset,
)


def analyze_datasets(*args, **kwargs):
    from .main import analyze_datasets as _analyze_datasets
    return _analyze_datasets(*args, **kwargs)

__version__ = "1.0.0"
__all__ = [
    "analyze_datasets",
    "DataLineageWorkflow", 
    "DataLineageState",
    "DatasetInfo",
    "DataLineage", 
    "DataCategory",
    "LineageBridgeError",
    "DatasetFormatError",
    "DatasetNotFoundError",
    "process_single_dataset",
]
