'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports.main = async (event) => {
  const results = await Promise.all(event.Records.map(record => {
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

    const target = `${process.env.TARGET_PREFIX}/partition_date=${year}-${month}-${day}/partition_hour=${hour}/${filename}`;
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: target,
      CopySource: `/${process.env.BUCKET_NAME}/${source}`
    }

    if (process.env.NODE_ENV === 'dev') {
      console.info(params);
    }

    return s3.copyObject(params).promise();
  }));

  return results;
}
