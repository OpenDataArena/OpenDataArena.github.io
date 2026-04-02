#!/usr/bin/env python3
"""
补充 data.jsonl 中缺失的 categories 字段。

读取溯源结果 data.jsonl 与 graph.jsonl，对 categories 为空的条目，
结合数据集名称、描述与来源构成，用与 prompts 中一致的多模态分类规则调用 LLM 补全类别。
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

# 保证可导入 data_lineage
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from data_lineage.prompts import DATASET_CLASSIFICATION_MULTIMODAL_PROMPT

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

ALLOWED_CATEGORIES = {"General", "Reasoning", "Spatial", "Infographic"}


def load_data_jsonl(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_graph_jsonl(path: Path) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """返回 (target -> [sources], target -> [evidence_strings])"""
    targets_sources: dict[str, list[str]] = {}
    targets_evidence: dict[str, list[str]] = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            obj = json.loads(line)
            target = obj.get("target", "").strip()
            source = obj.get("source", "").strip()
            if not target:
                continue
            meta = obj.get("meta_info", "")
            evidence = ""
            if isinstance(meta, str):
                try:
                    meta_obj = json.loads(meta)
                    evidence = meta_obj.get("evidence", "") or ""
                except Exception:
                    evidence = meta[:500] if meta else ""
            elif isinstance(meta, dict):
                evidence = meta.get("evidence", "") or ""
            if target not in targets_sources:
                targets_sources[target] = []
                targets_evidence[target] = []
            if source:
                targets_sources[target].append(source)
            if evidence:
                targets_evidence[target].append(evidence)
    return targets_sources, targets_evidence


def build_evidence_section(evidence_list: list[str], max_items: int = 10) -> str:
    seen = set()
    out = []
    for ev in evidence_list:
        ev = (ev or "").strip()
        if not ev or ev in seen:
            continue
        seen.add(ev)
        out.append(ev)
        if len(out) >= max_items:
            break
    return "\n".join(f"{i+1}. {e}" for i, e in enumerate(out)) if out else "Not available"


def classify_one(
    llm: ChatOpenAI,
    dataset_name: str,
    description: str,
    source_names: list[str],
    evidence_section: str,
) -> list[str]:
    prompt = ChatPromptTemplate.from_template(DATASET_CLASSIFICATION_MULTIMODAL_PROMPT)
    source_section = ", ".join(source_names) if source_names else "Not available"
    try:
        response = llm.invoke(
            prompt.format_messages(
                dataset_name=dataset_name,
                description=description or "(No description)",
                source_data_names=source_section,
                evidence_section=evidence_section,
            )
        )
        text = response.content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        result = json.loads(text)
        raw = result.get("categories", [])
        categories = []
        for c in raw:
            c = (c or "").strip()
            if c in ALLOWED_CATEGORIES:
                categories.append(c)
        if not categories:
            categories = ["General"]
        return categories
    except Exception as e:
        logger.warning("Classification failed for %s: %s", dataset_name, e)
        return ["General"]


def main() -> None:
    default_data = Path(__file__).resolve().parent.parent / "output" / "data.jsonl"
    default_graph = Path(__file__).resolve().parent.parent / "output" / "graph.jsonl"

    parser = argparse.ArgumentParser(description="补充 data.jsonl 中缺失的 categories")
    parser.add_argument(
        "--data-file",
        type=Path,
        default=default_data,
        help="输入的 data.jsonl 路径",
    )
    parser.add_argument(
        "--graph-file",
        type=Path,
        default=default_graph,
        help="graph.jsonl 路径，用于获取来源与证据",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="输出路径，默认覆盖 --data-file（若加 --in-place 则写回原文件）",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="将结果写回 --data-file，忽略 --output",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=os.getenv("OPENAI_MODEL", "gpt-5.4"),
        help="分类使用的模型",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只统计待补全数量，不调用 LLM、不写文件",
    )
    args = parser.parse_args()

    data_path = args.data_file
    graph_path = args.graph_file
    if not data_path.is_file():
        logger.error("Data file not found: %s", data_path)
        sys.exit(1)
    if not graph_path.is_file():
        logger.warning("Graph file not found: %s, source/evidence will be empty", graph_path)
        targets_sources = {}
        targets_evidence = {}
    else:
        targets_sources, targets_evidence = load_graph_jsonl(graph_path)

    records = load_data_jsonl(data_path)
    missing = [r for r in records if not (r.get("categories"))]
    logger.info("Total records: %d, missing categories: %d", len(records), len(missing))
    if not missing:
        logger.info("No missing categories, nothing to do.")
        return
    if args.dry_run:
        for r in missing[:5]:
            logger.info("  Example: %s", r.get("name"))
        if len(missing) > 5:
            logger.info("  ... and %d more", len(missing) - 5)
        return

    base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE")
    llm = ChatOpenAI(
        model=args.model,
        temperature=0,
        base_url=base_url.rstrip("/") if base_url else None,
    )
    name_to_index = {r["name"]: i for i, r in enumerate(records)}
    filled = 0
    for r in missing:
        name = r.get("name", "")
        desc = r.get("summary") or r.get("description") or ""
        sources = targets_sources.get(name, [])
        evidence_list = targets_evidence.get(name, [])
        evidence_section = build_evidence_section(evidence_list)
        categories = classify_one(llm, name, desc, sources, evidence_section)
        r["categories"] = categories
        filled += 1
        logger.info("Filled %s -> %s", name, categories)

    out_path = data_path
    if not args.in_place and args.output is not None:
        out_path = args.output
    elif args.in_place:
        out_path = data_path

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    logger.info("Wrote %d records to %s (filled %d missing categories)", len(records), out_path, filled)


if __name__ == "__main__":
    main()
