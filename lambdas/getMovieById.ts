import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    // 1. 验证路径参数
    const movieId = parseInt(event.pathParameters?.movieId || "");
    if (isNaN(movieId)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid movie ID format" }),
      };
    }

    // 2. 获取电影基本信息
    const movieResult = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { id: movieId },
      })
    );

    if (!movieResult.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }

    // 3. 准备响应数据
    const responseData: any = { ...movieResult.Item };

    // 4. 处理演员信息查询
    const includeCast = event.queryStringParameters?.cast === "true";
    if (includeCast) {
      const castResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.MOVIECAST_TABLE_NAME!,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: {
            ":movieId": movieId,
          },
        })
      );

      responseData.cast = castResult.Items || [];
    }

    // 5. 返回最终响应
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: responseData }),
    };
  } catch (error: any) {
    console.error(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({
    region: process.env.REGION || "eu-west-1",
  });
  
  const translateConfig = {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  };
  
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}