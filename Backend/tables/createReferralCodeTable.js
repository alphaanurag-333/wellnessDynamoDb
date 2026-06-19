require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createReferralCodeTable() {
  const params = {
    TableName: "ReferralCode",
    KeySchema: [{ AttributeName: "referralCode", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "referralCode", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("ReferralCode table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("ReferralCode table already exists");
    } else {
      console.error("Error creating ReferralCode table:", err.message);
      process.exitCode = 1;
    }
  }
}

createReferralCodeTable();
