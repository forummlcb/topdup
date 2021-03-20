module "topdup_prod_frontend" {
  source = "../../../modules//terraform-aws-ecr"

  bucket = "topdup-prod-frontend"
  acl    = "private"

  versioning = {
    enabled = true
  }
}
