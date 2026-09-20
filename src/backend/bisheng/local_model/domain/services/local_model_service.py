import os
import json
import shutil
from typing import Optional, List
from loguru import logger

from bisheng.common.dependencies.user_deps import UserPayload
from bisheng.local_model.domain.models.local_model import (
    LocalModel, LocalModelDao, LocalModelSource, LocalModelStatus
)


# 模型权重文件根目录（与 bisheng-ft 共享）
MODEL_ROOT_DIR = os.environ.get('LOCAL_MODEL_ROOT', '/opt/bisheng-ft/models/model_repository')


class LocalModelService:
    """本地模型仓库业务逻辑"""

    @classmethod
    async def list_models(
        cls,
        user: UserPayload,
        source: str = None,
        status: str = None,
        keyword: str = None
    ) -> List[LocalModel]:
        """获取模型列表"""
        return await LocalModelDao.find_all(
            tenant_id=user.tenant_id,
            source=source,
            status=status,
            keyword=keyword
        )

    @classmethod
    async def get_model_detail(cls, model_id: str) -> Optional[dict]:
        """获取模型详情（含血缘链）"""
        model = await LocalModelDao.find_by_id(model_id)
        if not model:
            return None

        # 构建血缘链（从当前模型向上追溯到根）
        lineage = []
        current = model
        while current:
            lineage.append(current)
            if current.parent_id:
                current = await LocalModelDao.find_by_id(current.parent_id)
            else:
                current = None
        lineage.reverse()  # 根节点在前

        return {
            "model": model,
            "lineage": lineage
        }

    @classmethod
    async def import_model(
        cls,
        user: UserPayload,
        name: str,
        weight_path: str,
        arch: str = '',
        params: str = '',
        precision: str = 'BF16'
    ) -> LocalModel:
        """导入已有模型目录"""
        # 检查权重路径是否已存在
        existing = await LocalModelDao.find_by_weight_path(weight_path)
        if existing:
            raise ValueError(f'权重路径 {weight_path} 已被模型 {existing.name} 使用')

        # 检查名称是否已存在
        existing_name = await LocalModelDao.find_by_name(name, user.tenant_id)
        if existing_name:
            raise ValueError(f'模型名称 {name} 已存在')

        # 自动检测模型信息（如果未提供）
        if not arch or not params:
            detected = cls._detect_model_info(weight_path)
            if not arch:
                arch = detected.get('arch', '')
            if not params:
                params = detected.get('params', '')

        model = LocalModel(
            name=name,
            arch=arch,
            params=params,
            precision=precision,
            source=LocalModelSource.DIRECTORY,
            status=LocalModelStatus.OFFLINE,
            weight_path=weight_path,
            operator=user.user_name,
            tenant_id=user.tenant_id,
        )
        return await LocalModelDao.insert(model)

    @classmethod
    async def register_finetuned_model(
        cls,
        name: str,
        weight_path: str,
        parent_name: str = None,
        finetune_job_id: str = None,
        dataset: str = None,
        hyperparams: dict = None,
        eval_loss: float = None,
        bleu_4: float = None,
        rouge_1: float = None,
        rouge_2: float = None,
        rouge_l: float = None,
        operator: str = '',
        tenant_id: int = 1
    ) -> LocalModel:
        """注册微调产出的模型（由 finetune publish_job 调用）"""
        # 查找父模型
        parent_id = None
        if parent_name:
            parent = await LocalModelDao.find_by_name(parent_name, tenant_id)
            if parent:
                parent_id = parent.id

        # 自动检测模型信息
        detected = cls._detect_model_info(weight_path)

        model = LocalModel(
            name=name,
            arch=detected.get('arch', ''),
            version='v1.0.0',
            source=LocalModelSource.FINETUNED,
            params=detected.get('params', ''),
            precision='BF16',
            status=LocalModelStatus.OFFLINE,
            weight_path=weight_path,
            parent_id=parent_id,
            finetune_job_id=finetune_job_id,
            dataset=dataset,
            hyperparams=hyperparams,
            eval_loss=eval_loss,
            bleu_4=bleu_4,
            rouge_1=rouge_1,
            rouge_2=rouge_2,
            rouge_l=rouge_l,
            operator=operator,
            tenant_id=tenant_id,
        )
        return await LocalModelDao.insert(model)

    @classmethod
    async def deploy_model(cls, model_id: str, user: UserPayload) -> LocalModel:
        """部署模型（预留 vLLM 接口）"""
        model = await LocalModelDao.find_by_id(model_id)
        if not model:
            raise ValueError('模型不存在')
        if model.status == LocalModelStatus.DEPLOYED:
            raise ValueError('模型已部署')

        # TODO: 调用 vLLM 部署接口
        # await cls._deploy_to_vllm(model)

        from datetime import datetime
        model.status = LocalModelStatus.DEPLOYED
        model.deploy_time = datetime.now()
        return await LocalModelDao.update(model)

    @classmethod
    async def undeploy_model(cls, model_id: str, user: UserPayload) -> LocalModel:
        """下线模型"""
        model = await LocalModelDao.find_by_id(model_id)
        if not model:
            raise ValueError('模型不存在')
        if model.status == LocalModelStatus.OFFLINE:
            raise ValueError('模型未部署')

        # TODO: 调用 vLLM 下线接口
        # await cls._undeploy_from_vllm(model)

        model.status = LocalModelStatus.OFFLINE
        model.deploy_time = None
        return await LocalModelDao.update(model)

    @classmethod
    async def delete_model(cls, model_id: str, user: UserPayload) -> bool:
        """删除模型，如果是微调产出则同步取消发布微调任务"""
        model = await LocalModelDao.find_by_id(model_id)
        if not model:
            raise ValueError('模型不存在')
        if model.status == LocalModelStatus.DEPLOYED:
            raise ValueError('已部署的模型不能删除，请先下线')
        # 检查是否有子模型引用
        children = await LocalModelDao.find_children(model_id)
        if children:
            child_names = ', '.join([c.name for c in children])
            raise ValueError(f'该模型被以下子模型引用，无法删除: {child_names}')

        # 如果是微调产出，同步取消发布对应的微调任务
        if model.source == LocalModelSource.FINETUNED and model.finetune_job_id:
            await cls._sync_cancel_finetune_publish(model.finetune_job_id, user)

        # 删除数据库记录
        deleted = await LocalModelDao.delete_by_id(model_id)

        # 删除权重文件
        weight_dir = os.path.join(MODEL_ROOT_DIR, model.weight_path)
        if os.path.isdir(weight_dir):
            try:
                shutil.rmtree(weight_dir)
                logger.info(f'deleted model weight files: {weight_dir}')
            except Exception as e:
                logger.warning(f'failed to delete model weight files {weight_dir}: {e}')
        else:
            logger.warning(f'model weight dir not found, skip file deletion: {weight_dir}')

        return deleted

    @classmethod
    async def _sync_cancel_finetune_publish(cls, finetune_job_id: str, user: UserPayload):
        """同步取消微调任务的发布状态"""
        try:
            from bisheng.finetune.domain.models.finetune import FinetuneDao, FinetuneStatus
            finetune = await FinetuneDao.find_job(finetune_job_id)
            if not finetune:
                logger.warning(f'finetune job {finetune_job_id} not found, skip sync')
                return
            if finetune.status != FinetuneStatus.PUBLISHED.value:
                return

            from bisheng.finetune.domain.services.finetune import FinetuneService
            await FinetuneService.cancel_publish_job(finetune_job_id, user)
            logger.info(f'synced cancel-publish for finetune job {finetune_job_id}')
        except Exception as e:
            logger.warning(f'failed to sync cancel-publish for finetune job {finetune_job_id}: {e}')

    @classmethod
    def _detect_model_info(cls, weight_path: str) -> dict:
        """从模型权重目录自动检测模型信息（架构、参数量等）

        参数量优先级：safetensors 索引 → config.json 粗算 → 目录名兜底
        架构优先级：config.json → 目录名兜底
        """
        result = {'arch': '', 'params': ''}

        full_path = weight_path
        if not os.path.isabs(full_path):
            full_path = os.path.join(MODEL_ROOT_DIR, weight_path)

        if not os.path.isdir(full_path):
            logger.warning(f'模型目录不存在: {full_path}')
            return result

        # ---- 1. 从 safetensors 索引文件读取精确参数量 ----
        result['params'] = cls._params_from_safetensors(full_path)

        # ---- 2. 从 config.json 读取架构（最可靠） ----
        config_path = cls._find_config_json(full_path)
        if config_path:
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                model_type = config.get('model_type', '')
                result['arch'] = cls._model_type_to_arch(model_type)

                # safetensors 没拿到参数量时，用 config 粗算
                if not result['params']:
                    text_config = config.get('text_config', {})
                    hs = text_config.get('hidden_size') or config.get('hidden_size', 0)
                    nl = text_config.get('num_hidden_layers') or config.get('num_hidden_layers', 0)
                    if hs and nl:
                        result['params'] = cls._estimate_params_from_config(hs, nl)
            except Exception as e:
                logger.warning(f'读取 config.json 失败: {e}')

        # ---- 3. 目录名兜底 ----
        dir_name = os.path.basename(weight_path.rstrip('/').rstrip('\\'))
        if not result['arch']:
            result['arch'] = cls._infer_arch_from_name(dir_name)
        if not result['params']:
            result['params'] = cls._infer_params_from_name(dir_name)

        return result

    @classmethod
    def _params_from_safetensors(cls, base_path: str) -> str:
        """从 safetensors 文件读取精确参数量

        优先 model.safetensors.index.json → 回退单文件 model.safetensors
        """
        index_path = os.path.join(base_path, 'model.safetensors.index.json')
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r') as f:
                    index = json.load(f)
                total_size = index.get('metadata', {}).get('total_size', 0)
                if total_size > 0:
                    return cls._bytes_to_params(total_size, 2)
            except Exception:
                pass

        # 单文件：读 safetensors 头部获取精确字节数
        single = os.path.join(base_path, 'model.safetensors')
        if os.path.exists(single):
            try:
                total = cls._read_safetensors_total_bytes(single)
                if total > 0:
                    return cls._bytes_to_params(total, 2)  # BF16/FP16 = 2 bytes per param
            except Exception:
                # 回退：用文件大小估算
                return cls._bytes_to_params(os.path.getsize(single), 2)
        return ''

    @classmethod
    def _read_safetensors_total_bytes(cls, path: str) -> int:
        """读取 safetensors 文件头部 JSON，累加所有 tensor 的字节数"""
        with open(path, 'rb') as f:
            header_size_bytes = f.read(8)
            if len(header_size_bytes) < 8:
                return 0
            import struct
            header_size = struct.unpack('<Q', header_size_bytes)[0]
            # 限制读取大小防止恶意文件
            if header_size > 100 * 1024 * 1024:
                return 0
            header_json = f.read(header_size)
            header = json.loads(header_json)

        dtype_bytes = {
            'F32': 4, 'F16': 2, 'BF16': 2,
            'I64': 8, 'I32': 4, 'I16': 2, 'I8': 1,
            'U8': 1, 'BOOL': 1, 'F64': 8,
        }
        total = 0
        for name, info in header.items():
            if name == '__metadata__':
                continue
            shape = info.get('shape', [])
            dtype = info.get('dtype', 'F32')
            numel = 1
            for dim in shape:
                numel *= dim
            total += numel * dtype_bytes.get(dtype, 2)
        return total

    @classmethod
    def _bytes_to_params(cls, total_bytes: int, bytes_per_param: int) -> str:
        """将字节数转换为参数量字符串（如 0.8B, 7B, 125M）"""
        num_params = total_bytes / bytes_per_param
        if num_params >= 1e9:
            val = num_params / 1e9
            return f'{val:.1f}B' if val < 10 else f'{int(round(val))}B'
        if num_params >= 5e8:
            # 500M ~ 999M 显示为 B（如 873M → 0.87B）
            return f'{num_params / 1e9:.2f}B'
        if num_params >= 1e6:
            return f'{int(round(num_params / 1e6))}M'
        return str(int(num_params))

    @classmethod
    def _find_config_json(cls, base_path: str) -> str | None:
        """查找 config.json：当前目录 → 一层子目录"""
        direct = os.path.join(base_path, 'config.json')
        if os.path.exists(direct):
            return direct
        try:
            for entry in os.listdir(base_path):
                sub = os.path.join(base_path, entry, 'config.json')
                if os.path.isdir(os.path.join(base_path, entry)) and os.path.exists(sub):
                    return sub
        except OSError:
            pass
        return None

    @classmethod
    def _model_type_to_arch(cls, model_type: str) -> str:
        """将 model_type 映射到架构名"""
        mapping = {
            'qwen': 'Qwen',
            'qwen2': 'Qwen2.5',
            'qwen3': 'Qwen3',
            'qwen3_5': 'Qwen3.5',
            'llama': 'Llama',
            'llama2': 'Llama2',
            'llama3': 'Llama3',
            'chatglm': 'ChatGLM',
            'chatglm2': 'ChatGLM2',
            'chatglm3': 'ChatGLM3',
            'chatglm4': 'GLM-4',
            'baichuan': 'Baichuan',
            'baichuan2': 'Baichuan2',
            'internlm': 'InternLM',
            'internlm2': 'InternLM2',
            'deepseek': 'DeepSeek',
            'mistral': 'Mistral',
            'phi': 'Phi',
            'phi3': 'Phi-3',
            'gemma': 'Gemma',
            'yi': 'Yi',
        }
        return mapping.get(model_type.lower(), model_type)

    @classmethod
    def _estimate_params_from_config(cls, hidden_size: int, num_layers: int) -> str:
        """根据 hidden_size 和层数粗略估算参数量（仅作兜底）"""
        approx_b = (hidden_size * hidden_size * 4 * num_layers) / 1e9
        if approx_b < 1:
            return f'{int(approx_b * 1000)}M'
        return f'{approx_b:.1f}B'

    @classmethod
    def _infer_arch_from_name(cls, name: str) -> str:
        """从目录名推断架构（从最具体到最模糊匹配）"""
        name_lower = name.lower()
        # 先匹配更具体的版本号，避免 qwen3 先于 qwen3.5 命中
        if 'qwen3.5' in name_lower or 'qwen3_5' in name_lower or 'qwen3___5' in name_lower:
            return 'Qwen3.5'
        if 'qwen2.5' in name_lower or 'qwen2_5' in name_lower:
            return 'Qwen2.5'
        if 'qwen3' in name_lower:
            return 'Qwen3'
        if 'qwen2' in name_lower:
            return 'Qwen2'
        if 'qwen' in name_lower:
            return 'Qwen'
        if 'llama-3.1' in name_lower or 'llama3.1' in name_lower:
            return 'Llama3.1'
        if 'llama-3.2' in name_lower or 'llama3.2' in name_lower:
            return 'Llama3.2'
        if 'llama-3' in name_lower or 'llama3' in name_lower:
            return 'Llama3'
        if 'llama' in name_lower:
            return 'Llama'
        if 'deepseek-v3' in name_lower or 'deepseekv3' in name_lower:
            return 'DeepSeek-V3'
        if 'deepseek-r1' in name_lower or 'deepseekr1' in name_lower:
            return 'DeepSeek-R1'
        if 'deepseek' in name_lower:
            return 'DeepSeek'
        if 'glm-4' in name_lower or 'glm4' in name_lower:
            return 'GLM-4'
        if 'chatglm' in name_lower:
            return 'ChatGLM'
        if 'baichuan' in name_lower:
            return 'Baichuan'
        if 'internlm2' in name_lower:
            return 'InternLM2'
        if 'internlm' in name_lower:
            return 'InternLM'
        if 'mistral' in name_lower:
            return 'Mistral'
        if 'gemma' in name_lower:
            return 'Gemma'
        if 'phi' in name_lower:
            return 'Phi'
        if 'yi' in name_lower:
            return 'Yi'
        return ''

    @classmethod
    def _infer_params_from_name(cls, name: str) -> str:
        """从目录名推断参数量，支持 8B、0.5B、70B 等格式"""
        import re
        # 匹配数字(含小数)紧跟 B 或 M（大小写均可），中间不能有其他字母
        match = re.search(r'(\d+\.?\d*)\s*[Bb](?![a-zA-Z])', name)
        if match:
            return f'{match.group(1)}B'
        match = re.search(r'(\d+\.?\d*)\s*[Mm](?![a-zA-Z])', name)
        if match:
            return f'{match.group(1)}M'
        return ''
