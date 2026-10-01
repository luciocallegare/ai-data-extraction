variable "log_group_name" {
  type        = string
  default     = "/ecs/ai-extractor-api"
}

variable "retention_days" {
  type        = number
  default     = 30
}

variable "ecs_cluster_name" {
  type        = string
}

variable "ecs_service_name" {
  type        = string
}

variable "alb_name" {
  type        = string
}