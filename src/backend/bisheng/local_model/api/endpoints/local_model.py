import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.params import Body
from loguru import logger

from bisheng.common.dependencies.user_deps import UserPayload
from bisheng.common.schemas.api import resp_200, resp_500, UnifiedResponseModel
from bisheng.local_model.api.schemas.local_model_schema import (
    LocalModelImportReq, LocalModelResp, LocalModelDetailResp
)
from bisheng.local_model.domain.services.local_model_service import LocalModelService, MODEL_ROOT_DIR
from bisheng.local_model.domain.models.local_model import LocalModelSource

router = APIRouter()


@router.get('/list', summary='获取本地模型列表', response_model=UnifiedResponseModel)
async def list_models(
    source: str = Query(None, description='来源筛选: builtin/directory/finetuned/all'),
    status: str = Query(None, description='状态筛选: deployed/offline/all'),
    keyword: str = Query(None, description='关键词搜索'),
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """获取本地模型列表"""
    try:
        models = await LocalModelService.list_models(login_user, source, status, keyword)
        data = []
        for m in models:
            data.append(_model_to_resp(m))
        return resp_200(data=data)
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


@router.get('/{model_id}', summary='获取模型详情', response_model=UnifiedResponseModel)
async def get_model_detail(
    model_id: str,
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """获取模型详情（含血缘链）"""
    try:
        detail = await LocalModelService.get_model_detail(model_id)
        if not detail:
            return resp_500(code=404, data=None, message='模型不存在')

        # 对微调产出模型，获取微调任务的训练数据集信息
        finetune_data = None
        model = detail['model']
        if model.source == LocalModelSource.FINETUNED and model.finetune_job_id:
            try:
                from bisheng.finetune.domain.models.finetune import FinetuneDao
                finetune = await FinetuneDao.find_job(model.finetune_job_id)
                if finetune:
                    finetune_data = {
                        'train_data': finetune.train_data,
                        'preset_data': finetune.preset_data,
                    }
            except Exception as e:
                logger.warning(f'failed to fetch finetune data for {model.finetune_job_id}: {e}')

        return resp_200(data={
            'model': _model_to_resp(detail['model'], finetune_data),
            'lineage': [_model_to_resp(m) for m in detail['lineage']]
        })
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


@router.post('/upload', summary='上传模型文件夹', response_model=UnifiedResponseModel)
async def upload_model(
    files: List[UploadFile] = File(..., description='模型文件（支持多文件上传）'),
    folder_name: str = Form(..., description='模型文件夹名称'),
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """上传模型权重文件夹到服务器，自动检测模型信息"""
    try:
        if not files:
            return resp_500(code=400, data=None, message='请选择要上传的文件')

        # 创建目标目录
        target_dir = os.path.join(MODEL_ROOT_DIR, folder_name)
        os.makedirs(target_dir, exist_ok=True)

        # 保存所有文件
        saved_files = []
        for file in files:
            # 去掉浏览器 webkitRelativePath 的顶层文件夹名，避免嵌套
            # 例如 "MyFolder/config.json" → "config.json"
            rel_parts = file.filename.replace('\\', '/').split('/')
            rel_path = '/'.join(rel_parts[1:]) if len(rel_parts) > 1 else file.filename

            file_path = os.path.join(target_dir, rel_path)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            saved_files.append(rel_path)
            logger.info(f'Saved file: {rel_path} ({len(content)} bytes)')

        # 自动检测模型信息
        detected = LocalModelService._detect_model_info(folder_name)

        return resp_200(data={
            'folder_name': folder_name,
            'uploaded_files': saved_files,
            'detected': detected,
            'message': f'成功上传 {len(saved_files)} 个文件，请确认模型信息后入库',
        })
    except Exception as e:
        logger.exception('Upload model failed')
        return resp_500(code=500, data=None, message=str(e))


@router.post('/upload/confirm', summary='确认入库', response_model=UnifiedResponseModel)
async def confirm_upload(
    req: dict = Body(...),
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """上传后确认入库（用户可修订 arch/params/precision）"""
    try:
        folder_name = req.get('folder_name', '')
        name = req.get('name', folder_name)
        arch = req.get('arch', '')
        params = req.get('params', '')
        precision = req.get('precision', 'BF16')

        if not folder_name:
            return resp_500(code=400, data=None, message='缺少 folder_name')

        model = await LocalModelService.import_model(
            user=login_user,
            name=name,
            weight_path=folder_name,
            arch=arch,
            params=params,
            precision=precision,
        )
        return resp_200(data=_model_to_resp(model))
    except ValueError as e:
        return resp_500(code=400, data=None, message=str(e))
    except Exception as e:
        logger.exception('Confirm upload failed')
        return resp_500(code=500, data=None, message=str(e))


@router.post('/import', summary='导入模型', response_model=UnifiedResponseModel)
async def import_model(
    req: LocalModelImportReq = Body(...),
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """导入已有模型目录到本地仓库（服务器本地路径）"""
    try:
        model = await LocalModelService.import_model(
            user=login_user,
            name=req.name,
            weight_path=req.weight_path,
            arch=req.arch,
            params=req.params,
            precision=req.precision,
        )
        return resp_200(data=_model_to_resp(model))
    except ValueError as e:
        return resp_500(code=400, data=None, message=str(e))
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


@router.post('/{model_id}/deploy', summary='部署模型', response_model=UnifiedResponseModel)
async def deploy_model(
    model_id: str,
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """部署模型到推理服务（预留 vLLM）"""
    try:
        model = await LocalModelService.deploy_model(model_id, login_user)
        return resp_200(data=_model_to_resp(model))
    except ValueError as e:
        return resp_500(code=400, data=None, message=str(e))
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


@router.post('/{model_id}/undeploy', summary='下线模型', response_model=UnifiedResponseModel)
async def undeploy_model(
    model_id: str,
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """下线已部署的模型"""
    try:
        model = await LocalModelService.undeploy_model(model_id, login_user)
        return resp_200(data=_model_to_resp(model))
    except ValueError as e:
        return resp_500(code=400, data=None, message=str(e))
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


@router.delete('/{model_id}', summary='删除模型', response_model=UnifiedResponseModel)
async def delete_model(
    model_id: str,
    login_user: UserPayload = Depends(UserPayload.get_login_user),
):
    """删除本地模型"""
    try:
        await LocalModelService.delete_model(model_id, login_user)
        return resp_200(data={'deleted': True})
    except ValueError as e:
        return resp_500(code=400, data=None, message=str(e))
    except Exception as e:
        return resp_500(code=500, data=None, message=str(e))


def _model_to_resp(m, finetune_data: dict = None) -> dict:
    """将 ORM 对象转为响应字典，finetune_data 可选附加微调任务详情"""
    resp = {
        'id': m.id,
        'name': m.name,
        'arch': m.arch,
        'version': m.version,
        'source': m.source.value if hasattr(m.source, 'value') else m.source,
        'params': m.params,
        'precision': m.precision,
        'status': m.status.value if hasattr(m.status, 'value') else m.status,
        'weight_path': m.weight_path,
        'parent_id': m.parent_id,
        'finetune_job_id': m.finetune_job_id,
        'dataset': m.dataset,
        'hyperparams': m.hyperparams,
        'eval_loss': m.eval_loss,
        'bleu_4': m.bleu_4,
        'rouge_1': m.rouge_1,
        'rouge_2': m.rouge_2,
        'rouge_l': m.rouge_l,
        'deploy_time': m.deploy_time.isoformat() if m.deploy_time else None,
        'operator': m.operator,
        'create_time': m.create_time.isoformat() if m.create_time else None,
        'update_time': m.update_time.isoformat() if m.update_time else None,
        'train_data': None,
        'preset_data': None,
    }
    if finetune_data:
        resp['train_data'] = finetune_data.get('train_data')
        resp['preset_data'] = finetune_data.get('preset_data')
    return resp
