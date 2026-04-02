#!/usr/bin/env python3
"""
Data lineage analysis tool - command line entry point
"""

import sys
from pathlib import Path

# Ensure parent of data_lineage package is in path (for "python -m data_lineage")
_pkg_dir = Path(__file__).resolve().parent
_parent = _pkg_dir.parent
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))

from data_lineage.main import main

if __name__ == "__main__":
    main()