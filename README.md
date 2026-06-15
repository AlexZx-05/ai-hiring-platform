# AI Hiring Platform

Cloud-native AI-powered hiring platform for resume screening, candidate ranking, and interview question generation.

## 📋 Project Overview

### MVP Features
- ✅ Candidate resume upload & parsing
- ✅ AI-powered resume scoring with explainability
- ✅ Recruiter dashboard with candidate ranking & filtering
- ✅ AI-generated interview questions

### Tech Stack
- **Frontend**: Next.js 16+ with React 19, TailwindCSS, AWS Amplify
- **Backend**: TypeScript Lambda functions (AWS), SQS, DynamoDB
- **Infrastructure**: Terraform (IaC) for AWS resources
- **Authentication**: AWS Cognito

---

## 🚀 Getting Started

### Prerequisites

Before running the project, ensure you have:

- **Node.js** 18+ and npm
- **AWS CLI** configured with credentials
  ```bash
  aws configure
  ```
- **Terraform** 1.0+
- **Docker & Docker Compose** (optional, for local services)
- **Git** for version control

### Project Structure

```
.
├── frontend/              # Next.js web application
├── backend/               # Lambda functions & shared utilities
├── infrastructure/        # Terraform IaC for AWS
├── docs/                  # Architecture & documentation
└── scripts/               # Utility scripts
```

---

## 🏃 How to Run the Project

### Option 1: Local Development (Frontend + Backend Locally)

#### Step 1: Backend Setup

```bash
cd backend
npm install

# Build TypeScript
npm run build

# Type check
npm run typecheck
```

**Backend Output**: Compiled `.js` files ready for AWS Lambda deployment or local testing.

#### Step 2: Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:3000**

**Frontend Scripts**:
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

#### Step 3: Infrastructure Setup (AWS Deployment)

For **development environment**:

```bash
cd infrastructure/terraform/environments/dev

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your AWS region and settings
nano terraform.tfvars

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

**What gets provisioned**:
- ✅ S3 bucket for resume storage (encrypted, public access blocked)
- ✅ SQS queue + Dead Letter Queue for async processing
- ✅ DynamoDB single-table with GSIs
- ✅ AWS Cognito user pool & authentication
- ✅ API Gateway REST API
- ✅ Lambda function skeleton for resume parsing
- ✅ CloudWatch logs & alarms

For **production environment**, follow similar steps in `infrastructure/terraform/environments/prod`

---

### Option 2: Running with Docker Compose (Coming Soon)

```bash
docker-compose up
```

---

## 📚 Development Workflow

### 1. Adding Dependencies

**Backend**:
```bash
cd backend
npm install <package-name>
```

**Frontend**:
```bash
cd frontend
npm install <package-name>
```

### 2. Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
npm run start
```

### 3. Deploying Lambda Functions

After building the backend:

```bash
# Package and deploy to AWS (if using SAM or Terraform)
terraform apply  # in infrastructure/terraform/environments/dev
```

---

## 🏗️ Architecture

### Single Table DynamoDB Design
- **Primary Key**: `tenantId` (partition key)
- **Sort Key**: `entityId` (sort key)
- **GSI1, GSI2**: For multi-tenant queries
- See `docs/DYNAMODB_SINGLE_TABLE.md` for detailed schema

### AWS Services Workflow

```
Frontend Upload
    ↓
API Gateway (Cognito Auth)
    ↓
Lambda (Pre-signed URL generation)
    ↓
S3 Resume Upload
    ↓
SQS Trigger
    ↓
Lambda Parse Resume
    ↓
DynamoDB Store Results
```

---

## 📖 Documentation

- **[Week 1 Foundation](docs/WEEK1_FOUNDATION.md)** - MVP scope, architecture baseline
- **[DynamoDB Single Table Model](docs/DYNAMODB_SINGLE_TABLE.md)** - Data schema & GSI design
- **[Phase 1 System Design](docs/PHASE1_SYSTEM_DESIGN.md)** - Complete architecture details
- **[Week 2 Implementation Plan](docs/WEEK2_IMPLEMENTATION.md)** - Next development phase

---

## 🧪 Testing & Validation

```bash
# Type checking
cd backend && npm run typecheck
cd frontend && npm run lint

# Terraform validation
cd infrastructure/terraform/environments/dev
terraform validate
```

Check `docs/ops/WEEK1_VERIFICATION.md` for verification steps.

---

## 🔐 Environment Configuration

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_AMPLIFY_REGION=us-east-1
NEXT_PUBLIC_AMPLIFY_COGNITO_REGION=us-east-1
NEXT_PUBLIC_API_ENDPOINT=https://your-api-gateway-url
```

### Backend
Lambda functions use AWS SDK with IAM roles configured via Terraform.

---

## 📝 Troubleshooting

| Issue | Solution |
|-------|----------|
| AWS credentials not found | Run `aws configure` and set up your credentials |
| Terraform state lock | Check for concurrent applies; remove lock: `terraform force-unlock <id>` |
| Node modules issues | Delete `node_modules` and `package-lock.json`, then `npm install` |
| Port 3000 already in use | Use `PORT=3001 npm run dev` for frontend |

---

## 🤝 Development Environment Variables

Create `.env.local` files in respective folders:

**Backend**: AWS credentials (via IAM roles in production)
**Frontend**: API endpoints, Amplify configuration

---

## ✅ Next Steps (Week 2)
- [ ] Implement Cognito authentication in frontend
- [ ] Create pre-signed URL API endpoint
- [ ] Strict file validation for resumes
- [ ] End-to-end upload flow testing
- [ ] Deploy to AWS

## Week 1 Status (Foundation)
- MVP scope frozen
- Monorepo layout finalized (`frontend`, `backend`, `infrastructure`, `docs`, `scripts`)
- Terraform baseline added for `dev` and `prod`
- DynamoDB single-table model defined with `tenantId` partition strategy

## Terraform Baseline Components
- S3 resume bucket
- SQS processing queue + DLQ
- Lambda `parse-resume` skeleton
- DynamoDB single-table with GSIs
- Cognito user pool, client, role groups
- API Gateway baseline REST API
- CloudWatch log group + alarms
