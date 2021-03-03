module "prod_webapp_asg" {
  source = "../../../modules/terraform-aws-autoscaling"
  name = "prod-webapp-asg"
  lc_name = "prod-webapp"

  image_id        = "ami-09a6a7e49bd29554b"
  instance_type   = "t3a.medium"
  security_groups = [module.prod_webapp_secgroup.this_security_group_id]
  load_balancers  = [data.terraform_remote_state.outputs.prod_elb_id]

  ebs_block_device = [
    {
      device_name           = "/dev/xvdz"
      volume_type           = "gp2"
      volume_size           = "50"
      delete_on_termination = true
    },
  ]

  root_block_device = [
    {
      volume_size = "50"
      volume_type = "gp2"
    },
  ]

  # Auto scaling group
  asg_name                  = "prod-webapp-asg"
  vpc_zone_identifier       = data.aws_subnet_ids.all.ids
  health_check_type         = "EC2"
  min_size                  = 2
  max_size                  = 4
  desired_capacity          = 2
  wait_for_capacity_timeout = 0

  tags = [
    {
      key                 = "Environment"
      value               = "topdup-prod"
      propagate_at_launch = true
    },
    {
      key                 = "Terraform"
      value               = "true"
      propagate_at_launch = true
    },
  ]
}

module "prod_webapp_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "prod_webapp_secgroup"
  description = "Security group for Production Webapp Ec2 instance"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = [data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block]
  ingress_rules       = ["ssh-tcp", "all-icmp", "http-80-tcp"]
  egress_rules        = ["all-all"]
}
