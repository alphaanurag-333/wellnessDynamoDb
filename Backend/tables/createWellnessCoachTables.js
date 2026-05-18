require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createTable(params, label) {
  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log(`${label} table created:`, result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log(`${label} table already exists`);
    } else {
      console.error(`Error creating ${label} table:`, err.message);
      throw err;
    }
  }
}

async function createWellnessCoachTables() {
  await createTable(
    {
      TableName: "WellnessCoach",
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
        { AttributeName: "phoneKey", AttributeType: "S" },
        { AttributeName: "specializationId", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "EmailIndex",
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "PhoneKeyIndex",
          KeySchema: [{ AttributeName: "phoneKey", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "StatusCreatedAtIndex",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "SpecializationIdIndex",
          KeySchema: [
            { AttributeName: "specializationId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },
    "WellnessCoach"
  );

  await createTable(
    {
      TableName: "AssistantWellnessCoach",
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "wellnessCoachId", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
        { AttributeName: "phoneKey", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "WellnessCoachIndex",
          KeySchema: [
            { AttributeName: "wellnessCoachId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "EmailIndex",
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "PhoneKeyIndex",
          KeySchema: [{ AttributeName: "phoneKey", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "StatusCreatedAtIndex",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },
    "AssistantWellnessCoach"
  );
}

createWellnessCoachTables().catch(() => {
  process.exitCode = 1;
});
