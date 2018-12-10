'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const copyObject = async (bucket, key, source) => {
  const params = {
    Bucket: bucket,
    Key: key,
    CopySource: source
  };

  if (process.env.NODE_ENV === 'dev') {
    console.info(`Calling s3.copyObject with: ${JSON.stringify(params)}`);
  }

  return s3.copyObject(params).promise();
}

module.exports.main = async (event) => {
  const bucket = process.env.BUCKET_NAME;
  const targetPrefix = process.env.TARGET_PREFIX;

  const results = await Promise.all(event.Records.map(async record => {
    const source = record.s3.object.key;

    if (process.env.NODE_ENV === 'dev') {
      console.info(`Processing source object ${source} ...`);
    }

    const [
      prefix,
      year,
      month,
      day,
      hour,
      filename
    ] = record.s3.object.key.split('/');

    // Upload to S3
    const targetPath = `${targetDir}/${filename}`;
    const copySource = `/${bucket}/${source}`;
    return copyObject(bucket, targetPath, copySource);
  }));

  return results;
}
