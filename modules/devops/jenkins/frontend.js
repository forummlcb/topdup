pipeline {
    agent any

    environment {
        NVM_DIR = "/var/lib/jenkins/.nvm"
        CLOUDFRONT_ID = "E2H3MLKJWU556Q"
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
        stage('Change config'){
            steps {
                dir('modules/web_app/frontend/') {
                    sh '''
                        cp -rf /var/lib/jenkins/frontend_config.js src/api.js
                    '''
                }
            }
        }
        stage('Build'){
            steps {
                dir('modules/web_app/frontend/') {
                   sh '''
                        export NVM_DIR="$HOME/.nvm"
                        [ -s "$NVM_DIR/nvm.sh" ] && "." "$NVM_DIR/nvm.sh"
                        nvm use 15.11.0 && npm install && npm run build
                    '''
                }
            }
        }
        stage('Deploy'){
            steps {
                dir('modules/web_app/frontend/') {
                    sh '''
                        aws s3 sync build/ s3://topdup-prod-frontend/
                        aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"
                        sleep 15
                    '''
                }
            }
        }
        stage('Check Deployment status'){
            steps {
                sh '''
                    status=$(aws cloudfront get-distribution --id ${CLOUDFRONT_ID} --query "Distribution.Status" --output text)
                    while [ "${status}" != "Deployed" ]; do
                      echo "Deploying"
                      sleep 15
                      status=$(aws cloudfront get-distribution --id ${CLOUDFRONT_ID} --query "Distribution.Status" --output text)
                    done
                '''
            }
        }
    }
}
 
