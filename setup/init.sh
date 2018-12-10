#!/bin/bash
set -e
trap 'echo "ERROR: $BASH_SOURCE:$LINENO $BASH_COMMAND" >&2' ERR
cd $(dirname $(realpath $0))

if [[ $# -lt 2 ]];
then
  echo "Usage: $0 <bucket-name> <stack-name> [region-name]"
  exit 1
fi

BUCKET_NAME=$1
STACK_NAME=$2
AWS_REGION=${3:-"us-west-2"}
FIREHOSE_NAME="sample_data_firehose"


echo "Checking if S3 bucket $BUCKET_NAME exists ..."
if [[ `aws s3api list-buckets --query "Buckets[].Name" | grep "$BUCKET_NAME"` ]];
then
  echo "Bucket exists, skipping bucket creation"
else
  echo "Bucket not exist, creating bucket $BUCKET_NAME ..."
  aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --create-bucket-configuration LocationConstraint=$AWS_REGION \
    --region $AWS_REGION
fi


echo "Checking if CFN stack $STACK_NAME exists ..."
if [[ `aws cloudformation describe-stacks --stack-name $STACK_NAME 2>/dev/null` ]];
then
  echo "Stack exists, updating ..."
  aws cloudformation update-stack \
    --stack-name $STACK_NAME \
    --template-body file://`pwd`/cloudformation.yml \
    --parameters "ParameterKey=BucketName,ParameterValue=$BUCKET_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION
else
  echo "Stack not exist, creating ..."
  aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://`pwd`/cloudformation.yml \
    --parameters "ParameterKey=BucketName,ParameterValue=$BUCKET_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION
fi


echo "Waiting the stack to complete ..."
while :
do
  STACK_STATUS=`aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].StackStatus" | tr -d '"'`
  echo $STACK_STATUS

  if [[ $STACK_STATUS == *"ROLLBACK"* ]];
  then
    echo "Stack creation failed."
    echo "Please check the log on the AWS CloudFormation Console."
    exit 1
  fi

  if [[ $STACK_STATUS == *"COMPLETE"* ]];
  then
    echo "Stack is complete."
    break
  fi

  sleep 5
done


echo "Updating Firhose Format Conversion ..."
FIREHOSE_VERSION=`aws firehose describe-delivery-stream --delivery-stream-name $FIREHOSE_NAME --query "DeliveryStreamDescription.VersionId" | tr -d '""'`
FIREHOSE_DST_ID=`aws firehose describe-delivery-stream --delivery-stream-name $FIREHOSE_NAME --query "DeliveryStreamDescription.Destinations[0].DestinationId" | tr -d '""'`
aws firehose update-destination \
  --delivery-stream-name $FIREHOSE_NAME \
  --current-delivery-stream-version-id $FIREHOSE_VERSION \
  --destination-id $FIREHOSE_DST_ID \
  --extended-s3-destination-update file://`pwd`/update_destination.json

echo "Done."
