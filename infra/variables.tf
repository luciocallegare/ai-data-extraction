variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "container_port" {
  description = "Port the API container listens on"
  type        = number
  default     = 4000
}

variable "api_image_uri" {
  description = "ECR image URI for the API (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com/ai-extractor-api:latest)"
  type        = string
}

variable "mongodb_uri" {
  description = "MongoDB connection URI (DocumentDB or Atlas)"
  type        = string
}

variable "llm_provider" {
  description = "LLM provider (mock, openai, anthropic)"
  type        = string
  default     = "mock"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (optional)"
  type        = string
  default     = ""
}

variable "task_cpu" {
  description = "CPU units for the Fargate task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory in MiB for the Fargate task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of Fargate tasks"
  type        = number
  default     = 2
}

variable "jwt_secret_value" {
  description = "JWT secret value (min 16 chars)"
  type        = string
  sensitive   = true
}

variable "openai_api_key_value" {
  description = "OpenAI API key value"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key_value" {
  description = "Anthropic API key value"
  type        = string
  sensitive   = true
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}