module "prod_webapp" {
  source = "../../../modules/terraform-aws-ec2-instance"

  name                   = "topdup-prod-webapp"
  instance_count         = 1
  ami                    = "ami-06fb5332e8e3e577a"
  instance_type          = "t3a.medium"
  key_name               = "topdup-prod"
  user_data              = base64encode(local.user_data)
  root_block_device = [
    {
      volume_size           = 20
      delete_on_termination = true
    }
  ]

  ebs_block_device = [
    {
      device_name = "/dev/sdf"
      volume_type = "gp2"
      volume_size = 50
    }
  ]

  disable_api_termination     = true
  vpc_security_group_ids      = tolist([module.prod_webapp_secgroup.this_security_group_id])
  subnet_ids                  = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_private_subnets

  tags= {
    Name        = "topdup-prod-webapp"
    Terraform   = "true"
    Environment = "topdup-prod"
    Function    = "webapp"
  }
}

module "prod_webapp_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "webapp_secgroup"
  description = "Security group for DataWrangling Ec2 instance"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = [data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block]
  ingress_rules       = ["ssh-tcp", "all-icmp"]
  egress_rules        = ["all-all"]
}
