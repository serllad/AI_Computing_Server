from typing import Optional, List
from pydantic import BaseModel, Field


class LocalModelImportReq(BaseModel):
    """导入模型请求"""
    name: str = Field(..., min_length=1, max_length=200, description='模型名称')
    weight_path: str = Field(..., min_length=1, max_length=500, description='权重目录名（相对于 data/llm/）')
    arch: str = Field('', max_length=100, description='模型架构')
    params: str = Field('', max_length=50, description='参数量（如 7B）')
    precision: str = Field('BF16', max_length=50, description='精度')


class LocalModelResp(BaseModel):
    """模型响应"""
    id: str
    name: str
    arch: str
    version: str
    source: str
    params: str
    precision: str
    status: str
    weight_path: str
    parent_id: Optional[str] = None
    finetune_job_id: Optional[str] = None
    dataset: Optional[str] = None
    hyperparams: Optional[dict] = None
    eval_loss: Optional[float] = None
    bleu_4: Optional[float] = None
    rouge_1: Optional[float] = None
    rouge_2: Optional[float] = None
    rouge_l: Optional[float] = None
    deploy_time: Optional[str] = None
    operator: str
    create_time: str
    update_time: Optional[str] = None
    # finetune detail (populated for finetuned models)
    train_data: Optional[list] = None
    preset_data: Optional[list] = None


class LocalModelDetailResp(BaseModel):
    """模型详情响应（含血缘链）"""
    model: LocalModelResp
    lineage: List[LocalModelResp]
