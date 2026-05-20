const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const config = require("./index");

const clientOptions = { region: config.awsRegion };

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  clientOptions.credentials = {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  };
}

const client = new DynamoDBClient(clientOptions);

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

async function connectDatabase() {
  if (config.dynamodbSkipVerify) {
    console.log("DynamoDB startup verify skipped (DYNAMODB_SKIP_VERIFY=true)");
    return;
  }

  if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when DYNAMODB_SKIP_VERIFY is not true"
    );
  }

  await client.send(new ListTablesCommand({ Limit: 1 }));
  console.log("DB connected");
}

module.exports = { client, docClient, connectDatabase };
