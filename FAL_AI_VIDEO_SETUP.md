# Fal.ai 动画视频生成设置指南

## 概述

本指南说明如何在 fal.ai 平台上设置动画视频生成功能，以替代原有的图片生成功能。

## 一、在 Fal.ai 平台上的设置

### 1. 登录 Fal.ai 账户
- 访问 [fal.ai](https://fal.ai)
- 使用您的账户登录（FAL_KEY: `fe7aa0cd-770b-4637-ab05-523a332169b4:dca9c9ff8f073a4c33704236d8942faa`）

### 2. 确认账户权限
- 确保您的账户支持视频生成功能
- 检查账户余额或订阅计划是否包含视频生成服务
- 视频生成通常需要更高的配额或付费计划

### 3. 选择合适的视频生成模型

Fal.ai 提供多种视频生成模型，建议使用以下之一：

#### 选项 A：Flux Schnell（快速视频生成）
- **API 端点**: `https://fal.run/fal-ai/flux-schnell`
- **特点**: 生成速度快，适合实时交互
- **参数**:
  - `prompt`: 文本提示词
  - `image_size`: 视频尺寸 (例如: "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9")
  - `num_frames`: 帧数（默认约 25 帧，约 1 秒视频）
  - `num_inference_steps`: 推理步数（默认 6）

#### 选项 B：Flux Pro（高质量视频生成）
- **API 端点**: `https://fal.run/fal-ai/flux-pro/v2`
- **特点**: 视频质量更高，但生成时间较长
- **参数**: 类似 Flux Schnell，但质量参数更高

#### 选项 C：其他视频模型
- 访问 [fal.ai 模型库](https://fal.ai/models) 查看最新的视频生成模型
- 选择适合您需求的模型和端点

### 4. 测试 API 端点

在集成前，建议先通过以下方式测试：

**使用 curl 测试**:
```bash
curl -X POST https://fal.run/fal-ai/flux-schnell \
  -H "Authorization: Key YOUR_FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A charming illustration for a children story: a young boy named Max in a magical forest, facing a challenge. Colorful, friendly, and suitable for children.",
    "image_size": "landscape_16_9",
    "num_frames": 25,
    "num_inference_steps": 6
  }'
```

**预期响应格式**:
```json
{
  "video": {
    "url": "https://fal.ai/files/...",
    "content_type": "video/mp4"
  },
  "status": "completed"
}
```

## 二、代码修改说明

### 需要修改的文件

1. **`app/api/generate-image/route.ts`** - 主要的图片生成 API
2. **`app/api/dify-structure-examples/route.ts`** - 故事结构示例生成 API
3. **`components/stages/story-structure.tsx`** - 前端显示组件

### 修改建议

#### 方案 1：创建新的视频生成 API（推荐）

创建新文件 `app/api/generate-video/route.ts`，专门用于视频生成，保留原有的图片生成功能用于其他场景。

#### 方案 2：修改现有图片生成 API

直接在 `app/api/generate-image/route.ts` 中修改为视频生成，但这会影响所有使用该 API 的地方。

**建议采用方案 1**，这样只影响故事结构生成环节，其他功能保持不变。

## 三、Fal.ai API 调用参数说明

### 视频生成 API 请求格式

```json
{
  "prompt": "文本提示词描述",
  "image_size": "landscape_16_9",  // 视频尺寸
  "num_frames": 25,                 // 视频帧数（约 1 秒）
  "num_inference_steps": 6          // 推理步数（质量越高步数越多）
}
```

### 响应格式

```json
{
  "video": {
    "url": "https://fal.ai/files/video.mp4",
    "content_type": "video/mp4",
    "file_name": "video.mp4"
  },
  "status": "completed"
}
```

### 注意事项

1. **超时设置**: 视频生成需要更长时间，建议将超时时间从 120 秒增加到 300 秒（5 分钟）
2. **异步模式**: 某些模型可能需要异步调用，先返回任务 ID，然后轮询结果
3. **成本考虑**: 视频生成比图片生成消耗更多配额，注意监控使用量
4. **视频格式**: 确认返回的视频格式（通常是 MP4），确保前端能正常播放

## 四、前端显示修改

### HTML5 Video 标签替换 img 标签

在 `components/stages/story-structure.tsx` 中，需要将：

```tsx
<img
  src={example.imageUrl}
  alt={`Example for ${structure.name}`}
  className="w-full h-auto max-h-[500px] min-h-[400px] object-contain"
/>
```

替换为：

```tsx
<video
  src={example.videoUrl}
  controls
  autoPlay
  loop
  muted
  className="w-full h-auto max-h-[500px] min-h-[400px] object-contain"
>
  您的浏览器不支持视频播放
</video>
```

### 数据接口修改

将 `imageUrl` 字段改为 `videoUrl`，或同时保留两个字段以支持向后兼容。

## 五、推荐的完整实施步骤

1. **第一步**: 在 fal.ai 平台测试视频生成 API，确认账户权限和配额
2. **第二步**: 创建新的 `/api/generate-video` API 端点
3. **第三步**: 修改 `dify-structure-examples/route.ts`，使用视频生成替代图片生成
4. **第四步**: 修改 `story-structure.tsx` 组件，使用 `<video>` 标签显示
5. **第五步**: 测试整个流程，确保视频正常生成和播放
6. **第六步**: 调整超时时间、错误处理等参数

## 六、常见问题

### Q1: Fal.ai 视频生成是否需要特殊权限？
A: 某些高级视频模型可能需要付费计划或更高的账户等级，请在 fal.ai 账户页面检查。

### Q2: 视频生成速度慢怎么办？
A: 
- 使用 `flux-schnell` 等快速模型
- 减少 `num_frames`（帧数）
- 减少 `num_inference_steps`（但会影响质量）
- 考虑使用异步模式

### Q3: 如何处理视频生成失败？
A: 
- 增加重试机制
- 设置合理的超时时间
- 准备占位视频或降级到图片显示
- 记录错误日志便于排查

### Q4: 视频文件太大怎么办？
A:
- 降低视频分辨率
- 减少帧数
- 使用压缩格式
- 考虑使用 CDN 加速播放

## 七、参考资源

- Fal.ai 官方文档: https://fal.ai/docs
- Fal.ai 模型库: https://fal.ai/models
- Fal.ai API 参考: https://fal.ai/docs/api

## 八、下一步行动

1. 访问 fal.ai 平台，测试视频生成 API
2. 确认您选择的视频模型端点和参数
3. 告诉我您选择的方案，我可以帮您修改代码

---

**注意**: 本指南基于当前 fal.ai API 的一般性信息。实际 API 端点、参数和响应格式可能会有所变化，请以 fal.ai 官方文档为准。


