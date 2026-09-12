import json
import os.path
import re
from bisheng.common.constants.enums.telemetry import ApplicationTypeEnum
from bisheng.llm.domain import LLMService
from langchain_core.messages import HumanMessage
from typing import List

from fastapi import UploadFile
from loguru import logger
from pydantic import BaseModel

from bisheng.common.dependencies.user_deps import UserPayload
from bisheng.common.errcode.finetune import TrainFileNotExistError
from bisheng.common.schemas.api import PageList
from bisheng.core.storage.minio.minio_manager import get_minio_storage
from bisheng.utils import generate_uuid
from ..models.preset_train import PresetTrain, PresetTrainDao


class FinetuneFileService(BaseModel):
    """ Training Tasks File management """

    @classmethod
    async def upload_file(cls, files: List[UploadFile], is_preset: bool,
                          user: UserPayload) -> List[PresetTrain]:
        if len(files) == 0:
            raise TrainFileNotExistError()

        # Upload training files tominio
        file_root = cls.get_upload_file_root(is_preset)
        file_list = await cls.upload_file_to_minio(files, file_root, user)
        # Store preset data in database
        if is_preset:
            logger.info(f'save preset file : {file_list}')
            file_list = await PresetTrainDao.insert_batch(file_list)
        return file_list

    @classmethod
    async def upload_preset_file(cls, name: str, preset_type: int, file_path: str,
                                 user: UserPayload) -> PresetTrain:
        # Upload training files tominio
        file_root = cls.get_upload_file_root(False)
        file_id = generate_uuid()
        file_ext = os.path.basename(file_path).split('.')[-1]
        object_name = f'{file_root}/{file_id}.{file_ext}'
        minio_client = await get_minio_storage()
        await minio_client.put_object(bucket_name=minio_client.bucket, object_name=object_name, file=file_path)
        # Store preset data in database
        file_info = PresetTrain(id=file_id,
                                name=name,
                                url=object_name,
                                type=preset_type,
                                user_id=user.user_id,
                                user_name=user.user_name)
        await PresetTrainDao.insert_batch([file_info])
        return file_info

    @classmethod
    def get_upload_file_root(cls, is_preset: bool) -> str:
        if is_preset:
            return 'finetune/train_file/preset'
        else:
            return 'finetune/train_file/personal'

    @classmethod
    async def upload_file_to_minio(cls, files: List[UploadFile], file_root: str,
                                   user: UserPayload) -> List[PresetTrain]:
        minio_client = await get_minio_storage()
        ret = []
        for file in files:
            file_id = generate_uuid()
            file_ext = os.path.basename(file.filename).split('.')[-1]
            file_info = PresetTrain(id=file_id,
                                    name=file.filename,
                                    url=f'{file_root}/{file_id}.{file_ext}',
                                    user_id=user.user_id,
                                    user_name=user.user_name)
            await minio_client.put_object(bucket_name=minio_client.bucket, object_name=file_info.url,
                                          file=file.file, content_type=file.content_type, length=file.size)
            ret.append(file_info)
        return ret

    @classmethod
    async def get_preset_file(cls,
                              keyword: str = None,
                              page_size: int = None,
                              page_num: int = None) -> PageList:
        list_res, total_count = await PresetTrainDao.search_name(keyword, page_size, page_num)
        return PageList(list=list_res, total=total_count)

    @classmethod
    async def get_file_records(cls, file_id: str) -> list[dict]:
        file_data = await PresetTrainDao.find_one(file_id)
        if not file_data:
            raise TrainFileNotExistError()
        minio_client = await get_minio_storage()
        raw = await minio_client.get_object(object_name=file_data.url)
        if not raw:
            return []
        parsed = json.loads(raw.decode('utf-8'))
        return parsed if isinstance(parsed, list) else []

    @classmethod
    async def save_file_records(cls, file_id: str, records: list[dict]) -> list[dict]:
        file_data = await PresetTrainDao.find_one(file_id)
        if not file_data:
            raise TrainFileNotExistError()
        payload = json.dumps(records, ensure_ascii=False, indent=2).encode('utf-8')
        minio_client = await get_minio_storage()
        await minio_client.put_object(
            bucket_name=minio_client.bucket,
            object_name=file_data.url,
            file=payload,
            content_type='application/json',
        )
        return records

    @classmethod
    async def clean_file_records(cls, file_id: str, options: dict, user_id: int) -> dict:
        records = await cls.get_file_records(file_id)
        llm_used = False

        if options.get('use_llm'):
            try:
                cleaned, llm_used = await cls._clean_records_with_llm(records, options, user_id)
            except Exception as exc:
                logger.warning('LLM dataset cleaning failed, falling back to rule-based: {}', exc)
                cleaned = [_clean_record(record, options) for record in records]
        else:
            cleaned = [_clean_record(record, options) for record in records]

        await cls.save_file_records(file_id, cleaned)
        return {
            'records': cleaned,
            'cleaned_count': len(cleaned),
            'llm_used': llm_used,
        }

    @classmethod
    async def _clean_records_with_llm(cls, records: list[dict], options: dict, user_id: int) -> tuple[list[dict], bool]:
        cfg, _, _ = await LLMService.aget_workflow_llm_with_meta()
        model_id = getattr(cfg, 'model_id', None)
        if not model_id:
            return [_clean_record(record, options) for record in records], False

        llm = await LLMService.get_bisheng_llm(
            model_id=model_id,
            app_id='dataset_clean',
            app_name='dataset_clean',
            app_type=ApplicationTypeEnum.WORKFLOW,
            user_id=user_id,
        )

        cleaned: list[dict] = []
        for record in records:
            cleaned_record = await _clean_record_with_llm(llm, record, options)
            cleaned.append(cleaned_record)
        return cleaned, True

    @classmethod
    async def delete_preset_file(cls, file_id: str, user: UserPayload) -> None:
        file_data = await PresetTrainDao.find_one(file_id)
        if not file_data:
            raise TrainFileNotExistError()

        logger.info(f'delete preset train file, user: {user}; file: {file_data.model_dump()}')
        await PresetTrainDao.delete_one(file_data)
        logger.info('delete preset train file success')
        return None

TYPO_FIXES = {
    "teh": "the",
    "recieve": "receive",
    "adress": "address",
    "seperate": "separate",
    "occured": "occurred",
    "writting": "writing",
}

def _normalize_text(value: str) -> str:
    value = value.strip()
    value = re.sub(r"[ \t]+", " ", value)
    return value

def _apply_typo_fixes(value: str) -> str:
    for wrong, right in TYPO_FIXES.items():
        value = re.sub(re.escape(wrong), right, value, flags=re.IGNORECASE)
    return value

def _clean_record(record: dict, options: dict) -> dict:
    if not isinstance(record, dict):
        return record
    cleaned = dict(record)
    if options.get('format_validation'):
        cleaned['instruction'] = str(cleaned.get('instruction') or '').strip()
        cleaned['input'] = str(cleaned.get('input') or '').strip()
        cleaned['output'] = str(cleaned.get('output') or '').strip()
    if options.get('typo_correction'):
        for field in ('instruction', 'input', 'output'):
            if isinstance(cleaned.get(field), str):
                cleaned[field] = _apply_typo_fixes(cleaned[field])
    if options.get('qa_optimization'):
        for field in ('instruction', 'input', 'output'):
            if isinstance(cleaned.get(field), str):
                cleaned[field] = _normalize_text(cleaned[field])
    return cleaned

async def _clean_record_with_llm(llm, record: dict, options: dict) -> dict:
    if not isinstance(record, dict):
        return record
    instruction = str(record.get('instruction') or '')
    input_text = str(record.get('input') or '')
    output = str(record.get('output') or '')
    prompt = (
        'You are a dataset cleaning assistant. Clean the following instruction-tuning example. '
        'Fix typos, validate the format, and improve the Q&A quality. '
        'Return only a JSON object with keys instruction, input, output.'
    )
    user_payload = json.dumps({'instruction': instruction, 'input': input_text, 'output': output}, ensure_ascii=False)
    try:
        response = await llm.ainvoke([HumanMessage(content=prompt + '\n' + user_payload)])
        content = getattr(response, 'content', '')
        parsed = _extract_json_object(content)
        if not parsed:
            return record
        return {
            'instruction': str(parsed.get('instruction') or instruction).strip(),
            'input': str(parsed.get('input') or input_text).strip(),
            'output': str(parsed.get('output') or output).strip(),
        }
    except Exception:
        return record


def _extract_json_object(content: str) -> dict | None:
    if not content:
        return None
    try:
        return json.loads(content)
    except Exception:
        pass
    start = content.find('{')
    end = content.rfind('}')
    if start >= 0 and end > start:
        try:
            return json.loads(content[start:end + 1])
        except Exception:
            return None
    return None
