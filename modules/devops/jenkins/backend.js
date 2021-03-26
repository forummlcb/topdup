pipeline {
    agent any

    environment {
        NVM_DIR = "/var/lib/jenkins/.nvm"
        CLOUDFRONT_ID = "E2H3MLKJWU556Q"
        ASG_ID  = "topdup-production-backend-20210320064439712100000003"
    }

    stages {
        stage('Pull Source Code') {
            steps {
                script {
                    git branch: 'webapp',
                    url: 'git@github.com:forummlcb/topdup.git'
                }
            }
        }
        stage('Build source code') {
            steps {
                dir("modules/web_app/backend/") {
                    sh '''
                        export NVM_DIR="$HOME/.nvm"
                        [ -s "$NVM_DIR/nvm.sh" ] && "." "$NVM_DIR/nvm.sh"
                        nvm use 15.11.0
                       npm install
                        npm run build
                    '''
                }
            }
        }
        stage('Build AMI') {
            steps {
                sh '''
                    today=$(date +"%Y%m%d-%H:%M")
                    git_commit_hash=$(git rev-parse --short HEAD)

                    PKR_VAR_today=${today} \
                    PKR_VAR_git_commit_hash=${git_commit_hash} \
                    packer build /var/lib/jenkins/backend.pkr.hcl
                '''
            }
        }
        stage('Change launch template version') {
            steps {
                sh '''
                    lt_id=$(aws ec2 describe-launch-templates \
                        --filters "Name=tag:Name,Values=["topdup-production-backend"]" \
                        --query "LaunchTemplates[].LaunchTemplateId" --output text)
                    AMI_ID=$(jq -r '.builds[-1].artifact_id' ami_manifest.json | cut -d ":" -f2)
                    aws ec2 create-launch-template-version \
                    --launch-template-id "${lt_id}" \
                    --source-version 1 \
                    --launch-template-data "ImageId=${AMI_ID}"
                '''
            }
        }
        stage("Rolling Updates"){
            steps {
                sh '''
                    id=$(aws autoscaling start-instance-refresh \
                    --auto-scaling-group-name ${ASG_ID} \
                        --preferences '{"InstanceWarmup": 10, "MinHealthyPercentage": 50}' --output text --query "InstanceRefreshId")
                    
                    status=$(aws autoscaling describe-instance-refreshes --max-records 1 \
                                --auto-scaling-group-name ${ASG_ID} \
                                --instance-refresh-ids ${id} \
                                --query "InstanceRefreshes[0].Status" --output text)
                    
                    while [ "${status}" != "Successful" ]; do
                      echo "Rolling....."
                      sleep 15
                      status=$(aws autoscaling describe-instance-refreshes --max-records 1 \
                        --auto-scaling-group-name ${ASG_ID} \
                        --instance-refresh-ids ${id} \
                        --query "InstanceRefreshes[0].Status" --output text)
                    done
                '''
            }
        }
    }
}
 
