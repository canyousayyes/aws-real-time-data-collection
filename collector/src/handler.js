'use strict';

const AWS = require('aws-sdk');
const firehose = new AWS.Firehose({apiVersion: '2015-08-04'});

module.exports.main = async (event) => {
  const payload = JSON.parse(event.body).payload;

  if (process.env.NODE_ENV === 'dev') {
    console.info(payload);
  }

  const params = {
    DeliveryStreamName: process.env.FIREHOSE_NAME,
    Records: payload.map(p => ({
      Data: JSON.stringify(p)
    }))
  };

  const result = await firehose.putRecordBatch(params).promise();
  if (result.FailedPutCount > 0) {
    throw new Error(`Failed to put ${result.FailedPutCount} records`);
  }

  if (process.env.NODE_ENV === 'dev') {
    console.info(`Done putting ${payload.length} records.`)
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: ''
  };
}
