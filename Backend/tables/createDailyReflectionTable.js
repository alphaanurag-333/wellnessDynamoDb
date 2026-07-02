require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createDailyReflectionTable() {
  const params = {
    TableName: "DailyReflection",
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "recordKey", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "recordKey", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("DailyReflection table created:", result.TableDescription?.TableStatus);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("DailyReflection table already exists");
      return;
    }
    throw err;
  }
}

createDailyReflectionTable().catch((err) => {
  console.error(err);
  process.exit(1);
});
