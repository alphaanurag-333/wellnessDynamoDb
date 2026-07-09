require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createProgramTestimonialsTable() {
  const params = {
    TableName: "ProgramTestimonials",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "type", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusCreatedAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "TypeCreatedAtIndex",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("ProgramTestimonials table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("ProgramTestimonials table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createProgramTestimonialsTable();
