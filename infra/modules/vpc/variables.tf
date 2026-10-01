variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "container_port" {
  type        = number
  default     = 4000
}