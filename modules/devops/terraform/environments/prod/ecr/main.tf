module "topdup_ecr" { 
  source    = "../../../modules//terraform-aws-ecr"
  namespace = "infra"
  names     = [
    "ml",
    "webapp",
    "crawler",
    "data-wrangling"
  ]
  tags  = {
    Terraform   = "true"
    Owner       = "devops"
    Environment = "topdup-prod"
  }
}
