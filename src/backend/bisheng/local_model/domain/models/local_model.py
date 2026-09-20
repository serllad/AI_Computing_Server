import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict

from sqlalchemy import Enum as SQLEnum, DateTime, Float, text
from sqlalchemy import CHAR, VARCHAR, Column, Integer
from sqlmodel import Field

from bisheng.common.models.base import SQLModelSerializable
from bisheng.core.database.dialect_helpers import JsonType, UPDATE_TIME_SERVER_DEFAULT


class LocalModelSource(str, Enum):
    """模型来源"""
    BUILTIN = "builtin"        # 内置模型
    DIRECTORY = "directory"    # 目录导入
    FINETUNED = "finetuned"   # 微调产出


class LocalModelStatus(str, Enum):
    """模型部署状态"""
    DEPLOYED = "deployed"     # 已部署
    OFFLINE = "offline"       # 未部署


class LocalModel(SQLModelSerializable, table=True):
    """本地模型仓库表"""

    __tablename__ = 'local_model'

    id: str = Field(
        default_factory=lambda: uuid.uuid4().hex,
        description='模型ID',
        sa_column=Column(CHAR(36), unique=True, nullable=False, primary_key=True)
    )

    name: str = Field(
        max_length=200,
        sa_column=Column(CHAR(200), nullable=False, index=True),
        description='模型名称'
    )

    arch: str = Field(
        default='',
        max_length=100,
        sa_column=Column(CHAR(100), default=''),
        description='模型架构（如 Qwen2.5, Llama, DeepSeek）'
    )

    version: str = Field(
        default='v1.0.0',
        max_length=50,
        sa_column=Column(CHAR(50), default='v1.0.0'),
        description='版本号'
    )

    source: LocalModelSource = Field(
        default=LocalModelSource.DIRECTORY,
        sa_column=Column(SQLEnum(LocalModelSource), nullable=False),
        description='模型来源'
    )

    params: str = Field(
        default='',
        max_length=50,
        sa_column=Column(CHAR(50), default=''),
        description='参数量（如 7B, 13B）'
    )

    precision: str = Field(
        default='BF16',
        max_length=50,
        sa_column=Column(CHAR(50), default='BF16'),
        description='精度（BF16, FP16, INT8 等）'
    )

    status: LocalModelStatus = Field(
        default=LocalModelStatus.OFFLINE,
        sa_column=Column(SQLEnum(LocalModelStatus), nullable=False),
        description='部署状态'
    )

    weight_path: str = Field(
        max_length=500,
        sa_column=Column(VARCHAR(500), nullable=False),
        description='权重文件在 data/llm/ 下的相对路径（即文件夹名）'
    )

    parent_id: Optional[str] = Field(
        default=None,
        sa_column=Column(CHAR(36), nullable=True, index=True),
        description='父模型ID（血缘关系）'
    )

    finetune_job_id: Optional[str] = Field(
        default=None,
        sa_column=Column(CHAR(36), nullable=True),
        description='关联的微调任务ID'
    )

    dataset: Optional[str] = Field(
        default=None,
        max_length=200,
        sa_column=Column(CHAR(200), nullable=True),
        description='训练数据集名称'
    )

    hyperparams: Optional[Dict] = Field(
        default=None,
        sa_column=Column(JsonType, nullable=True),
        description='训练超参数'
    )

    eval_loss: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
        description='评估loss'
    )

    bleu_4: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
        description='BLEU-4分数'
    )

    rouge_1: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
        description='ROUGE-1分数'
    )

    rouge_2: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
        description='ROUGE-2分数'
    )

    rouge_l: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
        description='ROUGE-L分数'
    )

    deploy_time: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
        description='部署时间'
    )

    operator: str = Field(
        default='',
        max_length=100,
        sa_column=Column(CHAR(100), default=''),
        description='操作人'
    )

    tenant_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=False, server_default=text('1'),
                         index=True, comment='Tenant ID'),
    )

    create_time: datetime = Field(
        default_factory=datetime.now,
        sa_column=Column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    )

    update_time: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True, server_default=UPDATE_TIME_SERVER_DEFAULT)
    )


class LocalModelDao:
    """本地模型数据访问对象"""

    @classmethod
    async def insert(cls, data: LocalModel) -> LocalModel:
        from bisheng.core.database import get_async_db_session
        async with get_async_db_session() as session:
            session.add(data)
            await session.commit()
            await session.refresh(data)
        return data

    @classmethod
    async def find_by_id(cls, model_id: str) -> Optional[LocalModel]:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import select
        async with get_async_db_session() as session:
            statement = select(LocalModel).where(LocalModel.id == model_id)
            return (await session.exec(statement)).first()

    @classmethod
    async def find_by_name(cls, name: str, tenant_id: int = None) -> Optional[LocalModel]:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import select
        async with get_async_db_session() as session:
            statement = select(LocalModel).where(LocalModel.name == name)
            if tenant_id is not None:
                statement = statement.where(LocalModel.tenant_id == tenant_id)
            return (await session.exec(statement)).first()

    @classmethod
    async def find_by_weight_path(cls, weight_path: str) -> Optional[LocalModel]:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import select
        async with get_async_db_session() as session:
            statement = select(LocalModel).where(LocalModel.weight_path == weight_path)
            return (await session.exec(statement)).first()

    @classmethod
    async def find_children(cls, parent_id: str) -> list:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import select
        async with get_async_db_session() as session:
            statement = select(LocalModel).where(LocalModel.parent_id == parent_id)
            return list((await session.exec(statement)).all())

    @classmethod
    async def find_all(cls, tenant_id: int = None, source: str = None,
                       status: str = None, keyword: str = None) -> list:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import select
        from sqlalchemy import or_
        async with get_async_db_session() as session:
            statement = select(LocalModel)
            if tenant_id is not None:
                statement = statement.where(LocalModel.tenant_id == tenant_id)
            if source and source != 'all':
                statement = statement.where(LocalModel.source == source)
            if status and status != 'all':
                statement = statement.where(LocalModel.status == status)
            if keyword:
                statement = statement.where(
                    or_(
                        LocalModel.name.ilike(f'%{keyword}%'),
                        LocalModel.arch.ilike(f'%{keyword}%')
                    )
                )
            statement = statement.order_by(LocalModel.create_time.desc())
            return list((await session.exec(statement)).all())

    @classmethod
    async def update(cls, data: LocalModel) -> LocalModel:
        from bisheng.core.database import get_async_db_session
        async with get_async_db_session() as session:
            session.add(data)
            await session.commit()
            await session.refresh(data)
        return data

    @classmethod
    async def delete_by_id(cls, model_id: str) -> bool:
        from bisheng.core.database import get_async_db_session
        from sqlmodel import delete
        async with get_async_db_session() as session:
            statement = delete(LocalModel).where(LocalModel.id == model_id)
            result = await session.exec(statement)
            await session.commit()
            return result.rowcount > 0
