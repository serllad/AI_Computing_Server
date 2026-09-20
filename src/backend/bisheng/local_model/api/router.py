from fastapi import APIRouter
from .endpoints.local_model import router as local_model_router

router = APIRouter(prefix='/local-model', tags=['LocalModel'])
router.include_router(local_model_router)
