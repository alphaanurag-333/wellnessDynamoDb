const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

/**
 * Count rows for a single GSI partition (optionally with FilterExpression).
 */
async function countByIndexPartition({
  tableName,
  indexName,
  partitionKeyName,
  partitionKeyValue,
  filterExpression,
  exprNames = {},
  exprValues = {},
}) {
  const expressionNames = { "#pk": partitionKeyName, ...exprNames };
  const expressionValues = { ":pk": partitionKeyValue, ...exprValues };
  let total = 0;
  let lastKey;

  do {
    const params = {
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      Select: "COUNT",
      ExclusiveStartKey: lastKey,
    };
    if (filterExpression) {
      params.FilterExpression = filterExpression;
    }

    const { Count, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    total += Count || 0;
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return total;
}

async function countAcrossPartitions({ partitionValues, ...rest }) {
  if (!Array.isArray(partitionValues) || partitionValues.length === 0) return 0;
  const counts = await Promise.all(
    partitionValues.map((partitionKeyValue) => countByIndexPartition({ ...rest, partitionKeyValue }))
  );
  return counts.reduce((sum, value) => sum + value, 0);
}

module.exports = {
  countByIndexPartition,
  countAcrossPartitions,
};
