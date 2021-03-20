module "prod_backend_asg" {
  source = "../../../modules/terraform-aws-autoscaling"
  name = "prod-bakend-asg"
  lc_name = "prod-backend"

  image_id        = "ami-0cf553756f68b72c9"
  instance_type   = "t3a.medium"
  security_groups = [module.prod_backend_secgroup.this_security_group_id]
  /* load_balancers  = [data.terraform_remote_state.prod_alb.outputs.prod_elb_id] */

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
  asg_name                  = "prod-backend-asg"
  vpc_zone_identifier       = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_private_subnets
  health_check_type         = "EC2"
  min_size                  = 2
  max_size                  = 4
  desired_capacity          = 2
  wait_for_capacity_timeout = 0

  tags = [
    {
      key                 = "AppFunc"
      value               = "Backend"
      propagate_at_launch = true
    },
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

module "prod_backend_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "prod_backend_secgroup"
  description = "Security group for Production Backend Ec2 instance"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = [data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block]
  ingress_rules       = ["ssh-tcp", "all-icmp"]
  ingress_with_cidr_blocks = [
    {
      from_port   = 5000
      to_port     = 5000
      protocol    = "tcp"
      description = "Allows access to SFTP from EKS and Infra subnets"
      cidr_blocks = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block
    }
  ]
  egress_rules        = ["all-all"]
}
