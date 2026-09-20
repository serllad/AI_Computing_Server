// @ts-strict-ignore
import axios from "../request";

// ==================== 本地模型仓库 API ====================

export interface LocalModelRecord {
    id: string;
    name: string;
    arch: string;
    version: string;
    source: 'builtin' | 'directory' | 'finetuned';
    params: string;
    precision: string;
    status: 'deployed' | 'offline';
    weight_path: string;
    parent_id?: string;
    finetune_job_id?: string;
    dataset?: string;
    hyperparams?: Record<string, string>;
    eval_loss?: number;
    bleu_4?: number;
    rouge_1?: number;
    rouge_2?: number;
    rouge_l?: number;
    deploy_time?: string;
    operator: string;
    create_time: string;
    update_time?: string;
    train_data?: any[];
    preset_data?: any[];
}

export interface LocalModelDetail {
    model: LocalModelRecord;
    lineage: LocalModelRecord[];
}

export interface UploadResult {
    model: LocalModelRecord;
    uploaded_files: string[];
    message: string;
}

export interface UploadProgress {
    loaded: number;      // 已上传字节数
    total: number;       // 总字节数
    percentage: number;  // 进度百分比 0-100
    speed: number;       // 上传速度 bytes/s
}

// 获取本地模型列表
export const getLocalModelsApi = async (params?: {
    source?: string;
    status?: string;
    keyword?: string;
}): Promise<LocalModelRecord[]> => {
    return await axios.get(`/api/v1/local-model/list`, { params });
};

// 获取模型详情（含血缘链）
export const getLocalModelDetailApi = async (modelId: string): Promise<LocalModelDetail> => {
    return await axios.get(`/api/v1/local-model/${modelId}`);
};

// 上传结果（含检测信息，尚未入库）
export interface UploadPreviewResult {
    folder_name: string;
    uploaded_files: string[];
    detected: { arch: string; params: string };
    message: string;
}

// 上传模型文件夹（支持进度回调，返回检测信息供用户确认）
export const uploadLocalModelApi = async (
    files: File[],
    folderName: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadPreviewResult> => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('folder_name', folderName);

    let lastLoaded = 0;
    let lastTime = Date.now();

    return await axios.post(`/api/v1/local-model/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (!onProgress || !progressEvent.total) return;

            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000; // 秒
            const loadedDiff = progressEvent.loaded - lastLoaded;

            const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);

            onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage,
                speed,
            });

            lastLoaded = progressEvent.loaded;
            lastTime = now;
        },
    });
};

// 确认入库（用户修订后）
export const confirmUploadApi = async (data: {
    folder_name: string;
    name: string;
    arch: string;
    params: string;
    precision: string;
}): Promise<LocalModelRecord> => {
    return await axios.post(`/api/v1/local-model/upload/confirm`, data);
};

// 导入模型（服务器本地路径）
export const importLocalModelApi = async (data: {
    name: string;
    weight_path: string;
    arch?: string;
    params?: string;
    precision?: string;
}): Promise<LocalModelRecord> => {
    return await axios.post(`/api/v1/local-model/import`, data);
};

// 部署模型
export const deployLocalModelApi = async (modelId: string): Promise<LocalModelRecord> => {
    return await axios.post(`/api/v1/local-model/${modelId}/deploy`);
};

// 下线模型
export const undeployLocalModelApi = async (modelId: string): Promise<LocalModelRecord> => {
    return await axios.post(`/api/v1/local-model/${modelId}/undeploy`);
};

// 删除模型
export const deleteLocalModelApi = async (modelId: string): Promise<any> => {
    return await axios.delete(`/api/v1/local-model/${modelId}`);
};
