import json
import re
from typing import Iterable, Optional, Sequence

from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from bisheng.common.constants.enums.telemetry import ApplicationTypeEnum
from bisheng.core.database import get_sync_db_session
from bisheng.database.models.group_resource import ResourceTypeEnum
from bisheng.database.models.tag import Tag, TagBusinessTypeEnum, TagLink
from bisheng.knowledge.domain.models.knowledge import Knowledge, KnowledgeTypeEnum
from bisheng.knowledge.domain.models.knowledge_file import KnowledgeFile
from bisheng.llm.domain import LLMService


CHUNK_AUTO_TAG_MAX_RESULT = 5
CHUNK_AUTO_TAG_MAX_CONTENT = 3000
CHUNK_AUTO_TAG_SYSTEM_PROMPT = (
    "你是知识库切片标签生成器。请阅读切片内容，提炼 2-5 个简短、准确的中文标签。"
    "只输出 JSON：{\"tags\": [\"标签1\", \"标签2\"]}。"
)


def generate_chunk_auto_tags(llm, text: str) -> list[str]:
    """Invoke the configured LLM and parse the generated chunk tags."""
    raw = ""
    try:
        response = llm.invoke(
            [
                {"role": "system", "content": CHUNK_AUTO_TAG_SYSTEM_PROMPT},
                {"role": "user", "content": f"切片内容：\n{text[:CHUNK_AUTO_TAG_MAX_CONTENT]}"},
            ]
        )
        raw = getattr(response, "content", "") or ""
    except Exception:
        logger.exception("chunk_auto_tag_llm_failed")
        return []

    fenced = re.search(r"```(?:json)?\s*(.*?)```", raw, re.S)
    if fenced:
        raw = fenced.group(1).strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("chunk_auto_tag_invalid_json raw={}", raw[:300])
        return []

    tags = payload.get("tags") if isinstance(payload, dict) else None
    if not isinstance(tags, list):
        return []
    return list(dict.fromkeys(str(tag).strip() for tag in tags if str(tag).strip()))[:CHUNK_AUTO_TAG_MAX_RESULT]


class KnowledgeChunkAutoTagService:
    """Auto-generate and persist tags for every chunk of a parsed document."""

    @classmethod
    def apply_after_ingest(
        cls,
        knowledge: Knowledge,
        db_file: KnowledgeFile,
        documents: Optional[Sequence],
    ) -> None:
        try:
            if not cls._should_run(knowledge, db_file, documents):
                return

            llm_config = LLMService.get_knowledge_llm(tenant_id=db_file.tenant_id)
            if not llm_config.extract_title_model_id:
                logger.info(
                    "chunk_auto_tag_skip_no_model file_id={} knowledge_id={}",
                    db_file.id,
                    knowledge.id,
                )
                return

            llm = LLMService.get_bisheng_llm_sync(
                model_id=llm_config.extract_title_model_id,
                app_id=ApplicationTypeEnum.KNOWLEDGE_BASE.value,
                app_name=ApplicationTypeEnum.KNOWLEDGE_BASE.value,
                app_type=ApplicationTypeEnum.KNOWLEDGE_BASE,
                user_id=db_file.user_id or 0,
            )

            for document in documents or []:
                text = getattr(document, "page_content", "") or ""
                if not text or not text.strip():
                    continue
                chunk_index = (getattr(document, "metadata", {}) or {}).get("chunk_index")
                if chunk_index is None:
                    continue
                tags = generate_chunk_auto_tags(llm, text)
                if not tags:
                    continue
                cls._append_chunk_tags(knowledge, db_file, int(chunk_index), tags)
        except Exception:
            logger.exception(
                "chunk_auto_tag_failed file_id={} knowledge_id={}",
                getattr(db_file, "id", None),
                getattr(knowledge, "id", None),
            )

    @staticmethod
    def _should_run(knowledge: Knowledge, db_file: KnowledgeFile, documents: Optional[Sequence]) -> bool:
        return (
            knowledge is not None
            and db_file is not None
            and knowledge.type == KnowledgeTypeEnum.NORMAL.value
            and bool(documents)
        )

    @classmethod
    def _append_chunk_tags(
        cls,
        knowledge: Knowledge,
        db_file: KnowledgeFile,
        chunk_index: int,
        tag_names: Iterable[str],
    ) -> None:
        names = list(dict.fromkeys(str(name).strip() for name in tag_names if name and str(name).strip()))
        if not names:
            return

        resource_id = f"{db_file.id}:{chunk_index}"
        with get_sync_db_session() as session:
            existing_tags = session.exec(
                select(Tag).where(
                    Tag.business_type == TagBusinessTypeEnum.KNOWLEDGE,
                    Tag.business_id == str(knowledge.id),
                    Tag.name.in_(names),
                )
            ).all()
            tag_by_name = {tag.name: tag for tag in existing_tags}

            for name in names:
                if name not in tag_by_name:
                    tag = Tag(
                        name=name,
                        business_type=TagBusinessTypeEnum.KNOWLEDGE,
                        business_id=str(knowledge.id),
                        user_id=db_file.user_id or 0,
                        tenant_id=db_file.tenant_id,
                    )
                    session.add(tag)
                    session.flush()
                    tag_by_name[name] = tag

            tag_ids = [tag_by_name[name].id for name in names if tag_by_name.get(name)]
            existing_links = session.exec(
                select(TagLink).where(
                    TagLink.resource_id == resource_id,
                    TagLink.resource_type == ResourceTypeEnum.KNOWLEDGE_CHUNK.value,
                    TagLink.tag_id.in_(tag_ids),
                )
            ).all()
            existing_tag_ids = {link.tag_id for link in existing_links}

            for tag_id in tag_ids:
                if tag_id in existing_tag_ids:
                    continue
                session.add(
                    TagLink(
                        tag_id=tag_id,
                        resource_id=resource_id,
                        resource_type=ResourceTypeEnum.KNOWLEDGE_CHUNK.value,
                        user_id=db_file.user_id or 0,
                        tenant_id=db_file.tenant_id,
                    )
                )

            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                logger.info(
                    "chunk_auto_tag_duplicate_link_ignored file_id={} chunk_index={}",
                    db_file.id,
                    chunk_index,
                )
