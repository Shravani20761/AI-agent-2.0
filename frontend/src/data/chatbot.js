import { Client, Functions } from "appwrite";
import { appwriteProjectId } from "./config";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(appwriteProjectId);

const functions = new Functions(client);

export async function askBot(userMessage, messages = []) {
  const payload = {
    message: userMessage,
    history: messages,
  };

  const execution = await functions.createExecution(
    "68aafcd400374a707256",
    JSON.stringify(payload)
  );

  const result = JSON.parse(execution.responseBody);

  return {
    role: "model",
    text: result.reply,
    timestamp: new Date(),
  };
}
