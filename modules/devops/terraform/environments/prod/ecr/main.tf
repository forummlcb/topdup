module "topdup_ecr" { 
  source    = "git::git@github.com:cxagroup/infra-terraform-base.git//ecr"
  namespace = "infra"
  names     = [
    "chatops",
    "chatops-cronjobs",
  ]
  tags  = {
    Terraform   = "true"
    Owner       = "devops"
    Environment = "topdup-prod"
  }
}
