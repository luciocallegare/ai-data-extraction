terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"
  vpc_cidr = var.vpc_cidr
}

module "ecs" {
  source = "./modules/ecs"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  alb_sg_id          = module.vpc.alb_sg_id
  ecs_sg_id          = module.vpc.ecs_sg_id
  container_port     = var.container_port
  image_uri          = var.api_image_uri
  task_cpu           = var.task_cpu
  task_memory        = var.task_memory
  desired_count      = var.desired_count
  secrets_arn        = module.secrets.secrets_arn
  log_group_name     = module.cloudwatch.log_group_name
  mongodb_uri        = var.mongodb_uri
  llm_provider       = var.llm_provider
  aws_region         = var.aws_region
  acm_certificate_arn = var.acm_certificate_arn
}

module "secrets" {
  source = "./modules/secrets"
  jwt_secret_key_name     = var.jwt_secret_key_name
  openai_api_key_name     = var.openai_api_key_name
  anthropic_api_key_name  = var.anthropic_api_key_name
  jwt_secret_value        = var.jwt_secret_value
  openai_api_key_value    = var.openai_api_key_value
  anthropic_api_key_value = var.anthropic_api_key_value
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
  log_group_name    = "/ecs/ai-extractor-api"
  retention_days    = var.log_retention_days
  ecs_cluster_name  = module.ecs.ecs_cluster_name
  ecs_service_name  = module.ecs.ecs_service_name
  alb_name          = "ai-extractor-alb"
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "api_url" {
  value = "http://${module.ecs.alb_dns_name}"
}