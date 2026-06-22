/**
 * Canonical DynamoDB table definitions (must match Backend/tables/create*.js).
 * Used by rebuildAllTables.js to recreate tables with the latest GSIs only.
 */

const PAY_PER_REQUEST = { BillingMode: "PAY_PER_REQUEST" };

function statusCreatedAtIndex(indexName = "StatusCreatedAtIndex") {
  return {
    IndexName: indexName,
    KeySchema: [
      { AttributeName: "status", KeyType: "HASH" },
      { AttributeName: "createdAt", KeyType: "RANGE" },
    ],
    Projection: { ProjectionType: "ALL" },
  };
}

const TABLE_DEFINITIONS = [
  {
    TableName: "Admin",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "EmailIndex",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "AppConfig",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    ...PAY_PER_REQUEST,
  },
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
      statusCreatedAtIndex(),
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Banner",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "CelebrationBanners",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "type", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TypeCreatedAtIndex",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      statusCreatedAtIndex(),
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "ClientTestimonials",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "ConsultancyTransaction",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "paymentStatus", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "parentCoachId", AttributeType: "S" },
      { AttributeName: "meetingAssigneeId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "PaymentStatusCreatedAtIndex",
        KeySchema: [
          { AttributeName: "paymentStatus", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "ParentCoachIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "parentCoachId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "MeetingAssigneeIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "meetingAssigneeId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Coupon",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "couponCode", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      statusCreatedAtIndex("StatusIndex"),
      {
        IndexName: "CouponCodeIndex",
        KeySchema: [{ AttributeName: "couponCode", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Faq",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex("StatusIndex")],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "HealthConcern",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "HealthDisorder",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "HealthRecipe",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "healthConcernId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      statusCreatedAtIndex(),
      {
        IndexName: "HealthConcernCreatedAtIndex",
        KeySchema: [
          { AttributeName: "healthConcernId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "HealthTool",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Notification",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "sentAt", AttributeType: "S" },
      { AttributeName: "audienceType", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusSentAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "sentAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "AudienceSentAtIndex",
        KeySchema: [
          { AttributeName: "audienceType", KeyType: "HASH" },
          { AttributeName: "sentAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "ReferralCode",
    KeySchema: [{ AttributeName: "referralCode", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "referralCode", AttributeType: "S" }],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "RegistrationOtp",
    KeySchema: [{ AttributeName: "lookupKey", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "lookupKey", AttributeType: "S" }],
    TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Specialization",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "titleKey", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TitleKeyIndex",
        KeySchema: [{ AttributeName: "titleKey", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
      statusCreatedAtIndex(),
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "StaticPage",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "slug", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "updatedAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "SlugIndex",
        KeySchema: [{ AttributeName: "slug", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "StatusUpdatedAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "updatedAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Transformation",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      statusCreatedAtIndex(),
      {
        IndexName: "UserIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "User",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "phoneKey", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "parentCoachId", AttributeType: "S" },
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
      statusCreatedAtIndex(),
      {
        IndexName: "ParentCoachIndex",
        KeySchema: [
          { AttributeName: "parentCoachId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "VideoTestimonials",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "WaterTracking",
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "recordKey", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "recordKey", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
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
      statusCreatedAtIndex(),
      {
        IndexName: "SpecializationIdIndex",
        KeySchema: [
          { AttributeName: "specializationId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Yoga",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [statusCreatedAtIndex()],
    ...PAY_PER_REQUEST,
  },
];

const TABLE_NAMES = TABLE_DEFINITIONS.map((t) => t.TableName);

function getTableDefinition(tableName) {
  return TABLE_DEFINITIONS.find((t) => t.TableName === tableName) || null;
}

function getGsiHashKeys(tableDefinition) {
  const keys = new Set();
  for (const gsi of tableDefinition?.GlobalSecondaryIndexes || []) {
    for (const key of gsi.KeySchema || []) {
      if (key.KeyType === "HASH") keys.add(key.AttributeName);
    }
  }
  return [...keys];
}

module.exports = {
  TABLE_DEFINITIONS,
  TABLE_NAMES,
  getTableDefinition,
  getGsiHashKeys,
};
