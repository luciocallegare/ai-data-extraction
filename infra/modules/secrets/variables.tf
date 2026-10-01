variable "jwt_secret_key_name" {
  type        = string
  default     = "ai-extractor/jwt-secret"
}

variable "openai_api_key_name" {
  type        = string
  default     = "ai-extractor/openai-api-key"
}

variable "anthropic_api_key_name" {
  type        = string
  default     = "ai-extractor/anthropic-api-key"
}

variable "jwt_secret_value" {
  type        = string
  sensitive   = true
}

variable "openai_api_key_value" {
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key_value" {
  type        = string
  sensitive   = true
  default     = ""
}