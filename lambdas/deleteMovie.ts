import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie ID" }),
      };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Movie deleted" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Failed to delete movie" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  return DynamoDBDocumentClient.from(ddbClient, { marshallOptions, unmarshallOptions });
}