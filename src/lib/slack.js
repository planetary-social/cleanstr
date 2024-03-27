import { WebClient } from "@slack/web-api";

if (!process.env.SLACK_TOKEN) {
  throw new Error("SLACK_TOKEN environment variable is required");
}

if (!process.env.CHANNEL_ID) {
  throw new Error("CHANNEL_ID environment variable is required");
}

const token = process.env.SLACK_TOKEN;
const channelId = process.env.CHANNEL_ID;
const web = new WebClient(token);
export default class Slack {
  static async postManualVerification(reportRequest) {
    try {
      const result = await web.chat.postMessage({
        channel: channelId,
        text: `Pubkey ${
          reportRequest.reporterPubkey
        } reported an event:\n\`\`\`\n${
          reportRequest.reporterText
        }\`\`\`\nEvent to evaluate:\n\`\`\`\n${JSON.stringify(
          reportRequest.reportedEvent,
          null,
          2
        )}\n\`\`\``,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Choose an option:",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Button 1",
                },
                value: "value-1",
                action_id: "action1",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Button 2",
                },
                value: "value-2",
                action_id: "action2",
              },
            ],
          },
        ],
      });

      console.log(
        `Sent event ${reportRequest.reportedEvent.id} to Slack for manual evaluation.`
      );
    } catch (error) {
      console.error(error);
    }
  }
}
