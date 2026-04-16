# 免费版单 Waiter 实施清单

## 1. 目标与范围

### 目标
- 免费版只支持 1 个 waiter 账号。
- 不实现换班交接能力（下个版本再做）。
- 不影响现有点单、送厨、结账、打印流程。

### 本版本不做
- 不做 waiter 间订单移交。
- 不做 assignedTo 接手流程。
- 不做交接审计日志。

## 2. 当前代码现状（已具备基础）
- 后端 Restaurant 模型已有 waiterLimit，默认值为 1。
- 后端 inviteWaiter/registerWaiter 已调用 checkWaiterLimit。
- GraphQL 已有 getRestaurant.subscriptionPlan/subscriptionExpiry，可用于前端展示文案。
- 订单模型保留 waiterId，可继续追踪创建人。

## 3. 产品规则（先定死）
- 免费版（BASIC）最多 1 个有效 waiter。
- 当已有 1 个 waiter 时：
  - 不允许再邀请 waiter。
  - 不允许通过注册链接完成第二个 waiter 注册。
- 登录层不做多账号并发控制（可由 Cognito 自然处理），重点是账号数量上限控制。
- 用户可见提示统一为：
  - 免费版仅支持 1 个 waiter 账号。
  - 升级到高级版可支持多 waiter 与换班协作。

## 4. 后端实现清单（强制校验，防绕过）

### 4.1 统一错误码与错误文案
- 在 waiter 相关 resolver 返回可识别错误码（例如 WAITER_LIMIT_REACHED）。
- 保证 inviteWaiter 与 registerWaiter 在超限时返回一致错误码与一致文案。

### 4.2 核心拦截点
- inviteWaiter：保留并强化 checkWaiterLimit 失败分支错误码。
- registerWaiter：保留并强化 checkWaiterLimit 失败分支错误码。
- activateWaiter（若有激活逻辑）：增加同样 waiterLimit 检查，避免旁路激活。

### 4.3 防并发超发
- 邀请/注册入口在高并发下可能同时通过计数检查。
- 需要在同一事务或原子更新策略中再次确认 waiter 数量（至少二次校验）。

### 4.4 返回可用于前端展示的限制信息（可选）
- 在错误扩展字段中返回 currentCount 与 limit。
- 便于前端显示“当前 1/1，已达上限”。

## 5. 前端实现清单（提示清晰，不做复杂流程）

### 5.1 能力文案
- 在账号管理或邀请 waiter 的入口展示计划说明：
  - BASIC: 1 waiter
  - PREMIUM: 多 waiter

### 5.2 失败态统一处理
- 对 WAITER_LIMIT_REACHED 进行单独弹窗处理：
  - 标题：已达免费版上限
  - 内容：免费版仅支持 1 个 waiter，升级后可添加更多 waiter。

### 5.3 登录页提示（轻量）
- 登录页可增加一行小字：免费版为单 waiter 值班模式。
- 仅做提示，不阻断正常登录。

### 5.4 数据层保持扩展性
- 继续保留订单 waiterId 字段。
- 不把未完成订单绑定为“仅本人可见”规则，避免未来多 waiter 重构成本。

## 6. 测试用例清单（必须通过）

### 6.1 正常路径
- 新餐厅（BASIC）无 waiter 时，可成功邀请并注册第 1 个 waiter。
- 第 1 个 waiter 可正常登录点单、送厨、结账。

### 6.2 限额路径
- BASIC 下，已有 1 个有效 waiter 后再次 inviteWaiter：失败，返回 WAITER_LIMIT_REACHED。
- BASIC 下，尝试使用第二个注册链接 registerWaiter：失败，返回 WAITER_LIMIT_REACHED。
- BASIC 下，通过 activateWaiter 旁路激活第二人：失败（如果有该入口）。

### 6.3 删除与回收
- 删除 waiter 后，再邀请新 waiter：成功。
- 软删除 waiter 不应继续占用可用名额（按产品策略确认）。

### 6.4 并发与幂等
- 两次并发邀请同一时刻触发，最终有效 waiter 数不超过 1。
- 同一注册链接重复提交不产生第二个有效 waiter。

### 6.5 回归
- 不影响 getTableStatus、confirmOrderItems、payOrder。
- 不影响现有 paid/pending 流程与打印流程。

## 7. 发布与回滚

### 发布前检查
- 后端错误码在三处入口一致：invite/register/activate。
- 前端能识别并展示 WAITER_LIMIT_REACHED。
- 至少完成 1 轮手工回归（点单到结账全链路）。

### 回滚策略
- 如出现误拦截，可临时降级为仅后端文案提示（不改业务数据）。
- 保持 waiterLimit=1 不变，避免数据层混乱。

## 8. 下版本（多 Waiter）预留任务
- 订单归属从“创建人视角”升级为“门店公共订单池 + 可接手”。
- 增加 assignedTo、handover log、并发版本控制。
- 登录后默认拉取“本店未完成订单”，而非“我创建的订单”。

## 9. 文件落点建议
- 后端：
  - lambdas/emenu_server/resolvers/waiter.js
  - lambdas/emenu_server/utils/subscription-limits.js
- 前端（如需展示计划限制）：
  - src/graphql/queries.ts
  - 管理 waiter 的页面组件（若当前仓库在 admin 端实现，则在 eMenu-admin 对应页面）
  - src/screens/LoginScreen.tsx（轻量提示可选）
