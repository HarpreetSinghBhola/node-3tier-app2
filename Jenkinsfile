pipeline {
    agent any 
    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
        timeout(time: 2, unit: 'HOURS')
        disableConcurrentBuilds()
    }
    parameters {
		choice (name: 'AWS_REGION',
				choices: ['eu-west-1'],
				description: 'Select Region')
		choice (name: 'AWS_ACCOUNT_ID',
				choices: [ '970247663978'],
				description: 'Select AWS account ')
		string (name: 'PROFILE',
			   defaultValue: 'dev-aws',
			   description: 'Optional. Target aws profile defaults to dev-aws')
    }
     stages {
        stage('Build Docker Images'){
            steps {
                script {
                    try {
                        cleanUp()
                        checkout scm
                        sh "git clean -xdf"
                        sh '''
                        cd app
                        echo Building the Docker image...
                        docker-compose build --no-cache
                        docker images
                        '''
                    } catch (ex) {
                        echo 'Err: Error occured in building images: ' + ex.toString()
                        currentBuild.result = "FAILED"
                        sh "exit 1"
                    }
                }
            }
        }
        stage('Run Docker Local Tests') {
            steps {
                script {
                    try{
                        echo " Running Test Docker image"
                        sh '''
                        if [-z \$(docker ps -a -q)]; then
				docker stop \$(docker ps -a -q)
			fi
                        cd $WORKSPACE/app
                        docker-compose up -d'''
                    } catch (ex) {
                        echo 'Err: Found failure in Container testing: ' + ex.toString()
                        currentBuild.result = "FAILED"
                        sh 'exit 1'
                    } 
                }
                script{
                    host_ip = "localhost:1667"
                    curlRun ("http://${host_ip}", 'http_code') 
                }
            }
        }
        stage('Pushing to ECR') {
                steps {
                    script {
                            WEB_IMAGE_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/compose-web"
                            API_IMAGE_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/compose-app"
                            WEB_ECR_URI = "${WEB_IMAGE_URI}:infraweb-${BRANCH_NAME}-${BUILD_NUMBER}"
                            API_ECR_URI = "${API_IMAGE_URI}:infraapi-${BRANCH_NAME}-${BUILD_NUMBER}"
                        }
                    script {
                        withCredentials(bindings: [usernamePassword(credentialsId: PROFILE, \
                            usernameVariable: 'aws_access_id',passwordVariable: 'aws_secret_key')])  {
                            sh '''
                            set +x
                            /usr/local/bin/aws configure --profile ${PROFILE} set aws_access_key_id ${aws_access_id}
							/usr/local/bin/aws configure --profile ${PROFILE} set aws_secret_access_key ${aws_secret_key}
							/usr/local/bin/aws configure --profile ${PROFILE} set region ${AWS_REGION} 
							set -x
							'''
                        }
                        try {
                            sh '''
                            echo Logging in to Amazon ECR...
                            WEB_IMAGE_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compose-web
                            API_IMAGE_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compose-app
                            aws ecr get-login-password --region $AWS_REGION --profile ${PROFILE} | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                            docker tag infraapi-$BRANCH_NAME-$BUILD_NUMBER:latest ${API_IMAGE_URI}:infraapi-$BRANCH_NAME-$BUILD_NUMBER
                            docker tag infraweb-$BRANCH_NAME-$BUILD_NUMBER:latest ${WEB_IMAGE_URI}:infraweb-$BRANCH_NAME-$BUILD_NUMBER
                            echo Pushing the Docker images to ECR...
                            docker push $API_IMAGE_URI:infraapi-$BRANCH_NAME-$BUILD_NUMBER
                            docker push $WEB_IMAGE_URI:infraweb-$BRANCH_NAME-$BUILD_NUMBER
                            '''
                        } catch (ex) {
                            echo 'Err: Error occured in pushing images: ' + ex.toString()
                            currentBuild.result = "FAILED"
                            sh "exit 1"
                        }
                    }
                }   
            }
        stage('Kubernetes Deployment'){
            steps {
                script {
                    try {
                        echo "starting deployment"
                        helmInstall ("${WEB_ECR_URI}", "${API_ECR_URI}")
                    } catch (ex) {
                        echo 'Err: Error occured in Kubernetes Deployment: ' + ex.toString()
                        currentBuild.result = "FAILED"
                        sh "exit 1"
                    }
                }
            }
        }
        stage('Post Deployment Tests') {
            steps {
                script{
                    try{
                        namespace = 'toptal'
                        curlTest (namespace, 'http_code')
                    } catch (ex) {
                        echo 'Err: Error occured in Post Deployment tests: ' + ex.toString()
                        currentBuild.result = "FAILED"
                        sh "exit 1"
                    }
                }
            }
        }
    }

    post {
        always {
                 { 
                echo "Cleaning Up"
                sh '''
                docker image prune -af && docker stop \$(docker ps -a -q)
                set +x
                /usr/local/bin/aws configure --profile ${PROFILE} set aws_access_key_id ''
                /usr/local/bin/aws configure --profile ${PROFILE} set aws_secret_access_key ''
                set -x
                '''
            }
        }
    }
}

def helmInstall (WEB_ECR_URI, API_ECR_URI) {
    echo "Installing Toptal helm chart"
    script {
        sh """
            helm upgrade --install helm-toptal $WORKSPACE/helm/toptal  \
                --set infraweb.image=${WEB_ECR_URI} \
                --set infraapi.image=${API_ECR_URI}
        """
        sh "sleep 10"
    }
}

def curlRun (url, out) {
    echo "Running curl on ${url}"
    script {
        if (out.equals('')) {
            out = 'http_code'
        }
        echo "Getting ${out}"
            def result = sh (
                returnStdout: true,
                script: "curl --output /dev/null --silent --connect-timeout 5 --max-time 5 --retry 5 --retry-delay 5 --retry-max-time 30 --write-out \"%{${out}}\" ${url}"
        )
        if (result.equals('200')) {
            echo "Success code ${result}, Testing has been passed!!"
        } else {
            echo "ERROR: Local testing has been failed, take action!!"
            sh 'exit 1'
        }
    }
}

def curlTest (namespace, out) {
    echo "Running tests in ${namespace}"
    script {
        if (out.equals('')) {
            out = 'http_code'
        }
        def svc_endpoint = sh (
                returnStdout: true,
                script: "kubectl get svc -n ${namespace} | grep infraweb | awk '{print \$4}'"
        )
        if (svc_endpoint.equals('')) {
            echo "ERROR: Getting service endpoint failed, please check service"
            sh 'exit 1'
        }
        echo "svc_endpoint is ${svc_endpoint}"
        url = 'http://' + svc_endpoint
        curlRun (url, out)
        echo "Deployment has been tested successfully!!"
    }
}

def cleanUp() {
	echo "Cleaning up"
	sh """#!/bin/bash
		rm -rf *
		rm -rf .*
		ls -a
	"""
	echo "End of cleanup"
}
