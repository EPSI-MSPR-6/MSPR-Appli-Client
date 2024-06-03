const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config();

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    private_key: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCLOUD_CLIENT_EMAIL
  }
});

async function publishMessage(topicName, data) {
    const dataBuffer = Buffer.from(JSON.stringify(data));

    try {
        const messageId = await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
        console.log(`Message ${messageId} published to topic ${topicName}`);
    } catch (error) {
        console.error(`Error publishing message to topic ${topicName}:`, error);
    }
}

module.exports = {
    publishMessage
};
