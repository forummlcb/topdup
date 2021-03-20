data "terraform_remote_state" "prod_vpc" {
  backend = "s3"
  config  = {
    bucket  = "infra-remotestates"
    key     = "prod/vpc"
    region  = "ap-southeast-1"
  }
}
