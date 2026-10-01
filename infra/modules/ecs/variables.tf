variable "vpc_id" {
  type        = string
}

variable "private_subnet_ids" {
  type        = list(string)
}

variable "public_subnet_ids" {
  type        = list(string)
}

variable "alb_sg_id" {
  type        = string
}

variable "ecs_sg_id" {
  type        = string
}

variable "container_port" {
  type        = number
  default     = 4000
}

variable "image_uri" {
  type        = string
}

variable "ecr_repository_name" {
  type        = string
  default     = "ai-extractor-api"
}

variable "task_cpu" {
  type        = number
  default     = 512
}

variable "task_memory" {
  type        = number
  default     = 1024
}

variable "desired_count" {
  type        = number
  default     = 2
}

variable "secrets_arn" {
  type        = string
}

variable "mongodb_uri" {
  type        = string
}

variable "llm_provider" {
  type        = string
  default     = "mock"
}

variable "log_group_name" {
  type        = string
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
}