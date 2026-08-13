require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createAdminActivityReadTable() {
  const params = {
    TableName: "AdminActivityRead",
    KeySchema: [
      { AttributeName: "accountId", KeyType: "HASH" },
      { AttributeName: "activityId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "activityId", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("AdminActivityRead table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("AdminActivityRead table already exists");
    } else {
      console.error("Error creating AdminActivityRead table:", err.message);
      process.exitCode = 1;
    }
  }
}

createAdminActivityReadTable();
