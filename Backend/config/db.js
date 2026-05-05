const {
    DynamoDBClient,
    ListTablesCommand,
    DescribeTableCommand,
    CreateTableCommand,
    waitUntilTableExists,
  } = require("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

  let dynamoClient;
let docClient;


function buildClientConfig() {
    const region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  
    const clientConfig = { region };
  
    if (process.env.DYNAMODB_ENDPOINT) {
      clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
    }
  
    return clientConfig;
  }

  async function connectDatabase() {
    dynamoClient = new DynamoDBClient(buildClientConfig());
    docClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  
    if (process.env.DYNAMODB_SKIP_VERIFY === "true") {
      console.log("DynamoDB clients ready (DYNAMODB_SKIP_VERIFY=true, skipped ListTables)");
    } else {
      await dynamoClient.send(new ListTablesCommand({ Limit: 1 }));
      console.log("DynamoDB connection verified");
    }
  }
  
  function getDynamoClient() {
    if (!dynamoClient) {
      throw new Error("DynamoDB client not initialized; call connectDatabase() first");
    }
    return dynamoClient;
  }
  
  function getDocClient() {
    if (!docClient) {
      throw new Error("DynamoDB document client not initialized; call connectDatabase() first");
    }
    return docClient;
  }
  
  
module.exports = connectDatabase;
module.exports.getDynamoClient = getDynamoClient;
module.exports.getDocClient = getDocClient;
