'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const athena = new AWS.Athena({apiVersion: '2017-05-18'});

const copyObject = async (bucket, key, source) => {
  const params = {
    Bucket: bucket,
    Key: key,
    CopySource: source
  };

  if (process.env.NODE_ENV === 'dev') {
    console.info(`Calling s3.copyObject with: ${JSON.stringify(params)}`);
  }

  const result = await s3.copyObject(params).promise();
  if (process.env.NODE_ENV === 'dev') {
    console.info(`s3.copyObject result: ${JSON.stringify(result)}`);
  }
  return result;
}

const isS3DirExist = async (bucket, prefix) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: 1
  };

  if (process.env.NODE_ENV === 'dev') {
    console.info(`Calling s3.listObjectsV2 with: ${JSON.stringify(params)}`);
  }
  const result = await s3.listObjectsV2(params).promise();
  if (process.env.NODE_ENV === 'dev') {
    console.info(`s3.listObjectsV2 result: ${JSON.stringify(result)}`);
  }
  return result.KeyCount > 0;
}

const repairTable = async (database, table, outputLoaction) => {
  const params = {
    QueryString: `MSCK REPAIR TABLE ${table}`,
    ResultConfiguration: {
      OutputLocation: outputLoaction
    },
    QueryExecutionContext: {
      Database: database
    }
  }

  if (process.env.NODE_ENV === 'dev') {
    console.info(`Calling athena.startQueryExecution with: ${JSON.stringify(params)}`);
  }
  const result = await athena.startQueryExecution(params).promise();
  if (process.env.NODE_ENV === 'dev') {
    console.info(`athena.startQueryExecution result: ${JSON.stringify(result)}`);
  }
  return result;
}

module.exports.main = async (event) => {
  const bucket = process.env.BUCKET_NAME;
  const targetPrefix = process.env.TARGET_PREFIX;
  const database = process.env.DATABASE;
  const table = process.env.TABLE;

  await Promise.all(event.Records.map(async record => {
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

    // Check if directory exists
    const targetDir = `${targetPrefix}/partition_date=${year}-${month}-${day}/partition_hour=${hour}`;
    const dirExist = await isS3DirExist(bucket, targetDir);

    // Upload to S3
    const targetPath = `${targetDir}/${filename}`;
    const copySource = `/${bucket}/${source}`;
    await copyObject(bucket, targetPath, copySource);

    // Repair partition if created new directory in S3
    if (!dirExist) {
      console.info(`Auto creating new paritions ...`);
      const outputLoaction = `s3://${bucket}/athena/repair_table`;
      await repairTable(database, table, outputLoaction);
    }

    if (process.env.NODE_ENV === 'dev') {
      console.info(`Done processing source object ${source}`);
    }
  }));
}
