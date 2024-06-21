const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config();

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    private_key: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCLOUD_CLIENT_EMAIL
  }
});

// Fonction Publication Message PubSub
async function publishMessage(topicName, data) {
    const dataBuffer = Buffer.from(JSON.stringify(data));

    try {
        const messageId = await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
        console.log(`Message ${messageId} published to topic ${topicName}`);
    } catch (error) {
        console.error(`Error publishing message to topic ${topicName}:`, error);
    }
}

// Fonction Consultation Message PubSub ( Abonnement Pull )
async function subscribeMessage(subscriptionName, messageHandler) {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageListener = message => {
      messageHandler(message);
      message.ack();
  };

  subscription.on('message', messageListener);

  subscription.on('error', error => {
      console.error('Error with subscription:', error);
  });

  console.log(`Subscribed to ${subscriptionName}`);
}

module.exports = {
    publishMessage, 
    subscribeMessage
};