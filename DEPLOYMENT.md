# Filmhouse 部署指南

## 后端部署 (Railway)

### 1. 创建 Railway 项目
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
cd backend
railway init
```

### 2. 添加 MySQL 数据库
在 Railway Dashboard 中:
1. 点击 "New" → "Database" → "MySQL"
2. 等待数据库创建完成
3. 复制连接信息

### 3. 配置环境变量
在 Railway Dashboard 的 Variables 中添加:

```
SERVER_PORT=8080
GIN_MODE=release

# 数据库 (Railway 会自动提供这些)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# JWT
JWT_SECRET=your-production-secret-key-here

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx (或测试 key: sk_test_xxx)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx (或测试 key: pk_test_xxx)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=Filmhouse <tickets@yourdomain.com>

# CORS
CORS_ORIGINS=https://filmhouse.vercel.app,https://your-custom-domain.com

# 首次部署设为 true，之后改为 false
SEED_DATA=false
```

### 4. 部署
```bash
railway up
```

### 5. 获取后端 URL
部署完成后，在 Railway Dashboard 中获取公开 URL，格式类似:
`https://filmhouse-backend-production.up.railway.app`

---

## 前端部署 (Vercel)

### 1. 连接 GitHub 仓库
1. 登录 Vercel Dashboard
2. 点击 "New Project"
3. 导入 GitHub 仓库
4. 选择 `frontend` 目录作为 Root Directory

### 2. 配置环境变量
在 Vercel Project Settings → Environment Variables 中添加:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx (或测试 key: pk_test_xxx)
```

### 3. 部署
Vercel 会自动部署。每次推送到 main 分支都会触发新部署。

---

## Stripe Webhook 配置

1. 登录 Stripe Dashboard
2. 进入 Developers → Webhooks
3. 点击 "Add endpoint"
4. 输入 Webhook URL: `https://your-railway-backend-url.up.railway.app/api/webhook/stripe`
5. 选择事件:
   - `checkout.session.completed`
   - `checkout.session.expired`
6. 复制 Webhook Secret 到 Railway 环境变量

---

## 测试模式 vs 生产模式

### 测试模式 (推荐先用这个)
- 使用 `sk_test_` 和 `pk_test_` 开头的 keys
- 可以用测试卡号: `4242 4242 4242 4242`
- PayNow 测试: Stripe 会显示测试 QR 码

### 生产模式
- 使用 `sk_live_` 和 `pk_live_` 开头的 keys
- 需要完成 Stripe 账户验证
- 真实扣款

---

## 常见问题

### CORS 错误
确保 Railway 环境变量 `CORS_ORIGINS` 包含你的 Vercel 域名。

### 数据库连接失败
检查 Railway MySQL 服务是否正常运行，环境变量是否正确引用。

### Stripe Webhook 失败
1. 检查 Webhook URL 是否正确
2. 检查 `STRIPE_WEBHOOK_SECRET` 是否匹配
3. 查看 Stripe Dashboard 的 Webhook 日志
