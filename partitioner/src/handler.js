'use strict';

const AWS = require('aws-sdk');
const athena = new AWS.Athena({apiVersion: '2017-05-18'});

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

    // Add partition for new events
    const query = `
    ALTER TABLE ${table} ADD IF NOT EXISTS
      PARTITION (year = '${year}', month = '${month}', day = '${day}', hour = '${hour}')
      LOCATION 's3://${bucket}/${prefix}/${year}/${month}/${day}/${hour}'
    `;
    const outputLoaction = `s3://${bucket}/athena/add_partition`;
    const params = {
      QueryString: query,
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
  }));
}
