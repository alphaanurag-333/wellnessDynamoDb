require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");

async function createStaffAccountTable() {
  const params = getTableDefinition("StaffAccount");

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("StaffAccount table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("StaffAccount table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createStaffAccountTable();
