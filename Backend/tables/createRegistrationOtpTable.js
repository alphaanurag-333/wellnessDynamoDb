require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createRegistrationOtpTable() {
  const params = {
    TableName: "RegistrationOtp",
    KeySchema: [{ AttributeName: "lookupKey", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "lookupKey", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
    TimeToLiveSpecification: {
      AttributeName: "ttl",
      Enabled: true,
    },
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("RegistrationOtp table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("RegistrationOtp table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createRegistrationOtpTable();
